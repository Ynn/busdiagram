//! The WebSocket a BusDiagram diagram connects to, on 127.0.0.1 only.
//!
//! Any diagram can connect when the reader asks for it: the designer, the player, a page
//! of a course, a file opened from disk. Protocol, deliberately minimal:
//! - binary message, both ways: one cEMI L_Data frame (a group telegram, a frame to or
//!   from a device, or the page's confirmation of a frame to a device);
//! - text message, program → page: `{"type":"status","ets":N}`, N tunnels open by ETS;
//! - text message, page → program: `{"type":"hello","confirms":true}`, the page
//!   confirms the frames to a device (an older page says nothing); with
//!   `"addresses":"1.1.254 1.1.253 …"`, the individual address of the interface then
//!   those of its tunnels, free in the line where ETS reaches the diagram, sent again
//!   when the diagram changes its access point (`"addresses":""`: those the program
//!   started with).
//!
//! One diagram at a time, so that two installations do not answer ETS together: the
//! diagram linked last takes over, and the previous one is told so (close code 4001).

use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, Sender, SyncSender};
use std::sync::{Arc, Mutex, PoisonError};
use std::time::{Duration, Instant};

use crate::bridge::Shared;

use tungstenite::handshake::derive_accept_key;
use tungstenite::protocol::frame::coding::CloseCode;
use tungstenite::protocol::{CloseFrame, Role, WebSocket};
use tungstenite::{Error, Message};

/// A message for the diagram.
pub enum ToPage {
    Frame(Vec<u8>),
    Status(usize),
    /// Another diagram was linked: this one is disconnected.
    Replaced,
}

/// A message for the tunnelling server.
pub enum ToBus {
    /// A telegram of the diagram of `session`, received at `at`.
    Frame {
        session: u64,
        at: Instant,
        cemi: Vec<u8>,
    },
    /// The diagram of `session` is gone: its telegrams still waiting do not leave.
    Closed(u64),
}

/// What the diagram and the tunnel share: the connected diagram, and the way to the bus.
pub struct Hub {
    page: Mutex<Option<(u64, Sender<ToPage>, String)>>,
    /// Bounded: a diagram that sends faster than ETS acknowledges loses telegrams rather
    /// than piling them up.
    to_bus: Mutex<SyncSender<ToBus>>,
    ets: Mutex<usize>,
    /// The linked diagram confirms the frames to a device.
    confirms: Mutex<bool>,
    /// The addresses the linked diagram gives the interface and its tunnels, not yet
    /// taken.
    addresses: Mutex<Option<Vec<u16>>>,
}

impl Hub {
    pub fn new(to_bus: SyncSender<ToBus>) -> Self {
        Self {
            page: Mutex::new(None),
            to_bus: Mutex::new(to_bus),
            ets: Mutex::new(0),
            confirms: Mutex::new(false),
            addresses: Mutex::new(None),
        }
    }

    /// Send to the connected diagram, if any.
    pub fn to_page(&self, m: ToPage) {
        if let Some((_, tx, _)) = &*self.page.lock().unwrap_or_else(PoisonError::into_inner) {
            let _ = tx.send(m);
        }
    }

    /// Number of ETS tunnels, told to the diagram when it changes.
    pub fn set_ets(&self, n: usize) {
        // The diagram before the count, as `attach` takes them: a diagram that connects
        // meanwhile is told the new count, and neither waits for the other.
        let page = self.page.lock().unwrap_or_else(PoisonError::into_inner);
        let mut ets = self.ets.lock().unwrap_or_else(PoisonError::into_inner);
        if *ets != n {
            *ets = n;
            if let Some((_, tx, _)) = &*page {
                let _ = tx.send(ToPage::Status(n));
            }
        }
    }

    /// Origin of the connected diagram, if any.
    pub fn page(&self) -> Option<String> {
        self.page
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .as_ref()
            .map(|(_, _, origin)| origin.clone())
    }

