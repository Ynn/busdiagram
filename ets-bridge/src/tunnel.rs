//! KNXnet/IP tunnelling server, as a state machine without sockets: datagrams in,
//! datagrams and page frames out. ETS connects to it like to a USB/IP interface of the
//! simulated installation.
//!
//! - Group telegrams from ETS (L_Data.req) are confirmed to ETS (L_Data.con) and passed to
//!   the page, which puts them on the simulated bus at its interface.
//! - Group telegrams from the page are sent to every tunnel as L_Data.ind, one at a time
//!   per tunnel (each waits for its TUNNELLING_ACK), and are dropped rather than sent late:
//!   a command older than [`MAX_AGE`] never reaches ETS.
//! - The interface answers ETS's property reads itself (device management), and lets a
//!   client set the addresses of its tunnels for a while (to check that an address is
//!   free).
//! - Frames to a device (individual destination: connection, device descriptor…) and
//!   individual address services go to the page too, whose devices answer them; their
//!   answers come back as L_Data.ind. A page that says so confirms each frame to a
//!   device itself (L_Data.con, negative when no device acknowledges it): ETS gets that
//!   confirmation, as from the bus, rather than one the interface makes up.
//! - A bus monitor connection gets every frame of the bus, from ETS and from the page,
//!   as L_Busmon.ind.

use std::collections::{BTreeMap, VecDeque};
use std::net::SocketAddr;
use std::time::{Duration, Instant};

use knx_rs_core::message::MessageCode;

use crate::cemi::{self, Properties};
use crate::knxip::{self as ip, ConnectionHeader, Hpai, Identity, KnxIpFrame, ServiceType};

/// Time to wait for a TUNNELLING_ACK before repeating, then before giving up.
pub const ACK_TIMEOUT: Duration = Duration::from_secs(1);
/// A connection without any request for this long is closed (KNXnet/IP: 120 s).
pub const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(120);
/// A telegram from the page that could not leave within this time is dropped.
pub const MAX_AGE: Duration = Duration::from_secs(2);
/// Tunnel queue: beyond this, telegrams from the page are dropped.
const QUEUE: usize = 64;
const MAX_CONNECTIONS: usize = 8;
/// Bus monitor layer of a tunnelling connection (03_08_04 §4.4.3).
const TUNNEL_BUSMONITOR: u8 = 0x80;
/// Time for the page to confirm a frame to a device, after which the interface confirms
/// it itself, positively, as one that does not know (an older page).
pub const CONFIRM_TIMEOUT: Duration = Duration::from_millis(500);

/// What a step produced: datagrams to send, frames for the page, and log lines.
#[derive(Debug, Default)]
pub struct Output {
    pub udp: Vec<(Vec<u8>, SocketAddr)>,
    pub page: Vec<Vec<u8>>,
    pub log: Vec<String>,
    /// Telegrams of the diagram transmitted to a tunnel (first transmission; ETS
    /// acknowledges the datagram, which says nothing of a device's action).
    pub to_ets: u64,
}

struct Pending {
    cemi: Vec<u8>,
    /// Telegrams of the bus expire; local answers do not.
    deadline: Option<Instant>,
    /// Session of the diagram that sent it: its telegrams are dropped when it closes.
    origin: Option<u64>,
}

struct Inflight {
    seq: u8,
    packet: Vec<u8>,
    deadline: Instant,
    repeated: bool,
}

struct Connection {
    /// Device management connection: property reads only, no telegrams.
    mgmt: bool,
    /// Bus monitor: receives every frame of the bus, sends none.
    monitor: bool,
    /// Frames to a device waiting for the page's confirmation (as the positive
    /// confirmation of the interface would give them), and until when.
    unconfirmed: VecDeque<(Vec<u8>, Instant)>,
    address: u16,
    control: SocketAddr,
    data: SocketAddr,
    recv_seq: u8,
    send_seq: u8,
    last_seen: Instant,
    queue: VecDeque<Pending>,
    inflight: Option<Inflight>,
}

pub struct Tunnels {
    id: Identity,
    props: Properties,
    conns: BTreeMap<u8, Connection>,
    next_channel: u8,
    /// The addresses of the tunnels as configured, taken back when every connection is
    /// closed (a client that set others for a while and did not set them back).
    configured: Vec<u16>,
    /// The page confirms the frames to a device.
    page_confirms: bool,
    /// The addresses a diagram gave the interface and its tunnels, taken when no
    /// connection is open.
    wanted: Option<(u16, Vec<u16>)>,
    /// The addresses of the interface and its tunnels the program started with.
    original: (u16, Vec<u16>),
    /// Start of the relative time stamps of the bus monitor, and its sequence number.
    started: Instant,
    monitor_seq: u8,
}

impl Tunnels {
    pub fn new(id: Identity) -> Self {
        let props = Properties {
            individual_address: id.individual_address,
            tunnel_addresses: id.tunnel_addresses.clone(),
            serial_number: id.serial_number,
            mac_address: id.mac_address,
            ip: id.endpoint.ip().octets(),
            friendly_name: id.friendly_name(),
        };
        let configured = id.tunnel_addresses.clone();
        let original = (id.individual_address, id.tunnel_addresses.clone());
        Self {
            id,
            props,
            conns: BTreeMap::new(),
            next_channel: 1,
            configured,
            page_confirms: false,
            wanted: None,
            original,
            started: Instant::now(),
            monitor_seq: 0,
        }
    }

    /// Does the linked page confirm the frames to a device (it says so when it opens)?
    pub fn set_page_confirms(&mut self, on: bool) {
        self.page_confirms = on;
    }

    /// Open tunnels (ETS connections that carry telegrams).
    pub fn tunnels(&self) -> usize {
        self.conns
            .values()
            .filter(|c| !c.mgmt && !c.monitor)
            .count()
    }

    /// Individual addresses of the open tunnels.
    pub fn tunnel_addresses(&self) -> Vec<u16> {
        self.conns
            .values()
            .filter(|c| !c.mgmt && !c.monitor)
            .map(|c| c.address)
            .collect()
    }

