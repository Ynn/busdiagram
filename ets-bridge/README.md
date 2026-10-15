# busdiagram-ets

The program of the student package BusDiagram-ETS: a small window (`src/gui.rs`, egui with
OpenGL) shows what is connected, what to enter in ETS, the settings (`src/settings.rs`,
saved in `%APPDATA%\BusDiagram-ETS\reglages.txt`) and a journal; `src/bridge.rs` starts
and stops the servers. `--no-gui` runs it in a terminal. While it runs, any BusDiagram diagram
(designer, player, a page of a course, a file opened from disk) can be linked to ETS from
its toolbar ("Link to ETS"), with nothing to configure.

```
ETS ──UDP 127.0.0.1:3672── busdiagram-ets ──WebSocket ws://127.0.0.1:3761/ws── diagram
       KNXnet/IP tunnelling                     raw cEMI frames
```

- **Tunnelling server** (`src/tunnel.rs`, `src/knxip.rs`): what ETS 6.4 uses with a
  configured *Tunneling IP* connection — description, connection (tunnel on the data link
  layer, device management), connection state, disconnection, tunnelling requests and
  acknowledgements with repetition. The interface answers ETS's property reads itself
  (`src/cemi.rs`). Group telegrams from ETS are confirmed and passed to the diagram;
  telegrams from the diagram go to each tunnel one at a time, and are dropped if they
  cannot leave within 2 s. No device of the diagram can be programmed by ETS.
- **Frames**: KNXnet/IP frames, endpoints, connection headers and cEMI L_Data frames are
  those of [knx-rs-core](https://crates.io/crates/knx-rs-core). The server itself is
  written here: the `DeviceServer` of knx-rs-ip 0.10.1 answers neither search nor
  description requests, refuses device management connections, sends no `L_Data.con`, and
  blocks while it waits for an acknowledgement, all of which ETS needs or suffers from.
- **WebSocket** (`src/ws.rs`): each binary message is one cEMI L_Data frame; the program
  also sends `{"type":"status","ets":N}`. One diagram at a time. Reached as `127.0.0.1` or
  `localhost` only; accepted origins: files (`null`), pages served on this computer, the
  published site `https://ynn.github.io`, and those given with `--allow-origin`.

The simulation side (where telegrams enter and leave the simulated bus) is in the library:
`src/bridge/ets-link.ts`, `Simulation.ingest` and `Simulation.tap`; the toolbar control is
the option `bridge` of `<bus-diagram>`.

## Build

From the repository root: `npm run build:ets` (cargo build --release, then
`dist-ets/BusDiagram-ETS/`). Command line (not saved): `--no-gui`, `--ws-port`,
`--tunnel-port`, `--remote-ets` (ETS from another computer: listens on every interface),
`--allow-origin`, `--verbose` (every telegram in the journal).

Tests: `cargo test` (frames, property answers, the tunnelling state machine, origins).