    /// Does the linked diagram confirm the frames to a device?
    pub fn confirms(&self) -> bool {
        *self.confirms.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// The addresses a diagram gave the interface and its tunnels, once.
    pub fn take_addresses(&self) -> Option<Vec<u16>> {
        self.addresses
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .take()
    }

    fn set_addresses(&self, a: Vec<u16>) {
        *self
            .addresses
            .lock()
            .unwrap_or_else(PoisonError::into_inner) = Some(a);
    }

    fn set_confirms(&self, on: bool) {
        *self.confirms.lock().unwrap_or_else(PoisonError::into_inner) = on;
    }

    fn attach(&self, id: u64, origin: &str) -> Receiver<ToPage> {
        // A new diagram has not said yet whether it confirms.
        self.set_confirms(false);
        let mut page = self.page.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some((_, previous, _)) = page.take() {
            let _ = previous.send(ToPage::Replaced);
        }
        let (tx, rx) = mpsc::channel();
        let _ = tx.send(ToPage::Status(
            *self.ets.lock().unwrap_or_else(PoisonError::into_inner),
        ));
        *page = Some((id, tx, origin.to_owned()));
        rx
    }

    fn detach(&self, id: u64) {
        let mut page = self.page.lock().unwrap_or_else(PoisonError::into_inner);
        if page.as_ref().is_some_and(|(p, _, _)| *p == id) {
            *page = None;
        }
        drop(page);
        self.to_bus(ToBus::Closed(id));
    }

    fn to_bus(&self, m: ToBus) {
        let _ = self
            .to_bus
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .try_send(m);
    }
}

/// Pages allowed to connect: a file opened from disk (origin "null"), any page served on
/// this computer, the published documentation and designer, and those given with
/// --allow-origin. Other sites cannot reach this program from the reader's browser.
pub struct Origins {
    pub extra: Vec<String>,
    /// Port of this program: it serves no page, so a page claiming it is stale.
    pub own_port: u16,
}

pub const PUBLISHED: &str = "https://ynn.github.io";

impl Origins {
    pub fn allows(&self, origin: &str) -> bool {
        let o = origin.trim().to_ascii_lowercase();
        let local = [
            "http://localhost",
            "http://127.0.0.1",
            "https://localhost",
            "https://127.0.0.1",
        ]
        .iter()
        .any(|base| {
            o.strip_prefix(base).is_some_and(|rest| {
                rest.is_empty()
                    || (rest.starts_with(':') && rest[1..].bytes().all(|b| b.is_ascii_digit()))
            })
        });
        let own = local && o.ends_with(&format!(":{}", self.own_port));
        !own && (o == "null"
            || local
            || o == PUBLISHED
            || self.extra.iter().any(|e| e.eq_ignore_ascii_case(&o)))
    }
}

/// Accept connections until `stop` is set.
pub fn serve(
    listener: &TcpListener,
    hub: &Arc<Hub>,
    origins: &Arc<Origins>,
    port: u16,
    stop: &Arc<AtomicBool>,
    shared: &Shared,
) {
    let hosts = Arc::new([format!("127.0.0.1:{port}"), format!("localhost:{port}")]);
    // Non-blocking, so that the loop sees `stop`.
    if listener.set_nonblocking(true).is_err() {
        return;
    }
    let mut next_id = 0u64;
    let mut sessions = Vec::new();
    while !stop.load(Ordering::Acquire) {
        match listener.accept() {
            Ok((stream, _)) => {
                next_id += 1;
                let _ = stream.set_nonblocking(false);
                let (hub, origins, hosts, stop, shared, id) = (
                    hub.clone(),
                    origins.clone(),
                    hosts.clone(),
                    stop.clone(),
                    shared.clone(),
                    next_id,
                );
                sessions.push(std::thread::spawn(move || {
                    let _ =
                        connection(stream, &hub, &origins, hosts.as_slice(), id, &stop, &shared);
                }));
            }
            Err(_) => std::thread::sleep(Duration::from_millis(50)),
        }
        sessions.retain(|t| !t.is_finished());
    }
    for t in sessions {
        let _ = t.join();
    }
}

fn headers(stream: &TcpStream) -> io::Result<Vec<(String, String)>> {
    let mut reader = BufReader::new(stream.take(8192));
    let mut line = String::new();
    reader.read_line(&mut line)?;
    let mut out = Vec::new();
    loop {
        let mut h = String::new();
        if reader.read_line(&mut h)? == 0 || h.trim().is_empty() {
            break;
        }
        if let Some((k, v)) = h.split_once(':') {
            out.push((k.trim().to_ascii_lowercase(), v.trim().to_owned()));
        }
    }
    Ok(out)
}

fn refuse(stream: &mut TcpStream, status: &str, text: &str) -> io::Result<()> {
    write!(
        stream,
        "HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{text}",
        text.len()
    )?;
    stream.flush()
}

fn connection(
    mut stream: TcpStream,
    hub: &Hub,
    origins: &Origins,
    hosts: &[String],
    id: u64,
    stop: &AtomicBool,
    shared: &Shared,
) -> io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    let h = headers(&stream)?;
    let get = |name: &str| h.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str());
    // Reached as 127.0.0.1 or localhost only: a site cannot reach it through a name of
    // its own that points to this computer (DNS rebinding).
    if !hosts.contains(&get("host").unwrap_or("").to_ascii_lowercase()) {
        return refuse(&mut stream, "421 Misdirected Request", "host not allowed\n");
    }
    if !get("upgrade").is_some_and(|v| v.eq_ignore_ascii_case("websocket")) {
        return refuse(
            &mut stream,
            "200 OK",
            "BusDiagram-ETS : ouvrez un schéma BusDiagram et cliquez sur « Relier à ETS ».\n",
        );
    }
    let origin = get("origin").unwrap_or("").to_owned();
    if !origins.allows(&origin) {
        shared.log(&format!(
            "schéma refusé : le site {} n'est pas autorisé (Réglages > Sites autorisés)",
            if origin.is_empty() { "?" } else { &origin }
        ));
        return refuse(&mut stream, "403 Forbidden", "origin not allowed\n");
    }
    let Some(key) = get("sec-websocket-key") else {
        return refuse(&mut stream, "400 Bad Request", "websocket key missing\n");
    };
    write!(
        stream,
        "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {}\r\n\r\n",
        derive_accept_key(key.as_bytes())
    )?;
    stream.set_read_timeout(Some(Duration::from_millis(50)))?;
    let mut ws = WebSocket::from_raw_socket(stream, Role::Server, None);
    let rx = hub.attach(id, &origin);
    let result = run(&mut ws, &rx, hub, stop, id);
    hub.detach(id);
    result
}