    /// The addresses of the tunnels written by a client: the open tunnels take theirs.
    fn tunnel_addresses_changed(&mut self, out: &mut Output) {
        let new = self.props.tunnel_addresses.clone();
        let old = std::mem::replace(&mut self.id.tunnel_addresses, new.clone());
        // Each open tunnel keeps its slot, found in the list before the write: a
        // permutation swaps the addresses of two tunnels and never gives them the same.
        for c in self.conns.values_mut().filter(|c| !c.mgmt && !c.monitor) {
            if let Some(&now) = old
                .iter()
                .position(|a| *a == c.address)
                .and_then(|slot| new.get(slot))
            {
                c.address = now;
            }
        }
        for (old, now) in old.iter().zip(&new).filter(|(a, b)| a != b) {
            out.log.push(format!(
                "adresse de tunnel {} remplacée par {}",
                ip::individual_text(*old),
                ip::individual_text(*now)
            ));
        }
    }

    /// Every connection closed: the addresses of the tunnels as configured (or as a
    /// diagram gave them meanwhile).
    fn restore_addresses(&mut self) {
        if !self.conns.is_empty() {
            return;
        }
        if let Some((ia, tunnels)) = self.wanted.take() {
            self.id.individual_address = ia;
            self.props.individual_address = ia;
            self.configured = tunnels;
        }
        if self.id.tunnel_addresses != self.configured {
            self.id.tunnel_addresses = self.configured.clone();
            self.props.tunnel_addresses = self.configured.clone();
        }
    }

    /// The addresses a diagram gives the interface and its tunnels (free in the line
    /// where ETS reaches it): the first one the interface's, the next ones its tunnels'
    /// (as many as it has). Taken at once with no connection open, else when the last
    /// one closes: an address never changes under ETS. An empty list: the addresses the
    /// program started with (the diagram has none to give).
    pub fn adopt_addresses(&mut self, list: &[u16], out: &mut Output) {
        let n = self.configured.len();
        let (ia, tunnels) = match list.split_first() {
            None => self.original.clone(),
            Some((_, [])) => return,
            Some((&ia, rest)) => {
                let mut tunnels: Vec<u16> = rest.iter().copied().take(n).collect();
                // Fewer than its tunnels: the others keep theirs, unless one is among them.
                for a in &self.configured {
                    if tunnels.len() >= n {
                        break;
                    }
                    if !tunnels.contains(a) && *a != ia {
                        tunnels.push(*a);
                    }
                }
                (ia, tunnels)
            }
        };
        // The same as those it will take; those it has: none others wait.
        if self
            .wanted
            .as_ref()
            .is_some_and(|(a, t)| *a == ia && *t == tunnels)
        {
            return;
        }
        if ia == self.id.individual_address && tunnels == self.configured {
            self.wanted = None;
            return;
        }
        out.log.push(format!(
            "adresses données par le schéma : interface {}, tunnels {}",
            ip::individual_text(ia),
            tunnels
                .iter()
                .map(|a| ip::individual_text(*a))
                .collect::<Vec<_>>()
                .join(", ")
        ));
        self.wanted = Some((ia, tunnels));
        self.restore_addresses();
    }

    /// L_Busmon.ind of a frame on the bus, to every bus monitor.
    fn monitor(&mut self, f: &[u8], now: Instant, out: &mut Output) {
        if !self.conns.values().any(|c| c.monitor) {
            return;
        }
        let Some(frame) = cemi::l_data(f) else {
            return;
        };
        let ms = now.saturating_duration_since(self.started).as_millis();
        let stamp = (ms & 0xFFFF) as u16;
        let Some(ind) = cemi::busmonitor(&frame, stamp, self.monitor_seq) else {
            return;
        };
        self.monitor_seq = self.monitor_seq.wrapping_add(1) & 0x07;
        for (&ch, c) in self.conns.iter_mut().filter(|(_, c)| c.monitor) {
            if c.queue.len() >= QUEUE {
                continue;
            }
            c.queue.push_back(Pending {
                cemi: ind.clone(),
                deadline: Some(now + MAX_AGE),
                origin: None,
            });
            Self::pump(c, ch, now, out);
        }
    }

    /// This server's endpoint as seen by `peer`: when it listens on every interface (ETS
    /// on another computer), the address of the interface that reaches the peer.
    fn own_hpai(&self, peer: SocketAddr) -> Hpai {
        let mut endpoint = self.id.endpoint;
        if endpoint.ip().is_unspecified()
            && let Some(ip) = crate::bridge::local_ip_towards(peer)
        {
            endpoint.set_ip(ip);
        }
        ip::hpai(endpoint)
    }

    /// A datagram from a client.
    pub fn on_datagram(&mut self, d: &[u8], from: SocketAddr, now: Instant, out: &mut Output) {
        let Ok(KnxIpFrame { service_type, body }) = KnxIpFrame::parse(d) else {
            return;
        };
        let body = body.as_slice();
        match service_type {
            ServiceType::SearchRequest | ServiceType::DescriptionRequest => {
                let Some(to) = ip::reply_to(body, from) else {
                    return;
                };
                let mut b = Vec::new();
                let reply = if service_type == ServiceType::SearchRequest {
                    b.extend_from_slice(&self.own_hpai(from).to_bytes());
                    ServiceType::SearchResponse
                } else {
                    ServiceType::DescriptionResponse
                };
                b.extend_from_slice(&self.id.description());
                out.udp.push((ip::frame(reply, b), to));
            }
            ServiceType::ConnectRequest => self.connect(body, from, now, out),
            ServiceType::ConnectionStateRequest | ServiceType::DisconnectRequest => {
                let (Some(&ch), Some(hpai)) = (body.first(), body.get(2..)) else {
                    return;
                };
                let Some(to) = ip::reply_to(hpai, from) else {
                    return;
                };
                let known = self.conns.contains_key(&ch);
                let status = if known {
                    ip::E_NO_ERROR
                } else {
                    ip::E_CONNECTION_ID
                };
                if service_type == ServiceType::ConnectionStateRequest {
                    if let Some(c) = self.conns.get_mut(&ch) {
                        c.last_seen = now;
                    }
                    out.udp.push((
                        ip::frame(ServiceType::ConnectionStateResponse, vec![ch, status]),
                        to,
                    ));
                } else {
                    if let Some(c) = self.conns.remove(&ch).filter(|c| !c.mgmt) {
                        out.log.push(if c.monitor {
                            format!("moniteur de bus déconnecté (canal {ch})")
                        } else {
                            format!(
                                "ETS s'est déconnecté (canal {ch}, {})",
                                ip::individual_text(c.address)
                            )
                        });
                    }
                    self.restore_addresses();
                    out.udp.push((
                        ip::frame(ServiceType::DisconnectResponse, vec![ch, status]),
                        to,
                    ));
                }
            }
            ServiceType::TunnelingRequest | ServiceType::DeviceConfigurationRequest => {
                self.request(service_type, body, from, now, out);
            }
            ServiceType::TunnelingAck | ServiceType::DeviceConfigurationAck => {
                let Some(ConnectionHeader {
                    channel_id: ch,
                    sequence_counter: seq,
                    ..
                }) = ConnectionHeader::parse(body)
                else {
                    return;
                };
                let Some(c) = self.conns.get_mut(&ch) else {
                    return;
                };
                if c.inflight.as_ref().is_some_and(|i| i.seq == seq) {
                    c.inflight = None;
                    c.send_seq = c.send_seq.wrapping_add(1);
                    c.last_seen = now;
                    Self::pump(c, ch, now, out);
                }
            }
            _ => {}
        }
    }

