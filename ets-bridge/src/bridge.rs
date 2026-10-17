//! The running bridge: the tunnelling server for ETS and the WebSocket for the diagram,
//! started with some settings and stopped to apply others. What happens is kept in a
//! shared status, shown by the window (or printed in console mode).

use std::collections::VecDeque;
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4, TcpListener, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver};

/// Telegrams of the diagram waiting for the tunnelling server, at most.
const INBOX: usize = 256;
use std::sync::{Arc, Mutex, PoisonError};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use crate::knxip::{self, Identity};
use crate::settings::Settings;
use crate::tunnel::{self, Output, Tunnels};
use crate::ws::{self, Hub, Origins, ToBus, ToPage};

const LOG_LINES: usize = 400;

#[derive(Debug, Default, Clone)]
pub struct Status {
    pub running: bool,
    /// Why the bridge could not start or stopped.
    pub error: Option<String>,
    /// Tunnel addresses of the ETS connections.
    pub ets: Vec<String>,
    /// Origin of the linked diagram.
    pub page: Option<String>,
    pub from_ets: u64,
    pub to_ets: u64,
    pub log: VecDeque<String>,
}

/// Status shared by the bridge's threads and the window.
#[derive(Clone)]
pub struct Shared {
    status: Arc<Mutex<Status>>,
    started: Instant,
    /// Console mode: also print the journal.
    echo: bool,
}

impl Shared {
    pub fn new(echo: bool) -> Self {
        Self {
            status: Arc::new(Mutex::new(Status::default())),
            started: Instant::now(),
            echo,
        }
    }

    pub fn get(&self) -> Status {
        self.status
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .clone()
    }

    pub fn update(&self, f: impl FnOnce(&mut Status)) {
        f(&mut self.status.lock().unwrap_or_else(PoisonError::into_inner));
    }

    /// A line of the journal, with the time since the start.
    pub fn log(&self, line: &str) {
        let s = self.started.elapsed().as_secs();
        let line = format!("{:02}:{:02}:{:02}  {line}", s / 3600, (s / 60) % 60, s % 60);
        if self.echo {
            println!("{line}");
        }
        self.update(|st| {
            st.log.push_back(line);
            while st.log.len() > LOG_LINES {
                st.log.pop_front();
            }
        });
    }
}

/// Local address of this computer towards `peer` (no datagram is sent).
pub fn local_ip_towards(peer: SocketAddr) -> Option<Ipv4Addr> {
    let s = UdpSocket::bind("0.0.0.0:0").ok()?;
    s.connect(peer).ok()?;
    match s.local_addr().ok()? {
        SocketAddr::V4(a) if !a.ip().is_unspecified() => Some(*a.ip()),
        _ => None,
    }
}

/// This computer's address on the network, to tell a remote ETS where to connect.
pub fn network_ip() -> Option<Ipv4Addr> {
    local_ip_towards(SocketAddr::V4(SocketAddrV4::new(
        Ipv4Addr::new(192, 0, 2, 1),
        9,
    )))
}

pub struct Bridge {
    stop: Arc<AtomicBool>,
    threads: Vec<JoinHandle<()>>,
    shared: Shared,
}

fn busy(what: &str, port: u16, e: &std::io::Error) -> String {
    format!(
        "{what} : le port {port} est déjà utilisé ({e}). Une autre copie de BusDiagram-ETS \
         est peut-être ouverte, ou un autre programme utilise ce port : choisissez-en un autre."
    )
}

impl Bridge {
    pub fn start(settings: &Settings, shared: Shared) -> Result<Self, String> {
        let ip = if settings.remote_ets {
            Ipv4Addr::UNSPECIFIED
        } else {
            Ipv4Addr::LOCALHOST
        };
        let endpoint = SocketAddrV4::new(ip, settings.tunnel_port);
        let udp = UdpSocket::bind(endpoint).map_err(|e| busy("ETS", settings.tunnel_port, &e))?;
        let listener = TcpListener::bind(("127.0.0.1", settings.ws_port))
            .map_err(|e| busy("schéma", settings.ws_port, &e))?;
        let tunnels = Tunnels::new(Identity {
            // Outside the usual training lines (1.0, 1.1…): no collision with a device of
            // the diagram. ETS shows the tunnel address as the source of its telegrams.
            individual_address: 0xFFFA,
            tunnel_addresses: vec![0xFFFB, 0xFFFC, 0xFFFD, 0xFFFE],
            serial_number: [0x00, 0xFA, 0x42, 0x44, 0x00, 0x01],
            mac_address: [0; 6],
            endpoint,
            name: "BusDiagram".to_owned(),
        });
        let stop = Arc::new(AtomicBool::new(false));
        let (to_bus, from_page) = mpsc::sync_channel(INBOX);
        let hub = Arc::new(Hub::new(to_bus));
        let origins = Arc::new(Origins {
            extra: settings.origins.clone(),
            own_port: settings.ws_port,
        });
        let ws = {
            let (hub, stop, shared, port) =
                (hub.clone(), stop.clone(), shared.clone(), settings.ws_port);
            std::thread::spawn(move || ws::serve(&listener, &hub, &origins, port, &stop, &shared))
        };
        let bus = {
            let (stop, shared, verbose) = (stop.clone(), shared.clone(), settings.verbose);
            std::thread::spawn(move || {
                if let Err(e) = bus(&udp, tunnels, &hub, &from_page, &stop, &shared, verbose) {
                    shared.log(&format!("serveur de tunnel arrêté : {e}"));
                    shared.update(|s| s.error = Some(e.to_string()));
                }
            })
        };
        shared.update(|s| {
            s.running = true;
            s.error = None;
        });
        shared.log(&format!(
            "BusDiagram-ETS {} en marche : ETS sur le port {}{}, schémas sur ws://127.0.0.1:{}/ws",
            env!("CARGO_PKG_VERSION"),
            settings.tunnel_port,
            if settings.remote_ets {
                " (réseau)"
            } else {
                ""
            },
            settings.ws_port
        ));
        Ok(Self {
            stop,
            threads: vec![ws, bus],
            shared,
        })
    }