fn run(
    ws: &mut WebSocket<TcpStream>,
    rx: &Receiver<ToPage>,
    hub: &Hub,
    stop: &AtomicBool,
    session: u64,
) -> io::Result<()> {
    loop {
        if stop.load(Ordering::Acquire) {
            let _ = ws.close(Some(CloseFrame {
                code: CloseCode::Away,
                reason: "BusDiagram-ETS s'arrête".into(),
            }));
            let _ = ws.flush();
            return Ok(());
        }
        match ws.read() {
            Ok(Message::Binary(b)) => hub.to_bus(ToBus::Frame {
                session,
                at: Instant::now(),
                cemi: b.to_vec(),
            }),
            Ok(Message::Text(t)) => {
                if is_hello_confirming(&t) {
                    hub.set_confirms(true);
                }
                if let Some(a) = hello_addresses(&t) {
                    hub.set_addresses(a);
                }
            }
            Ok(Message::Close(_)) | Err(Error::ConnectionClosed | Error::AlreadyClosed) => {
                return Ok(());
            }
            Ok(_) => {}
            Err(Error::Io(e))
                if matches!(
                    e.kind(),
                    io::ErrorKind::WouldBlock | io::ErrorKind::TimedOut
                ) => {}
            Err(e) => return Err(io::Error::other(e)),
        }
        while let Ok(m) = rx.try_recv() {
            let msg = match m {
                ToPage::Replaced => {
                    let _ = ws.close(Some(CloseFrame {
                        code: CloseCode::Library(4001),
                        reason: "un autre schéma a été relié à ETS".into(),
                    }));
                    let _ = ws.flush();
                    return Ok(());
                }
                ToPage::Frame(f) => Message::Binary(f.into()),
                ToPage::Status(n) => {
                    Message::Text(format!("{{\"type\":\"status\",\"ets\":{n}}}").into())
                }
            };
            ws.send(msg).map_err(io::Error::other)?;
        }
    }
}

/// `{"type":"hello","confirms":true}`, without a JSON parser: the two members, in any
/// order and spacing.
fn is_hello_confirming(text: &str) -> bool {
    let compact: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    compact.starts_with('{')
        && compact.contains("\"type\":\"hello\"")
        && compact.contains("\"confirms\":true")
}