    fn connect(&mut self, body: &[u8], from: SocketAddr, now: Instant, out: &mut Output) {
        let (Some(ctrl), Some(data), Some(cri)) = (body.get(..8), body.get(8..16), body.get(16..))
        else {
            return;
        };
        let Some(control) = ip::reply_to(ctrl, from) else {
            return;
        };
        let refuse = |out: &mut Output, status: u8| {
            out.udp.push((
                ip::frame(ServiceType::ConnectResponse, vec![0, status]),
                control,
            ));
        };
        let Some(data) = ip::reply_to(data, from) else {
            return;
        };
        let (kind, layer) = (cri.get(1).copied(), cri.get(2).copied());
        let address = match kind {
            Some(ip::TUNNEL_CONNECTION) if layer == Some(ip::TUNNEL_LINKLAYER) => {
                let used: Vec<u16> = self
                    .conns
                    .values()
                    .filter(|c| !c.mgmt)
                    .map(|c| c.address)
                    .collect();
                match self.id.tunnel_addresses.iter().find(|a| !used.contains(a)) {
                    Some(a) => *a,
                    None => return refuse(out, ip::E_NO_MORE_CONNECTIONS),
                }
            }
            // A bus monitor has no tunnel address of its own.
            Some(ip::TUNNEL_CONNECTION) if layer == Some(TUNNEL_BUSMONITOR) => {
                self.id.individual_address
            }
            Some(ip::TUNNEL_CONNECTION) => return refuse(out, ip::E_TUNNELLING_LAYER),
            Some(ip::DEVICE_MGMT_CONNECTION) => self.id.individual_address,
            _ => return refuse(out, ip::E_CONNECTION_TYPE),
        };
        if self.conns.len() >= MAX_CONNECTIONS {
            return refuse(out, ip::E_NO_MORE_CONNECTIONS);
        }
        let mut ch = self.next_channel;
        while ch == 0 || self.conns.contains_key(&ch) {
            ch = ch.wrapping_add(1);
        }
        self.next_channel = ch.wrapping_add(1);
        let mgmt = kind == Some(ip::DEVICE_MGMT_CONNECTION);
        let monitor = kind == Some(ip::TUNNEL_CONNECTION) && layer == Some(TUNNEL_BUSMONITOR);
        self.conns.insert(
            ch,
            Connection {
                mgmt,
                monitor,
                unconfirmed: VecDeque::new(),
                address,
                control,
                data,
                recv_seq: 0,
                send_seq: 0,
                last_seen: now,
                queue: VecDeque::new(),
                inflight: None,
            },
        );
        let mut b = vec![ch, ip::E_NO_ERROR];
        b.extend_from_slice(&self.own_hpai(control).to_bytes());
        if mgmt {
            b.extend_from_slice(&[0x02, ip::DEVICE_MGMT_CONNECTION]);
        } else {
            b.extend_from_slice(&ip::tunnel_crd(address));
            out.log.push(if monitor {
                format!("moniteur de bus connecté (canal {ch})")
            } else {
                format!(
                    "ETS connecté (canal {ch}, adresse du tunnel {})",
                    ip::individual_text(address)
                )
            });
        }
        out.udp
            .push((ip::frame(ServiceType::ConnectResponse, b), control));
    }

    fn request(
        &mut self,
        service: ServiceType,
        body: &[u8],
        from: SocketAddr,
        now: Instant,
        out: &mut Output,
    ) {
        // Structure length 4, then the channel and sequence counter; the cEMI follows.
        let (
            Some(&ConnectionHeader::LEN),
            Some(ConnectionHeader {
                channel_id: ch,
                sequence_counter: seq,
                ..
            }),
            Some(frame),
        ) = (body.first(), ConnectionHeader::parse(body), body.get(4..))
        else {
            return;
        };
        let Some(c) = self.conns.get_mut(&ch) else {
            return;
        };
        let mgmt_service = service == ServiceType::DeviceConfigurationRequest;
        if c.data.ip() != from.ip() || c.mgmt != mgmt_service {
            return;
        }
        let ack = |seq: u8| {
            let header = ConnectionHeader {
                channel_id: ch,
                sequence_counter: seq,
                status: ip::E_NO_ERROR,
            };
            let service = if mgmt_service {
                ServiceType::DeviceConfigurationAck
            } else {
                ServiceType::TunnelingAck
            };
            ip::frame(service, header.to_bytes().to_vec())
        };
        let to = c.data;
        if seq == c.recv_seq.wrapping_sub(1) {
            // Repetition of a request already handled: acknowledged again, not handled twice.
            out.udp.push((ack(seq), to));
            return;
        }
        if seq != c.recv_seq {
            return;
        }
        c.recv_seq = c.recv_seq.wrapping_add(1);
        c.last_seen = now;
        out.udp.push((ack(seq), to));
        let address = c.address;
        let before = self.props.tunnel_addresses.clone();
        if let Some(answer) = self.props.answer(frame) {
            if let Some(c) = self.conns.get_mut(&ch) {
                c.queue.push_back(Pending {
                    cemi: answer,
                    deadline: None,
                    origin: None,
                });
                Self::pump(c, ch, now, out);
            }
            if self.props.tunnel_addresses != before {
                self.tunnel_addresses_changed(out);
            }
            return;
        }
        let Some(c) = self.conns.get_mut(&ch) else {
            return;
        };
        // A bus monitor only listens.
        if c.mgmt || c.monitor || frame.first() != Some(&(MessageCode::LDataReq as u8)) {
            return;
        }
        let Some(mut f) = cemi::l_data(frame) else {
            out.log
                .push(format!("trame d'ETS invalide ignorée : {}", hex(frame)));
            return;
        };
        cemi::fill_source(&mut f, address);
        // The interface sent it on the bus. A group telegram: positive confirmation. A
        // frame to a device: the page that said it confirms confirms it, as the
        // acknowledgement of the bus says; positive at once with a page that does not.
        if let Some(con) = cemi::recode(&f, MessageCode::LDataCon) {
            let con = cemi::bytes(&con);
            if self.page_confirms && !cemi::is_group(&f) {
                c.unconfirmed.push_back((con, now + CONFIRM_TIMEOUT));
            } else {
                c.queue.push_back(Pending {
                    cemi: con,
                    deadline: None,
                    origin: None,
                });
                Self::pump(c, ch, now, out);
            }
        }
        let Some(ind) = cemi::recode(&f, MessageCode::LDataInd) else {
            return;
        };
        let ind = &cemi::bytes(&ind);
        // The page's devices answer: group telegrams on the simulated bus, device
        // management (a frame to a device) at once.
        out.page.push(ind.to_vec());
        self.monitor(ind, now, out);
        // Another ETS connected at the same time sees a group telegram, as on a real bus.
        if cemi::is_group(&f) {
            self.send_to_tunnels(ind, Some(ch), None, now, now, out);
        }
    }