    /// Stop and wait: the ports are free again when this returns.
    pub fn stop(self) {
        self.stop.store(true, Ordering::Release);
        for t in self.threads {
            let _ = t.join();
        }
        self.shared.update(|s| {
            s.running = false;
            s.ets.clear();
            s.page = None;
        });
        self.shared.log("arrêtée");
    }
}

/// The tunnelling server's loop: datagrams from ETS, telegrams from the page, timers.
fn bus(
    udp: &UdpSocket,
    mut tunnels: Tunnels,
    hub: &Hub,
    from_page: &Receiver<ToBus>,
    stop: &Arc<AtomicBool>,
    shared: &Shared,
    verbose: bool,
) -> std::io::Result<()> {
    // Datagrams are read by their own thread, with a blocking receive: on Windows, a
    // receive that times out leaves the socket in an indeterminate state, and datagrams
    // that arrive then can be lost (ETS repeats a request after a second, which hid it).
    let (datagrams, incoming) = mpsc::channel::<(Vec<u8>, SocketAddr)>();
    let reader = {
        let udp = udp.try_clone()?;
        let stop = Arc::clone(stop);
        std::thread::spawn(move || {
            let mut buf = [0u8; 1024];
            while !stop.load(Ordering::Acquire) {
                match udp.recv_from(&mut buf) {
                    Ok((n, from)) => {
                        if datagrams
                            .send((buf.get(..n).unwrap_or_default().to_vec(), from))
                            .is_err()
                        {
                            break;
                        }
                    }
                    // Windows reports an ICMP "port unreachable" from an earlier datagram here.
                    Err(e) if e.kind() == std::io::ErrorKind::ConnectionReset => {}
                    Err(_) => break,
                }
            }
        })
    };
    let wake = udp.local_addr()?;
    let mut page: Option<String> = None;
    let mut ets: Vec<String> = Vec::new();
    while !stop.load(Ordering::Acquire) {
        let first = incoming.recv_timeout(Duration::from_millis(20));
        let now = Instant::now();
        let mut out = Output::default();
        match first {
            Ok((d, from)) => {
                tunnels.on_datagram(&d, from, now, &mut out);
                while let Ok((d, from)) = incoming.try_recv() {
                    tunnels.on_datagram(&d, from, now, &mut out);
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
        while let Ok(m) = from_page.try_recv() {
            match m {
                ToBus::Frame { session, at, cemi } => {
                    if verbose {
                        shared.log(&format!("schéma → ETS : {}", tunnel::hex(&cemi)));
                    }
                    tunnels.on_page_frame(&cemi, at, session, now, &mut out);
                }
                ToBus::Closed(session) => tunnels.forget(session, &mut out),
            }
        }
        tunnels.set_page_confirms(hub.confirms());
        if let Some(a) = hub.take_addresses() {
            tunnels.adopt_addresses(&a, &mut out);
        }
        tunnels.tick(now, &mut out);
        let to_ets = out.to_ets;
        for (d, to) in &out.udp {
            let _ = udp.send_to(d, to);
        }
        let from_ets = out.page.len() as u64;
        for f in out.page {
            if verbose {
                shared.log(&format!("ETS → schéma : {}", tunnel::hex(&f)));
            }
            hub.to_page(ToPage::Frame(f));
        }
        for line in out.log {
            shared.log(&line);
        }
        hub.set_ets(tunnels.tunnels());
        let now_ets: Vec<String> = tunnels
            .tunnel_addresses()
            .into_iter()
            .map(knxip::individual_text)
            .collect();
        let now_page = hub.page();
        if now_page != page {
            match &now_page {
                Some(origin) => shared.log(&format!("schéma relié ({origin})")),
                None => shared.log("schéma déconnecté"),
            }
            page = now_page.clone();
        }
        if from_ets > 0 || to_ets > 0 || now_ets != ets || page != shared.get().page {
            ets = now_ets.clone();
            shared.update(|s| {
                s.from_ets += from_ets;
                s.to_ets += to_ets;
                s.ets = now_ets;
                s.page = now_page;
            });
        }
    }
    // The reader waits in its receive: a datagram to this socket wakes it up to stop.
    let mut to = wake;
    if to.ip().is_unspecified() {
        to.set_ip(Ipv4Addr::LOCALHOST.into());
    }
    let _ = udp.send_to(&[], to);
    let _ = reader.join();
    Ok(())
}