/// The member `"addresses":"1.1.254 1.1.253"` of a hello: individual addresses, at
/// least two (the interface, a tunnel), each once; empty, those the program started
/// with; None otherwise.
fn hello_addresses(text: &str) -> Option<Vec<u16>> {
    let compact: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    if !compact.contains("\"type\":\"hello\"") {
        return None;
    }
    let at = text.find("\"addresses\"")?;
    let rest = &text[at + "\"addresses\"".len()..];
    let open = rest.find('"')?;
    let value = &rest[open + 1..];
    let list = &value[..value.find('"')?];
    if list.trim().is_empty() {
        return Some(Vec::new());
    }
    let out: Vec<u16> = list
        .split_whitespace()
        .map(individual)
        .collect::<Option<_>>()?;
    let mut sorted = out.clone();
    sorted.sort_unstable();
    sorted.dedup();
    (out.len() >= 2 && sorted.len() == out.len()).then_some(out)
}

/// "1.1.254" → its 16 bits (area and line 0–15, device 0–255).
fn individual(s: &str) -> Option<u16> {
    let mut parts = s.split('.').map(|p| p.parse::<u16>().ok());
    let (a, l, d) = (parts.next()??, parts.next()??, parts.next()??);
    (parts.next().is_none() && a <= 15 && l <= 15 && d <= 255).then_some((a << 12) | (l << 8) | d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn addresses_of_a_hello() {
        assert_eq!(
            hello_addresses(r#"{"type":"hello","confirms":true,"addresses":"1.1.254 1.1.253"}"#),
            Some(vec![0x11FE, 0x11FD])
        );
        // One only, the same twice, out of bounds, not a hello: none.
        assert_eq!(
            hello_addresses(r#"{"type":"hello","addresses":"1.1.254"}"#),
            None
        );
        assert_eq!(
            hello_addresses(r#"{"type":"hello","addresses":"1.1.254 1.1.254"}"#),
            None
        );
        assert_eq!(
            hello_addresses(r#"{"type":"hello","addresses":"1.16.1 1.1.2"}"#),
            None
        );
        assert_eq!(
            hello_addresses(r#"{"type":"status","addresses":"1.1.1 1.1.2"}"#),
            None
        );
        // Empty: those the program started with.
        assert_eq!(
            hello_addresses(r#"{"type":"hello","confirms":true,"addresses":""}"#),
            Some(Vec::new())
        );
    }

    #[test]
    fn origins() {
        let o = Origins {
            extra: vec!["https://cours.example".into()],
            own_port: 3761,
        };
        for ok in [
            "null",
            "http://localhost:8080",
            "http://127.0.0.1",
            "https://ynn.github.io",
            "https://cours.example",
        ] {
            assert!(o.allows(ok), "{ok}");
        }
        for no in [
            "",
            "https://evil.example",
            "http://localhost.evil.example",
            "http://127.0.0.1:80x",
            "https://ynn.github.io.evil",
            "http://127.0.0.1:3761",
        ] {
            assert!(!o.allows(no), "{no}");
        }
    }

    #[test]
    fn diagram_and_tunnels_change_together() {
        // A diagram connecting while the number of tunnels changes: none waits for the
        // other, and the diagram ends with the last count.
        let (to_bus, _bus) = mpsc::sync_channel(16);
        let hub = std::sync::Arc::new(Hub::new(to_bus));
        let (done, finished) = mpsc::channel();
        let h = hub.clone();
        let counts = std::thread::spawn(move || {
            for n in 0..2000 {
                h.set_ets(n % 3);
            }
            h.set_ets(1);
        });
        let h = hub.clone();
        std::thread::spawn(move || {
            let mut rx = h.attach(0, "null");
            for id in 1..2000 {
                rx = h.attach(id, "null");
            }
            let joined = counts.join().is_ok();
            let _ = done.send(joined.then(|| rx.try_iter().last()).flatten());
        });
        let last = finished.recv_timeout(std::time::Duration::from_secs(10));
        assert!(last.is_ok(), "the hub is deadlocked");
        assert!(matches!(last, Ok(Some(ToPage::Status(1)))));
    }
}