    /// The page's confirmation of a frame to a device: to the tunnel that sent it (its
    /// source), in place of the one the interface would give.
    fn on_page_confirmation(
        &mut self,
        con: &knx_rs_core::cemi::CemiFrame,
        now: Instant,
        out: &mut Output,
    ) {
        // Found by the frame itself (its source included), not by the tunnel's address
        // now: a client may have set it back since (a check that an address is free).
        let theirs = cemi::bytes(con);
        let Some((&ch, c, i)) = self
            .conns
            .iter_mut()
            .filter(|(_, c)| !c.mgmt && !c.monitor)
            .find_map(|(ch, c)| {
                let i = c
                    .unconfirmed
                    .iter()
                    .position(|(ours, _)| cemi::same_frame(ours, &theirs))?;
                Some((ch, c, i))
            })
        else {
            out.log.push(format!(
                "confirmation du schéma sans trame en attente ignorée : {}",
                hex(&theirs)
            ));
            return;
        };
        c.unconfirmed.remove(i);
        let mut f = con.clone();
        if !cemi::negative(con) {
            f.set_confirm(knx_rs_core::types::Confirm::NoError);
        }
        c.queue.push_back(Pending {
            cemi: cemi::bytes(&f),
            deadline: None,
            origin: None,
        });
        Self::pump(c, ch, now, out);
        if cemi::negative(con) {
            out.log.push(format!(
                "aucun participant n'acquitte la trame pour {}",
                ip::individual_text(con.destination_address_raw())
            ));
        }
    }

    /// A group telegram from the page, on the bus at the interface: to every tunnel.
    /// `received`: when the diagram's message arrived, which its age counts from;
    /// `session`: the diagram's connection, whose telegrams [`Self::forget`] drops.
    pub fn on_page_frame(
        &mut self,
        frame: &[u8],
        received: Instant,
        session: u64,
        now: Instant,
        out: &mut Output,
    ) {
        let Some(f) = cemi::l_data(frame) else {
            out.log.push(format!(
                "trame de la page invalide ignorée : {}",
                hex(frame)
            ));
            return;
        };
        if f.message_code_raw() == MessageCode::LDataCon as u8 {
            return self.on_page_confirmation(&f, now, out);
        }
        let Some(ind) = cemi::recode(&f, MessageCode::LDataInd) else {
            return;
        };
        let ind = cemi::bytes(&ind);
        self.monitor(&ind, now, out);
        self.send_to_tunnels(&ind, None, Some(session), received, now, out);
    }

    /// The diagram of `session` is gone: its telegrams still waiting do not leave.
    pub fn forget(&mut self, session: u64, out: &mut Output) {
        let mut dropped = 0;
        for c in self.conns.values_mut() {
            let before = c.queue.len();
            c.queue.retain(|p| p.origin != Some(session));
            dropped += before - c.queue.len();
        }
        if dropped > 0 {
            out.log.push(format!(
                "{dropped} télégramme(s) du schéma déconnecté abandonné(s)"
            ));
        }
    }

    fn send_to_tunnels(
        &mut self,
        ind: &[u8],
        except: Option<u8>,
        origin: Option<u64>,
        received: Instant,
        now: Instant,
        out: &mut Output,
    ) {
        for (&ch, c) in self
            .conns
            .iter_mut()
            .filter(|(ch, c)| !c.mgmt && !c.monitor && Some(**ch) != except)
        {
            if c.queue.len() >= QUEUE {
                out.log
                    .push(format!("file du tunnel {ch} pleine : télégramme abandonné"));
                continue;
            }
            c.queue.push_back(Pending {
                cemi: ind.to_vec(),
                deadline: Some(received + MAX_AGE),
                origin,
            });
            Self::pump(c, ch, now, out);
        }
    }

    /// Send the next queued frame if none is waiting for its acknowledgement. A telegram
    /// that waited too long is dropped here, right before it would leave.
    fn pump(c: &mut Connection, ch: u8, now: Instant, out: &mut Output) {
        if c.inflight.is_some() {
            return;
        }
        while let Some(p) = c.queue.pop_front() {
            if p.deadline.is_some_and(|d| now > d) {
                out.log.push(format!(
                    "télégramme trop ancien pour le tunnel {ch} : abandonné"
                ));
                continue;
            }
            // A device configuration request has the body of a tunnelling request.
            let mut request = KnxIpFrame::tunneling_request(ch, c.send_seq, &p.cemi);
            if c.mgmt {
                request.service_type = ServiceType::DeviceConfigurationRequest;
            }
            let packet = request.to_bytes();
            out.udp.push((packet.clone(), c.data));
            if p.origin.is_some() {
                out.to_ets += 1;
            }
            c.inflight = Some(Inflight {
                seq: c.send_seq,
                packet,
                deadline: now + ACK_TIMEOUT,
                repeated: false,
            });
            return;
        }
    }

