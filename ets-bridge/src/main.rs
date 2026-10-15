//! busdiagram-ets: links a BusDiagram diagram to ETS.
//!
//! Double-click: a window shows what is connected and what to do. The program waits for
//! ETS on a KNXnet/IP tunnelling port, and for a diagram on a local WebSocket. Any diagram
//! can connect when the reader clicks "Link to ETS" in its toolbar: the designer, the
//! player, a page of a course, a file from disk. Group telegrams then go both ways between
//! ETS and the simulated installation.
//!
//! `--no-gui` runs the same bridge in a terminal, printing its journal.

#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod bridge;
mod cemi;
mod gui;
mod knxip;
mod settings;
mod tunnel;
mod ws;

use std::process::ExitCode;

use settings::{Settings, normalize_origin};

const USAGE: &str = "busdiagram-ets [--version] [--no-gui] [--ws-port N] [--tunnel-port N] \
                     [--remote-ets] [--allow-origin https://site] [--verbose]";

struct Options {
    gui: bool,
    settings: Settings,
}

/// Saved settings, then those of the command line (not saved).
fn options() -> Result<Options, String> {
    let mut o = Options {
        gui: true,
        settings: Settings::load(),
    };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        let mut value = || {
            args.next()
                .ok_or_else(|| format!("valeur manquante après {a}"))
        };
        let s = &mut o.settings;
        match a.as_str() {
            "--no-gui" => o.gui = false,
            "--ws-port" => s.ws_port = value()?.parse().map_err(|_| "port invalide")?,
            "--tunnel-port" => s.tunnel_port = value()?.parse().map_err(|_| "port invalide")?,
            "--remote-ets" => s.remote_ets = true,
            "--allow-origin" => s
                .origins
                .push(normalize_origin(&value()?).ok_or("site invalide (https://site.exemple)")?),
            "--verbose" => s.verbose = true,
            _ => return Err(format!("option inconnue {a}\n{USAGE}")),
        }
    }
    Ok(o)
}

fn main() -> ExitCode {
    for a in std::env::args().skip(1) {
        match a.as_str() {
            "--version" | "-V" => {
                println!("BusDiagram-ETS {}", env!("CARGO_PKG_VERSION"));
                return ExitCode::SUCCESS;
            }
            "--help" | "-h" => {
                println!("{USAGE}");
                return ExitCode::SUCCESS;
            }
            _ => {}
        }
    }
    let o = match options() {
        Ok(o) => o,
        Err(e) => {
            eprintln!("{e}");
            return ExitCode::from(2);
        }
    };
    if o.gui {
        return match gui::run(o.settings) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("fenêtre impossible à ouvrir ({e}) : relancez avec --no-gui");
                ExitCode::FAILURE
            }
        };
    }
    let shared = bridge::Shared::new(true);
    println!("BusDiagram ⇄ ETS (Ctrl+C pour arrêter)");
    match bridge::Bridge::start(&o.settings, shared) {
        Ok(_running) => loop {
            std::thread::park();
        },
        Err(e) => {
            eprintln!("ERREUR : {e}");
            ExitCode::FAILURE
        }
    }
}
