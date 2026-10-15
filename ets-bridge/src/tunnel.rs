//! KNXnet/IP tunnelling server, as a state machine without sockets: datagrams in,
//! datagrams and page frames out. ETS connects to it like to a USB/IP interface of the
//! simulated installation.
//!
//! - Group telegrams from ETS (L_Data.req) are confirmed to ETS (L_Data.con) and passed to
//!   the page, which puts them on the simulated bus at its interface.
//! - Group telegrams from the page are sent to every tunnel as L_Data.ind, one at a time
//!   per tunnel (each waits for its TUNNELLING_ACK), and are dropped rather than sent late:
//!   a command older than [`MAX_AGE`] never reaches ETS.
//! - The interface answers ETS's property reads itself (device management).
//! - Nothing else is simulated: no device of the diagram can be programmed by ETS.

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
        Self {
            id,
            props,
            conns: BTreeMap::new(),
            next_channel: 1,
        }
    }

    /// Open tunnels (ETS connections that carry telegrams).
    pub fn tunnels(&self) -> usize {
        self.conns.values().filter(|c| !c.mgmt).count()
    }

    /// Individual addresses of the open tunnels.
    pub fn tunnel_addresses(&self) -> Vec<u16> {
        self.conns
            .values()
            .filter(|c| !c.mgmt)
            .map(|c| c.address)
            .collect()
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
                        out.log.push(format!(
                            "ETS s'est déconnecté (canal {ch}, {})",
                            ip::individual_text(c.address)
                        ));
                    }
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
        self.conns.insert(
            ch,
            Connection {
                mgmt,
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
            out.log.push(format!(
                "ETS connecté (canal {ch}, adresse du tunnel {})",
                ip::individual_text(address)
            ));
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
        if let Some(answer) = self.props.answer(frame) {
            c.queue.push_back(Pending {
                cemi: answer,
                deadline: None,
                origin: None,
            });
            Self::pump(c, ch, now, out);
            return;
        }
        if c.mgmt || frame.first() != Some(&(MessageCode::LDataReq as u8)) {
            return;
        }
        let Some(mut f) = cemi::l_data(frame) else {
            out.log
                .push(format!("trame d'ETS invalide ignorée : {}", hex(frame)));
            return;
        };
        cemi::fill_source(&mut f, address);
        // The interface sent it on the bus: positive confirmation.
        if let Some(con) = cemi::recode(&f, MessageCode::LDataCon) {
            c.queue.push_back(Pending {
                cemi: con.as_bytes().to_vec(),
                deadline: None,
                origin: None,
            });
            Self::pump(c, ch, now, out);
        }
        // Only group telegrams exist on the simulated bus; individual ones (device
        // management of a device) find no device to answer.
        if !cemi::is_group(&f) {
            return;
        }
        let Some(ind) = cemi::recode(&f, MessageCode::LDataInd) else {
            return;
        };
        let ind = ind.as_bytes();
        out.page.push(ind.to_vec());
        // Another ETS connected at the same time sees it, as on a real bus.
        self.send_to_tunnels(ind, Some(ch), None, now, now, out);
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
        let Some(ind) = cemi::l_data(frame)
            .filter(cemi::is_group)
            .and_then(|f| cemi::recode(&f, MessageCode::LDataInd))
        else {
            out.log.push(format!(
                "trame de la page invalide ignorée : {}",
                hex(frame)
            ));
            return;
        };
        self.send_to_tunnels(ind.as_bytes(), None, Some(session), received, now, out);
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
            .filter(|(ch, c)| !c.mgmt && Some(**ch) != except)
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

    /// Repetitions, abandoned connections, heartbeats.
    pub fn tick(&mut self, now: Instant, out: &mut Output) {
        let mut close = Vec::new();
        for (&ch, c) in &mut self.conns {
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
}