    /// Repetitions, abandoned connections, heartbeats, confirmations the page did not give.
    pub fn tick(&mut self, now: Instant, out: &mut Output) {
        let mut close = Vec::new();
        for (&ch, c) in &mut self.conns {
            // The page said it confirms, and has not: the bridge does not know whether a
            // device acknowledged the frame, and says neither yes nor no. The connection
            // closes, which ETS reports as an error of its operation.
            if c.unconfirmed.iter().any(|(_, d)| now >= *d) {
                close.push((
                    ch,
                    "le schéma n'a pas confirmé une trame vers un participant",
                ));
                continue;
            }
            if now.saturating_duration_since(c.last_seen) > HEARTBEAT_TIMEOUT {
                close.push((ch, "plus de nouvelles d'ETS"));
                continue;
            }
            let Some(i) = c.inflight.as_mut() else {
                continue;
            };
            if now < i.deadline {
                continue;
            }
            if i.repeated {
                close.push((ch, "pas d'acquittement d'ETS"));
            } else {
                i.repeated = true;
                i.deadline = now + ACK_TIMEOUT;
                out.udp.push((i.packet.clone(), c.data));
            }
        }
        for (ch, why) in close {
            if let Some(c) = self.conns.remove(&ch) {
                let own = self.own_hpai(c.control);
                out.udp.push((
                    KnxIpFrame::disconnect_request(ch, own).to_bytes(),
                    c.control,
                ));
                out.log.push(format!("connexion ETS {ch} fermée : {why}"));
            }
        }
        self.restore_addresses();
    }
}

pub fn hex(b: &[u8]) -> String {
    b.iter()
        .map(|x| format!("{x:02X}"))
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use std::net::SocketAddrV4;

    use crate::knxip::{TUNNEL_CONNECTION, TUNNEL_LINKLAYER};

    /// Service type and body of a datagram.
    fn parse(d: &[u8]) -> (ServiceType, Vec<u8>) {
        let f = KnxIpFrame::parse(d).unwrap();
        (f.service_type, f.body)
    }

    const ETS: &str = "127.0.0.1:50000";
    const WRITE: [u8; 11] = [
        0x11, 0x00, 0xBC, 0xE0, 0x00, 0x00, 0x09, 0x01, 0x01, 0x00, 0x81,
    ];
    const STATUS: [u8; 11] = [
        0x29, 0x00, 0xBC, 0xE0, 0x12, 0x01, 0x0C, 0x01, 0x01, 0x00, 0x81,
    ];

    fn server() -> Tunnels {
        Tunnels::new(Identity {
            individual_address: 0xFFFA,
            tunnel_addresses: vec![0xFFFB],
            serial_number: [0; 6],
            mac_address: [0; 6],
            endpoint: "127.0.0.1:3672".parse::<SocketAddrV4>().unwrap(),
            name: "BusDiagram".into(),
        })
    }

    fn from() -> SocketAddr {
        ETS.parse().unwrap()
    }

    /// CONNECT_REQUEST for a link layer tunnel, with NAT endpoints; returns the channel.
    fn connect(t: &mut Tunnels, now: Instant) -> u8 {
        let mut b = vec![8, 1, 0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0];
        b.extend_from_slice(&[4, TUNNEL_CONNECTION, TUNNEL_LINKLAYER, 0]);
        let mut out = Output::default();
        t.on_datagram(
            &ip::frame(ServiceType::ConnectRequest, b),
            from(),
            now,
            &mut out,
        );
        let (s, body) = parse(&out.udp[0].0);
        assert_eq!(s, ServiceType::ConnectResponse);
        assert_eq!(body[1], ip::E_NO_ERROR);
        assert_eq!(&body[10..], &[4, 4, 0xFF, 0xFB]);
        body[0]
    }

    fn tunnelling(ch: u8, seq: u8, cemi: &[u8]) -> Vec<u8> {
        KnxIpFrame::tunneling_request(ch, seq, cemi).to_bytes()
    }

    fn ack(ch: u8, seq: u8) -> Vec<u8> {
        KnxIpFrame::tunneling_ack(ch, seq, 0).to_bytes()
    }

    #[test]
    fn a_write_from_ets_is_acknowledged_confirmed_and_passed_to_the_page() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        assert_eq!(t.tunnels(), 1);
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 0, &WRITE), from(), now, &mut out);
        // ACK, then L_Data.con with the tunnel address as source.
        assert_eq!(
            parse(&out.udp[0].0),
            (ServiceType::TunnelingAck, vec![4, ch, 0, 0])
        );
        let (_, con) = parse(&out.udp[1].0);
        assert_eq!(con[4], MessageCode::LDataCon as u8);
        assert_eq!(&con[8..10], &[0xFF, 0xFB]);
        // The page gets an L_Data.ind from 15.15.251.
        assert_eq!(out.page.len(), 1);
        assert_eq!(out.page[0][0], MessageCode::LDataInd as u8);
        assert_eq!(&out.page[0][4..6], &[0xFF, 0xFB]);
        // A repetition is acknowledged again but not passed twice.
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 0, &WRITE), from(), now, &mut out);
        assert_eq!(out.udp.len(), 1);
        assert!(out.page.is_empty());
    }

    #[test]
    fn device_management_goes_to_the_page_and_its_answers_to_ets() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        // T_Connect to 1.1.1: individual destination, no APCI (length 0).
        const CONNECT: [u8; 10] = [0x11, 0x00, 0xB0, 0x60, 0x00, 0x00, 0x11, 0x01, 0x00, 0x80];
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 0, &CONNECT), from(), now, &mut out);
        assert_eq!(out.page.len(), 1);
        assert_eq!(out.page[0][0], MessageCode::LDataInd as u8);
        assert_eq!(&out.page[0][4..8], &[0xFF, 0xFB, 0x11, 0x01]);
        assert_eq!(out.page[0][9], 0x80);
        // The device's T_ACK, to the tunnel address, reaches ETS.
        const T_ACK: [u8; 10] = [0x29, 0x00, 0xB0, 0x60, 0x11, 0x01, 0xFF, 0xFB, 0x00, 0xC2];
        let mut out = Output::default();
        t.on_page_frame(&T_ACK, now, 1, now, &mut out);
        // It waits for ETS to acknowledge the L_Data.con of the T_Connect.
        assert!(out.udp.is_empty());
        t.on_datagram(&ack(ch, 0), from(), now, &mut out);
        assert_eq!(out.udp.len(), 1);
        let (s, body) = parse(&out.udp[0].0);
        assert_eq!(s, ServiceType::TunnelingRequest);
        assert_eq!(&body[4..], &T_ACK);
        // The next request, a numbered A_DeviceDescriptor_Read, goes to the page too.
        const DESC: [u8; 11] = [
            0x11, 0x00, 0xB0, 0x60, 0x00, 0x00, 0x11, 0x01, 0x01, 0x43, 0x00,
        ];
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 1, &DESC), from(), now, &mut out);
        assert_eq!(out.log, Vec::<String>::new());
        assert_eq!(out.page.len(), 1);
    }

    #[test]
    fn telegrams_of_the_page_go_one_at_a_time_and_expire() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        let mut out = Output::default();
        t.on_page_frame(&STATUS, now, 1, now, &mut out);
        t.on_page_frame(&STATUS, now, 1, now, &mut out);
        t.on_page_frame(&STATUS, now, 1, now, &mut out);
        // Only the first leaves before its ACK.
        assert_eq!(out.udp.len(), 1);
        // ETS acknowledges late: the waiting ones are now too old.
        let mut out = Output::default();
        t.on_datagram(
            &ack(ch, 0),
            from(),
            now + MAX_AGE + Duration::from_millis(1),
            &mut out,
        );
        assert!(out.udp.is_empty());
        assert_eq!(out.log.len(), 2);
    }

    #[test]
    fn an_unacknowledged_frame_is_repeated_once_then_the_connection_closed() {
        let now = Instant::now();
        let mut t = server();
        connect(&mut t, now);
        let mut out = Output::default();
        t.on_page_frame(&STATUS, now, 1, now, &mut out);
        let mut out = Output::default();
        t.tick(now + ACK_TIMEOUT, &mut out);
        assert_eq!(out.udp.len(), 1);
        let mut out = Output::default();
        t.tick(now + ACK_TIMEOUT * 2, &mut out);
        assert_eq!(parse(&out.udp[0].0).0, ServiceType::DisconnectRequest);
        assert_eq!(t.tunnels(), 0);
    }

    #[test]
    fn property_reads_are_answered_by_the_interface() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        let mut out = Output::default();
        t.on_datagram(
            &tunnelling(ch, 0, &[0xFC, 0x00, 0x0B, 0x01, 52, 0x10, 0x01]),
            from(),
            now,
            &mut out,
        );
        let (_, body) = parse(&out.udp[1].0);
        assert_eq!(
            &body[4..],
            &[0xFB, 0x00, 0x0B, 0x01, 52, 0x10, 0x01, 0xFF, 0xFA]
        );
        assert!(out.page.is_empty());
    }

    #[test]
    fn connection_state_and_disconnection() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        let nat = Hpai::nat_udp(0);
        let state = KnxIpFrame::connection_state_request(ch, nat).to_bytes();
        let mut out = Output::default();
        t.on_datagram(&state, from(), now, &mut out);
        assert_eq!(parse(&out.udp[0].0).1, [ch, 0]);
        t.on_datagram(
            &KnxIpFrame::disconnect_request(ch, nat).to_bytes(),
            from(),
            now,
            &mut out,
        );
        assert_eq!(t.tunnels(), 0);
        let mut out = Output::default();
        t.on_datagram(&state, from(), now, &mut out);
        assert_eq!(parse(&out.udp[0].0).1, [ch, ip::E_CONNECTION_ID]);
    }

    #[test]
    fn telegrams_of_a_closed_diagram_do_not_leave() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        let mut out = Output::default();
        t.on_page_frame(&STATUS, now, 7, now, &mut out);
        t.on_page_frame(&STATUS, now, 7, now, &mut out);
        t.on_page_frame(&STATUS, now, 8, now, &mut out);
        assert_eq!(out.to_ets, 1);
        // The diagram of session 7 closes: its waiting telegram is dropped, not 8's.
        t.forget(7, &mut out);
        let mut out = Output::default();
        t.on_datagram(&ack(ch, 0), from(), now, &mut out);
        assert_eq!(out.udp.len(), 1);
        assert_eq!(out.to_ets, 1);
        let mut out = Output::default();
        t.on_datagram(&ack(ch, 1), from(), now, &mut out);
        assert!(out.udp.is_empty());
    }

    #[test]
    fn the_age_counts_from_the_arrival_of_the_message() {
        let now = Instant::now();
        let mut t = server();
        connect(&mut t, now);
        let mut out = Output::default();
        // Received long before it is handled: too old to leave.
        t.on_page_frame(
            &STATUS,
            now,
            1,
            now + MAX_AGE + Duration::from_millis(1),
            &mut out,
        );
        assert!(out.udp.is_empty());
    }

    /// CONNECT_REQUEST for a bus monitor; returns the channel.
    fn connect_monitor(t: &mut Tunnels, now: Instant) -> u8 {
        let mut b = vec![8, 1, 0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0];
        b.extend_from_slice(&[4, TUNNEL_CONNECTION, TUNNEL_BUSMONITOR, 0]);
        let mut out = Output::default();
        t.on_datagram(
            &ip::frame(ServiceType::ConnectRequest, b),
            from(),
            now,
            &mut out,
        );
        let (s, body) = parse(&out.udp[0].0);
        assert_eq!(s, ServiceType::ConnectResponse);
        assert_eq!(body[1], ip::E_NO_ERROR);
        body[0]
    }

    const CONNECT: [u8; 10] = [0x11, 0x00, 0xB0, 0x60, 0x00, 0x00, 0x11, 0x01, 0x00, 0x80];

    #[test]
    fn a_bus_monitor_sees_the_frames_of_the_bus() {
        let now = Instant::now();
        let mut t = server();
        let ets = connect(&mut t, now);
        let mon = connect_monitor(&mut t, now);
        // A bus monitor is not a tunnel.
        assert_eq!(t.tunnels(), 1);
        let mut out = Output::default();
        t.on_page_frame(&STATUS, now, 1, now, &mut out);
        // The group telegram, to the tunnel as L_Data.ind and to the monitor.
        let to_monitor: Vec<_> = out
            .udp
            .iter()
            .map(|(d, _)| parse(d).1)
            .filter(|b| b[1] == mon)
            .collect();
        assert_eq!(to_monitor.len(), 1);
        let ind = &to_monitor[0][4..];
        assert_eq!(ind[0], 0x2B);
        // Status and time stamp, then the TP1 frame: control, 1.2.1 to 1/4/1, its length.
        assert_eq!(&ind[1..5], &[7, 0x03, 1, 0]);
        let tp = &ind[9..];
        assert_eq!(&tp[..6], &[0xBC, 0x12, 0x01, 0x0C, 0x01, 0xE1]);
        assert_eq!(tp.iter().fold(0u8, |a, x| a ^ x), 0xFF);
        // ETS's frames are seen too; the monitor sends none.
        let mut out = Output::default();
        t.on_datagram(&ack(ets, 0), from(), now, &mut out);
        t.on_datagram(&ack(mon, 0), from(), now, &mut out);
        t.on_datagram(&tunnelling(ets, 0, &CONNECT), from(), now, &mut out);
        assert!(out.udp.iter().any(|(d, _)| parse(d).1.get(1) == Some(&mon)));
        let mut out = Output::default();
        t.on_datagram(&tunnelling(mon, 0, &WRITE), from(), now, &mut out);
        assert!(out.page.is_empty());
    }

    #[test]
    fn the_page_confirms_a_frame_to_a_device() {
        let now = Instant::now();
        let mut t = server();
        t.set_page_confirms(true);
        let ch = connect(&mut t, now);
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 0, &CONNECT), from(), now, &mut out);
        // Acknowledged, passed to the page, not confirmed yet.
        assert_eq!(out.udp.len(), 1);
        assert_eq!(out.page.len(), 1);
        // No device at 1.1.1: the page's negative confirmation reaches ETS.
        let mut con = out.page[0].clone();
        con[0] = MessageCode::LDataCon as u8;
        con[2] |= 0x01;
        let mut out = Output::default();
        t.on_page_frame(&con, now, 1, now, &mut out);
        let (s, body) = parse(&out.udp[0].0);
        assert_eq!(s, ServiceType::TunnelingRequest);
        assert_eq!(body[4], MessageCode::LDataCon as u8);
        assert_eq!(body[6] & 0x01, 0x01);
    }

    #[test]
    fn a_page_that_does_not_confirm_in_time_closes_the_connection() {
        let now = Instant::now();
        let mut t = server();
        t.set_page_confirms(true);
        let ch = connect(&mut t, now);
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 0, &CONNECT), from(), now, &mut out);
        let mut out = Output::default();
        t.tick(now + CONFIRM_TIMEOUT, &mut out);
        // No confirmation made up, positive or negative: the connection is closed.
        assert!(out.udp.iter().all(|(d, _)| {
            let (s, body) = parse(d);
            s != ServiceType::TunnelingRequest || body[4] != MessageCode::LDataCon as u8
        }));
        assert_eq!(parse(&out.udp[0].0).0, ServiceType::DisconnectRequest);
        assert_eq!(t.tunnels(), 0);
    }

    #[test]
    fn a_confirmation_reaches_a_tunnel_whose_address_was_set_back() {
        let now = Instant::now();
        let mut t = server();
        t.set_page_confirms(true);
        let ch = connect(&mut t, now);
        let write = |a: [u8; 2]| [0xF6, 0x00, 0x0B, 0x01, 53, 0x10, 0x01, a[0], a[1]];
        // As a check that 1.1.1 is free: the tunnel takes 1.1.1, connects, takes its own.
        let mut out = Output::default();
        t.on_datagram(
            &tunnelling(ch, 0, &write([0x11, 0x01])),
            from(),
            now,
            &mut out,
        );
        t.on_datagram(&ack(ch, 0), from(), now, &mut out);
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 1, &CONNECT), from(), now, &mut out);
        let sent = out.page[0].clone();
        assert_eq!(&sent[4..6], &[0x11, 0x01]);
        t.on_datagram(
            &tunnelling(ch, 2, &write([0xFF, 0xFB])),
            from(),
            now,
            &mut out,
        );
        t.on_datagram(&ack(ch, 1), from(), now, &mut out);
        // The page's confirmation, source 1.1.1, still reaches ETS.
        let mut con = sent;
        con[0] = MessageCode::LDataCon as u8;
        let mut out = Output::default();
        t.on_page_frame(&con, now, 1, now, &mut out);
        let (s, body) = parse(&out.udp[0].0);
        assert_eq!(s, ServiceType::TunnelingRequest);
        assert_eq!(body[4], MessageCode::LDataCon as u8);
        let mut out = Output::default();
        t.tick(now + CONFIRM_TIMEOUT, &mut out);
        assert_eq!(t.tunnels(), 1);
    }

    #[test]
    fn the_page_confirms_the_frame_it_names() {
        let now = Instant::now();
        let mut t = server();
        t.set_page_confirms(true);
        let ch = connect(&mut t, now);
        let mut second = CONNECT;
        second[7] = 0x02;
        let mut out = Output::default();
        t.on_datagram(&tunnelling(ch, 0, &CONNECT), from(), now, &mut out);
        t.on_datagram(&tunnelling(ch, 1, &second), from(), now, &mut out);
        assert_eq!(out.page.len(), 2);
        // The page confirms the frame to 1.1.2 first, negatively.
        let mut con = out.page[1].clone();
        con[0] = MessageCode::LDataCon as u8;
        con[2] |= 0x01;
        let mut out = Output::default();
        t.on_page_frame(&con, now, 1, now, &mut out);
        let (_, body) = parse(&out.udp[0].0);
        assert_eq!(&body[10..12], &[0x11, 0x02]);
        assert_eq!(body[6] & 0x01, 0x01);
        // A confirmation of no frame sent is ignored.
        let mut out = Output::default();
        t.on_page_frame(&con, now, 1, now, &mut out);
        assert!(out.udp.is_empty());
    }

    #[test]
    fn a_permutation_swaps_the_addresses_of_two_tunnels() {
        let now = Instant::now();
        let mut t = Tunnels::new(Identity {
            tunnel_addresses: vec![0xFFFB, 0xFFFC],
            ..server().id
        });
        let a = connect(&mut t, now);
        let mut b = vec![8, 1, 0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0];
        b.extend_from_slice(&[4, TUNNEL_CONNECTION, TUNNEL_LINKLAYER, 0]);
        let mut out = Output::default();
        t.on_datagram(
            &ip::frame(ServiceType::ConnectRequest, b),
            from(),
            now,
            &mut out,
        );
        assert_eq!(t.tunnel_addresses(), vec![0xFFFB, 0xFFFC]);
        // Elements 1 and 2: 15.15.252, 15.15.251.
        let mut out = Output::default();
        t.on_datagram(
            &tunnelling(
                a,
                0,
                &[
                    0xF6, 0x00, 0x0B, 0x01, 53, 0x20, 0x01, 0xFF, 0xFC, 0xFF, 0xFB,
                ],
            ),
            from(),
            now,
            &mut out,
        );
        assert_eq!(t.tunnel_addresses(), vec![0xFFFC, 0xFFFB]);
        // Element 2 the address of element 1: two tunnels would share it, refused.
        let mut out = Output::default();
        t.on_datagram(&ack(a, 0), from(), now, &mut out);
        t.on_datagram(
            &tunnelling(a, 1, &[0xF6, 0x00, 0x0B, 0x01, 53, 0x10, 0x02, 0xFF, 0xFC]),
            from(),
            now,
            &mut out,
        );
        assert_eq!(t.tunnel_addresses(), vec![0xFFFC, 0xFFFB]);
        let (_, con) = parse(&out.udp.last().unwrap().0);
        assert_eq!(con[4], 0xF5);
        assert_eq!(con[9] >> 4, 0);
    }

    #[test]
    fn a_diagram_gives_the_addresses_of_its_line_when_no_connection_is_open() {
        let now = Instant::now();
        let mut t = server();
        let mut out = Output::default();
        // 1.1.254 the interface, 1.1.253 its tunnel: taken at once.
        t.adopt_addresses(&[0x11FE, 0x11FD], &mut out);
        assert_eq!(t.tunnel_addresses(), Vec::<u16>::new());
        let mut b = vec![8, 1, 0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0];
        b.extend_from_slice(&[4, TUNNEL_CONNECTION, TUNNEL_LINKLAYER, 0]);
        let mut out = Output::default();
        t.on_datagram(
            &ip::frame(ServiceType::ConnectRequest, b),
            from(),
            now,
            &mut out,
        );
        let (_, body) = parse(&out.udp[0].0);
        assert_eq!(&body[10..], &[4, 4, 0x11, 0xFD]);
        let ch = body[0];
        // Others given while ETS is connected: taken once it has gone.
        let mut out = Output::default();
        t.adopt_addresses(&[0x11F0, 0x11EF], &mut out);
        assert_eq!(t.tunnel_addresses(), vec![0x11FD]);
        let nat = Hpai::nat_udp(0);
        t.on_datagram(
            &KnxIpFrame::disconnect_request(ch, nat).to_bytes(),
            from(),
            now,
            &mut out,
        );
        assert!(t.tunnels() == 0);
        let again = connect_at(&mut t, now);
        assert_eq!(again, 0x11EF);
    }

    #[test]
    fn a_diagram_with_no_addresses_to_give_takes_back_those_of_the_start() {
        let now = Instant::now();
        let original = connect_at(&mut server(), now);
        let mut t = server();
        let mut out = Output::default();
        t.adopt_addresses(&[0x11FE, 0x11FD], &mut out);
        assert_eq!(connect_at(&mut t, now), 0x11FD);
        // Given while ETS is connected, then given back before it has gone: nothing waits.
        t.adopt_addresses(&[0x12FE, 0x12FD], &mut out);
        t.adopt_addresses(&[0x11FE, 0x11FD], &mut out);
        assert!(t.wanted.is_none());
        let mut t = server();
        t.adopt_addresses(&[0x11FE, 0x11FD], &mut out);
        t.adopt_addresses(&[], &mut out);
        assert_eq!(connect_at(&mut t, now), original);
    }

    /// CONNECT_REQUEST for a link layer tunnel; returns the tunnel address it is given.
    fn connect_at(t: &mut Tunnels, now: Instant) -> u16 {
        let mut b = vec![8, 1, 0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0];
        b.extend_from_slice(&[4, TUNNEL_CONNECTION, TUNNEL_LINKLAYER, 0]);
        let mut out = Output::default();
        t.on_datagram(
            &ip::frame(ServiceType::ConnectRequest, b),
            from(),
            now,
            &mut out,
        );
        let (_, body) = parse(&out.udp[0].0);
        u16::from_be_bytes([body[12], body[13]])
    }

    #[test]
    fn a_client_sets_the_tunnel_addresses_for_a_while() {
        let now = Instant::now();
        let mut t = server();
        let ch = connect(&mut t, now);
        // M_PropWrite.req, KNXnet/IP parameter object, PID 53, element 1: 1.1.1.
        let mut out = Output::default();
        t.on_datagram(
            &tunnelling(ch, 0, &[0xF6, 0x00, 0x0B, 0x01, 53, 0x10, 0x01, 0x11, 0x01]),
            from(),
            now,
            &mut out,
        );
        let (_, body) = parse(&out.udp[1].0);
        assert_eq!(&body[4..], &[0xF5, 0x00, 0x0B, 0x01, 53, 0x10, 0x01]);
        assert_eq!(t.tunnel_addresses(), vec![0x1101]);
        // A write of 0.0.0 is refused.
        let mut out = Output::default();
        t.on_datagram(&ack(ch, 0), from(), now, &mut out);
        t.on_datagram(
            &tunnelling(ch, 1, &[0xF6, 0x00, 0x0B, 0x01, 53, 0x10, 0x01, 0x00, 0x00]),
            from(),
            now,
            &mut out,
        );
        assert_eq!(t.tunnel_addresses(), vec![0x1101]);
        // Once disconnected, the configured address is back.
        let nat = Hpai::nat_udp(0);
        t.on_datagram(
            &KnxIpFrame::disconnect_request(ch, nat).to_bytes(),
            from(),
            now,
            &mut out,
        );
        let again = connect(&mut t, now);
        assert!(again > 0);
        assert_eq!(t.tunnel_addresses(), vec![0xFFFB]);
    }
}
