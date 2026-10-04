import { css, unsafeCSS } from "lit";

export const C = {
  bg: "#f3f2ee",
  ink: "#1c1e23",
  mute: "#5f646d",
  line: "#dedbd2",
  bus: "#1e9a6d",
  v230: "#d0602f",
  tg: "#2c68e0",
  cpl: "#6a4fc4",
  cplSoft: "#f1edfb",
  rep: "#555b68",
  repSoft: "#eeeff1",
  amber: "#e2a012",
  amberSoft: "#fbf1d8",
  ip: "#6b7280",
  red: "#b3452f",
  cream: "#fff2cc",
  creamHi: "#f6d77f",
  grid: "#2b2a27",
};

export function hexA(h: string, a: number) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export const styles = css`
  :host {
    display: block;
    font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    color: ${unsafeCSS(C.ink)};
    --mono:
      "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas,
      monospace;
    margin: 1rem 0;
  }
  :host([data-fit="contain"]) {
    margin: 0;
    height: 100%;
  }
  * {
    box-sizing: border-box;
  }
  .kv.contain {
    height: 100%;
  }
  .kv.contain .stage-wrap {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .kv.contain .scroller {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .kv.contain .stage-size {
    min-width: 0;
    flex: none;
  }
  .viewfault {
    position: absolute;
    border: 1.5px dashed ${unsafeCSS(C.red)};
    color: ${unsafeCSS(C.red)};
    background: #fdf1ee;
    border-radius: 8px;
    font-size: 11.5px;
    padding: 4px 6px;
  }
  .mini {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    z-index: 7;
  }
  .mini button {
    width: 30px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid #cfccc1;
    background: rgba(255, 255, 255, 0.92);
    cursor: pointer;
    font-size: 13px;
    color: ${unsafeCSS(C.ink)};
  }
  .mini a.ico {
    width: 30px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid #cfccc1;
    background: rgba(255, 255, 255, 0.92);
    color: ${unsafeCSS(C.ink)};
  }
  a.ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }
  .btn.ico {
    padding: 5px 8px;
  }
  .mini button.on {
    background: ${unsafeCSS(C.ink)};
    border-color: ${unsafeCSS(C.ink)};
    color: #fff;
  }
  .kv {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    padding: 6px 10px;
    background: #fff;
    border: 1px solid ${unsafeCSS(C.line)};
    border-radius: 12px;
  }
  .bar h2 {
    margin: 0 auto 0 0;
    font-size: 15px;
    font-weight: 600;
  }
  .grp {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lbl {
    font-size: 11px;
    font-weight: 600;
    color: ${unsafeCSS(C.mute)};
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  button {
    font: inherit;
  }
  .btn {
    font-size: 13px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    border: 1.5px solid #cfccc1;
    background: #fff;
    color: ${unsafeCSS(C.ink)};
  }
  .btn:hover {
    background: #f3f2ee;
  }
  .btn.on {
    background: ${unsafeCSS(C.ink)};
    border-color: ${unsafeCSS(C.ink)};
    color: #fff;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .btn.primary {
    background: ${unsafeCSS(C.tg)};
    border-color: ${unsafeCSS(C.tg)};
    color: #fff;
  }
  .seg {
    display: flex;
    background: #eceae3;
    border-radius: 9px;
    padding: 2px;
    gap: 2px;
  }
  .seg button {
    font-size: 12.5px;
    font-weight: 600;
    padding: 4px 9px;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    background: transparent;
    color: ${unsafeCSS(C.mute)};
    white-space: nowrap;
  }
  .seg button.sel {
    background: #fff;
    color: ${unsafeCSS(C.ink)};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  .hint {
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
  }
  .desc {
    font-size: 13.5px;
    color: ${unsafeCSS(C.mute)};
    margin: 0 4px;
    line-height: 1.45;
  }
  .stage-wrap {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid ${unsafeCSS(C.line)};
    background-color: #f7f6f1;
  }
  .stage-wrap:fullscreen {
    border: 0;
    border-radius: 0;
  }
  .stage-wrap:fullscreen {
    display: flex;
    flex-direction: column;
  }
  .stage-wrap:fullscreen .scroller {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage-wrap:fullscreen .stage-size {
    min-width: 0;
    flex: none;
  }
  .cfgwarn {
    margin: 0 0 10px;
    padding: 8px 12px;
    border: 1px solid #e3c77a;
    border-left: 4px solid ${unsafeCSS(C.amber)};
    border-radius: 8px;
    background: #fdf6e3;
    font-size: 13px;
    color: ${unsafeCSS(C.ink)};
  }
  .cfgwarn ul {
    margin: 4px 0 0;
    padding-left: 18px;
  }
  .clock {
    position: relative;
    z-index: 7;
    margin: 6px 8px 0;
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 10px;
    border: 1px solid #cfccc1;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.94);
    font-size: 12.5px;
    color: ${unsafeCSS(C.ink)};
  }
  .clock b {
    font-family: var(--mono);
    font-weight: 600;
  }
  .clock .btn {
    font-size: 11.5px;
    padding: 2px 7px;
  }
  .clock input {
    font: inherit;
    font-size: 12px;
    padding: 1px 4px;
    border: 1px solid #cfc9ba;
    border-radius: 6px;
  }
  .fsbtn {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 7;
    width: 30px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 8px;
    border: 1px solid #cfccc1;
    background: rgba(255, 255, 255, 0.92);
    color: ${unsafeCSS(C.ink)};
    cursor: pointer;
  }
  .fsbtn:hover {
    background: #fff;
  }
  .fsbtn:focus-visible {
    outline: 2px solid ${unsafeCSS(C.tg)};
    outline-offset: 1px;
  }
  .scroller {
    overflow-x: auto;
    overflow-y: hidden;
  }
  .stage-size {
    position: relative;
    min-width: 100%;
    background-image: radial-gradient(#e2dfd4 1.1px, transparent 1.3px);
  }
  .stage {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .stage > svg {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
  }
  .card {
    position: absolute;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: #cdbd8e;
    border: 1.5px solid #b9a877;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    box-shadow:
      0 1px 2px rgba(70, 55, 20, 0.08),
      0 8px 20px -6px rgba(70, 55, 20, 0.18);
    transition: box-shadow 0.2s;
  }
  .card:hover {
    box-shadow:
      0 1px 2px rgba(70, 55, 20, 0.1),
      0 10px 26px -6px rgba(70, 55, 20, 0.28);
  }
  .cell {
    background: ${unsafeCSS(C.cream)};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-width: 0;
    transition:
      background 0.45s,
      color 0.45s;
    font-size: 14px;
    text-align: center;
    line-height: 1.1;
    padding: 0 6px;
  }
  .cell.hi {
    background: ${unsafeCSS(C.creamHi)};
    font-weight: 600;
  }
  .cell.ia {
    grid-column: span 2;
    font-family: var(--mono);
    font-size: 14.5px;
    letter-spacing: 0.5px;
    color: #5c4c1d;
    background: #f6e3a6;
  }
  .cell.name {
    grid-column: span 2;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    line-height: 37px;
    background: #fcecbd;
  }
  .card.sup {
    background: #3a3f4b;
    border-color: #1f2229;
  }
  .cell.ia .sys {
    margin-left: 8px;
    font-size: 12px;
    letter-spacing: 0;
    color: #7a5a14;
  }
  .card.sup .cell.ia,
  .card.sup .cell.name {
    background: #1f2229;
    color: #fff;
  }
  .cell.ga {
    font-family: var(--mono);
    font-size: 14px;
    flex-direction: column;
  }
  .cell.ga {
    cursor: pointer;
  }
  .cell.ga.focus {
    outline: 3px solid ${unsafeCSS(C.tg)};
    outline-offset: -3px;
    background: #e4eefb;
  }
  .flagchip {
    position: absolute;
    top: 1px;
    right: 3px;
    font-size: 9.5px;
    font-family: var(--mono);
    color: #fff;
    background: ${unsafeCSS(C.tg)};
    border-radius: 3px;
    padding: 0 3px;
  }
  .gafocus {
    position: absolute;
    left: 12px;
    top: 10px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #fff;
    border: 2px solid ${unsafeCSS(C.tg)};
    font-size: 12.5px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }
  .gafocus b {
    font-family: var(--mono);
    color: ${unsafeCSS(C.tg)};
  }
  .gafocus span {
    color: ${unsafeCSS(C.mute)};
  }
  button.galink {
    font: inherit;
    color: ${unsafeCSS(C.tg)};
    background: none;
    border: 0;
    padding: 0;
    text-decoration: underline dotted;
    cursor: pointer;
  }
  .cell.ga small {
    font-size: 10.5px;
    color: #8a7a4c;
  }
  button.gab {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0 1px;
    margin: 0;
    cursor: pointer;
    border-radius: 2px;
  }
  button.gab.on {
    text-decoration: underline;
  }
  button.gab:focus-visible {
    outline: 2px solid ${unsafeCSS(C.tg)};
  }
  .cell.ga small button.gab + button.gab {
    margin-left: 4px;
  }
  .flagchip.none {
    background: ${unsafeCSS(C.mute)};
  }
  /* Free text of a cell: no more than two lines, the rest of them in infobulle. */
  .cell .txt {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  .cell .txt.long {
    font-size: 12px;
  }
  .cell .txt.one {
    -webkit-line-clamp: 1;
    display: -webkit-box;
  }
  .cell .sub {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: ${unsafeCSS(C.tg)};
  }
  .val {
    position: absolute;
    bottom: 3px;
    min-width: 19px;
    height: 19px;
    padding: 0 4px;
    border-radius: 5px;
    border: 1.5px solid ${unsafeCSS(C.amber)};
    background: #fff;
    color: ${unsafeCSS(C.ink)};
    font-family: var(--mono);
    font-size: 11.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.3s,
      color 0.3s;
  }
  .val.w {
    font-size: 10px;
    padding: 0 2px;
  }
  .cell.ga.pr {
    padding-right: 30px;
  }
  .cell.ga.pl {
    padding-left: 30px;
  }
  .val.set {
    background: #ffe7a3;
  }
  .val.r {
    right: 3px;
  }
  .val.l {
    left: 3px;
  }
  .val.fresh {
    color: ${unsafeCSS(C.red)};
    animation: pop 0.6s ease-out;
  }
  @keyframes pop {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 ${unsafeCSS(hexA(C.amber, 0.7))};
    }
    35% {
      transform: scale(1.35);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 8px ${unsafeCSS(hexA(C.amber, 0))};
    }
  }
  .plate {
    position: absolute;
    background: linear-gradient(145deg, #ffffff, #f1efe8);
    border: 1px solid #d6d1c3;
    border-radius: 14px;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.06),
      0 8px 18px -8px rgba(0, 0, 0, 0.22);
  }
  .key {
    position: absolute;
    left: 8px;
    right: 8px;
    border-radius: 9px;
    border: 1px solid #cfc9ba;
    background: linear-gradient(#ffffff, #ece9e1);
    box-shadow:
      inset 0 1px 0 #fff,
      0 2px 0 #d2ccbd,
      0 3px 6px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    cursor: pointer;
    touch-action: none;
    user-select: none;
    color: ${unsafeCSS(C.ink)};
    padding: 0 7px;
    overflow: hidden;
    font-size: 12px;
    transition:
      transform 0.08s,
      box-shadow 0.08s,
      background 0.15s;
  }
  .key:hover {
    border-color: ${unsafeCSS(C.amber)};
  }
  .key:focus-visible {
    outline: 2px solid ${unsafeCSS(C.tg)};
    outline-offset: 2px;
  }
  .key:active,
  .key.down {
    background: linear-gradient(#f5b83a, ${unsafeCSS(C.amber)});
    border-color: #b98200;
    color: #fff;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.18);
    transform: translateY(2px);
  }
  .key .ico {
    flex: none;
    white-space: nowrap;
    font-size: 13px;
    line-height: 1;
    color: ${unsafeCSS(C.mute)};
  }
  .key .led {
    flex: none;
  }
  .key.down .ico {
    color: #fff;
  }
  .key .kl {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    min-width: 0;
    flex: 0 1 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .key .kx {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    line-height: 1.1;
  }
  .key:has(.kx) {
    gap: 4px;
  }
  .key .kx {
    flex: 0 1 auto;
  }
  .key .kx .kl,
  .key .kx .ks {
    max-width: 100%;
  }
  .key .ks {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.1px;
    color: ${unsafeCSS(C.mute)};
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .key.down .ks {
    color: #fff;
  }
  .led {
    width: 7px;
    height: 7px;
    border-radius: 4px;
    background: #d6d2c6;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.2);
  }
  .led.on {
    background: #ffb400;
    box-shadow: 0 0 7px 1px #ffb400;
  }
  .holdbar {
    position: absolute;
    height: 6px;
    border-radius: 3px;
    background: #e5e2d8;
    overflow: hidden;
  }
  .holdbar div {
    height: 100%;
  }
  .holdtxt {
    position: absolute;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: #fff;
    padding: 1px 5px;
    border-radius: 5px;
    z-index: 6;
  }
  .coupler {
    position: absolute;
    border: 2px solid ${unsafeCSS(C.cpl)};
    background: ${unsafeCSS(C.cplSoft)};
    border-radius: 9px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      background 0.3s,
      border-color 0.3s;
  }
  .coupler b {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .coupler span {
    font-family: var(--mono);
    font-size: 12.5px;
    opacity: 0.85;
  }
  .chip {
    position: absolute;
    transform: translateX(-50%);
    background: #fff;
    border-radius: 6px;
    padding: 2px 7px;
    font-family: var(--mono);
    font-size: 11.5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1;
  }
  .tag {
    position: absolute;
    transform: translate(-50%, -100%);
    z-index: 3;
    pointer-events: none;
    background: #fff;
    border-radius: 7px;
    padding: 3px 9px;
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .tag b {
    background: ${unsafeCSS(C.amberSoft)};
    color: ${unsafeCSS(C.ink)};
    padding: 0 3px;
    border-radius: 3px;
  }
  .pill {
    position: absolute;
    padding: 3px 9px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--mono);
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
    z-index: 4;
    cursor: pointer;
  }
  .pill i {
    width: 7px;
    height: 7px;
    border-radius: 4px;
    background: ${unsafeCSS(C.amber)};
  }
  .pill em {
    font-style: normal;
    opacity: 0.85;
    font-weight: 400;
  }
  .seglabel {
    position: absolute;
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    color: ${unsafeCSS(C.bus)};
    white-space: nowrap;
  }
  .seglabel .psu {
    margin-left: 8px;
    padding: 0 5px;
    border: 1.5px solid currentColor;
    border-radius: 4px;
    font: inherit;
    font-size: 11px;
    color: inherit;
    background: #fff;
    cursor: pointer;
  }
  .seglabel .psu:hover,
  .seglabel .psu:focus-visible {
    background: #eef8f2;
  }
  .seglabel .psu.off {
    color: #8a8478;
    border-style: dashed;
    background: #f1efe9;
  }
  .card.unpowered {
    opacity: 0.55;
    filter: grayscale(0.8);
  }
  .zone {
    position: absolute;
    border-radius: 18px;
    border: 1.5px dashed #c8c5b9;
    background: rgba(255, 255, 255, 0.4);
  }
  .zone span {
    position: absolute;
    left: 150px;
    top: 8px;
    font-size: 16px;
    font-weight: 600;
    color: ${unsafeCSS(C.mute)};
  }
  .lamp {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lamp svg {
    width: 26px;
    height: 32px;
    overflow: visible;
    transition: filter 0.35s;
  }
  .lamp svg.fanicon {
    width: 30px;
    height: 30px;
  }
  .fanicon .blades {
    transform-origin: 16px 16px;
    animation: fan-turn 1s linear infinite;
  }
  @keyframes fan-turn {
    to {
      transform: rotate(360deg);
    }
  }
  .lamp svg .glass {
    fill: #fff;
    stroke: #a9a393;
    transition:
      fill 0.35s,
      stroke 0.35s;
  }
  .lamp svg .base {
    fill: #bdb7a8;
  }
  .lamp svg .fil {
    stroke: #b7b1a2;
    fill: none;
    transition: stroke 0.35s;
  }
  .lamp.on svg {
    filter: drop-shadow(0 0 6px rgba(255, 190, 40, 0.95))
      drop-shadow(0 0 16px rgba(255, 190, 40, 0.6));
  }
  .lamp.on svg .glass {
    fill: #ffd84d;
    stroke: #d99a00;
  }
  .lamp.on svg .fil {
    stroke: #b46a00;
  }
  .loadlbl {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.15;
    max-width: 88px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .countdown {
    position: absolute;
    z-index: 3;
    padding: 1px 6px;
    border-radius: 9px;
    border: 1.5px solid #c98a00;
    background: #fff7e0;
    color: #6b4a00;
    font-family: var(--mono);
    font-size: 11.5px;
    line-height: 16px;
    white-space: nowrap;
    pointer-events: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  .countdown b {
    font-weight: 700;
  }
  .countdown.delay.on {
    border-color: #2e8b57;
    background: #e9f7ef;
    color: #1d5e3a;
  }
  .loadlbl small {
    display: block;
    font-family: var(--mono);
    font-weight: 400;
    color: ${unsafeCSS(C.mute)};
    font-size: 11.5px;
  }
  .radiator .rad {
    width: 40px;
    height: 32px;
    flex: none;
    filter: none;
  }
  .radiator.hot .rad {
    filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.45));
  }
  .fancoil .fcu {
    width: 44px;
    height: 30px;
    flex: none;
  }
  .fancoil.heating .fcu {
    filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.45));
  }
  .fancoil.cooling .fcu {
    filter: drop-shadow(0 0 5px rgba(47, 109, 179, 0.45));
  }
  .lamp .bulb {
    width: 30px;
    height: 36px;
    flex: none;
  }
  .dali {
    position: absolute;
    font-size: 11px;
  }
  .dali-bus {
    position: relative;
    height: 14px;
    border-top: 2.5px dashed #7a57c9;
    margin-top: 6px;
  }
  .dali-bus span {
    position: absolute;
    right: 0;
    top: -16px;
    font-family: var(--mono);
    font-size: 9.5px;
    font-weight: 700;
    color: #7a57c9;
    letter-spacing: 0.5px;
  }
  .dali-ecgs {
    display: grid;
    gap: 2px;
    margin-top: -8px;
  }
  .dali-ecg {
    all: unset;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 5px;
  }
  .dali-ecg:hover {
    background: rgba(122, 87, 201, 0.1);
  }
  .dali-ecg .bulb {
    width: 16px;
    height: 20px;
  }
  .dali-ecg small {
    font-family: var(--mono);
    font-size: 8.5px;
    color: #7a57c9;
  }
  .dali-ecg.failed .bulb {
    opacity: 0.35;
  }
  .dali-ecg.failed small {
    color: ${unsafeCSS(C.red)};
    font-weight: 700;
    text-decoration: line-through;
  }
  .dali-foot {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
    margin-top: 2px;
  }
  .dali-foot b {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dali-foot span {
    font-family: var(--mono);
    color: ${unsafeCSS(C.mute)};
  }
  .shutter {
    position: absolute;
    width: 92px;
  }
  .shutter .box {
    height: 16px;
    background: #e4e1d8;
    border: 1.5px solid #b8b4a7;
    border-radius: 5px 5px 0 0;
  }
  .shutter .win {
    height: 78px;
    background: linear-gradient(#cfe3f3, #eaf3fa);
    border: 1.5px solid #b8b4a7;
    border-top: none;
    position: relative;
    overflow: hidden;
  }
  .shutter .slats {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    background-image: repeating-linear-gradient(
      #d8d4c7 0 7px,
      #bdb8a9 7px 8.5px
    );
    border-bottom: 3px solid #8f8a7b;
  }
  .shutter .slatinfo {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    color: ${unsafeCSS(C.mute)};
  }
  .shutter .slatinfo b {
    font-family: var(--mono);
    font-weight: 600;
  }
  .shutter .foot {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin-top: 3px;
    font-size: 12.5px;
  }
  .shutter .foot span:first-child {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .shutter .foot span:last-child {
    font-family: var(--mono);
    color: ${unsafeCSS(C.mute)};
  }
  .shutter .foot span.mv,
  .est b.mv {
    color: #9a6a00;
  }
  .est {
    position: absolute;
    width: 92px;
    display: flex;
    flex-direction: column;
    font-size: 11.5px;
    line-height: 1.3;
    color: ${unsafeCSS(C.mute)};
    border-top: 1px dashed #cfccc1;
    padding-top: 2px;
  }
  .est span {
    display: flex;
    justify-content: space-between;
  }
  .est b {
    font-family: var(--mono);
    font-weight: 600;
    color: ${unsafeCSS(C.cpl)};
  }
  .screen {
    position: absolute;
    left: 6px;
    right: 6px;
    border-radius: 7px;
    background: #22313a;
    color: #d8f3e6;
    font-family: var(--mono);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.05;
    box-shadow: inset 0 0 0 2px #3c4d57;
  }
  .screen b {
    font-size: 17px;
  }
  .screen b small {
    font-size: 10px;
    font-weight: 400;
    margin-left: 1px;
  }
  .screen span {
    font-size: 10.5px;
    color: #a9d6c2;
    white-space: nowrap;
  }
  .screen i {
    font-style: normal;
    color: #ff9a5c;
    margin-left: 3px;
  }
  .screen i.cool {
    color: #8cc6ff;
  }
  .numin {
    position: absolute;
    left: 6px;
    right: 6px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 1px;
  }
  .numin label {
    font-size: 9.5px;
    line-height: 10px;
    font-weight: 600;
    color: ${unsafeCSS(C.mute)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }
  .numin div {
    display: flex;
    gap: 3px;
  }
  .numin input {
    width: 100%;
    min-width: 0;
    height: 20px;
    border: 1px solid #cfc9ba;
    border-radius: 6px;
    padding: 0 3px;
    font-family: var(--mono);
    font-size: 12px;
    text-align: right;
    background: #fff;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  /* Native spin buttons leave no room for the value in the narrow key plate;
     arrow keys still step the value. */
  .numin input::-webkit-inner-spin-button,
  .numin input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .numin input:focus-visible,
  .numin button:focus-visible {
    outline: 2px solid ${unsafeCSS(C.tg)};
    outline-offset: 1px;
  }
  .numin button {
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1px solid #cfc9ba;
    background: linear-gradient(#ffffff, #ece9e1);
    cursor: pointer;
    padding: 0;
    font-size: 12px;
  }
  .banner {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    background: #fff;
    border: 1.5px solid ${unsafeCSS(C.cpl)};
    border-radius: 12px;
    padding: 7px 8px 7px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 6px 20px rgba(20, 20, 30, 0.15);
    max-width: 94%;
    font-size: 14px;
    z-index: 8;
  }
  .banner.fault {
    border-color: ${unsafeCSS(C.red)};
    color: ${unsafeCSS(C.red)};
  }
  .banner .more {
    color: ${unsafeCSS(C.mute)};
  }
  .cause {
    font-family: inherit !important;
    font-size: 13px !important;
    font-weight: 500;
  }
  .info {
    position: absolute;
    right: 12px;
    top: 12px;
    width: min(380px, calc(100% - 24px));
    background: #fff;
    border-radius: 12px;
    border: 1.5px solid ${unsafeCSS(C.cpl)};
    padding: 11px 14px;
    box-shadow: 0 8px 26px rgba(20, 20, 30, 0.16);
    z-index: 9;
    font-size: 13.5px;
    line-height: 1.45;
  }
  .info h3 {
    margin: 0 0 4px;
    font-size: 15.5px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .info h3 span {
    cursor: pointer;
    color: ${unsafeCSS(C.mute)};
  }
  .info table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 6px;
    font-size: 12.5px;
  }
  .info td {
    padding: 2px 4px;
    border-top: 1px solid #eee;
  }
  .info td.m {
    font-family: var(--mono);
    white-space: nowrap;
  }
  .info th {
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    color: ${unsafeCSS(C.mute)};
    padding: 2px 4px;
  }
  .info .behavior {
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
    margin-top: 2px;
  }
  .info code {
    font-family: var(--mono);
    color: ${unsafeCSS(C.ink)};
  }
  .info .flags span {
    display: inline-block;
    width: 15px;
    text-align: center;
    border-radius: 3px;
    margin-right: 2px;
    color: #b8b3a5;
    text-decoration: line-through;
  }
  .info .flags span.on {
    color: ${unsafeCSS(C.bus)};
    background: #e3f4ec;
    text-decoration: none;
    font-weight: 700;
  }
  .info details {
    margin-top: 6px;
  }
  .info summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 12.5px;
  }
  .info .chans tr.head td {
    font-weight: 600;
    padding-top: 6px;
  }
  .info .chans small {
    font-weight: 400;
    color: ${unsafeCSS(C.mute)};
    margin-left: 6px;
  }
  .info {
    max-height: calc(100% - 24px);
    overflow: auto;
  }
  .bottom {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 8px;
  }
  @media (max-width: 860px) {
    .bottom {
      grid-template-columns: 1fr;
    }
  }
  .panel {
    background: #fff;
    border: 1px solid ${unsafeCSS(C.line)};
    border-radius: 12px;
    padding: 8px 10px;
    min-width: 0;
  }
  .panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }
  .cap {
    font-size: 11.5px;
    font-weight: 600;
    color: ${unsafeCSS(C.mute)};
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .usb,
  .rooms {
    grid-column: 1 / -1;
  }
  .timeline {
    margin-top: 8px;
  }
  .timeline header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tl-row {
    display: grid;
    grid-template-columns: minmax(120px, 210px) minmax(0, 1fr) 40px;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }
  .tl-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    min-width: 0;
  }
  .tl-label i {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .tl-label span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tl-label b {
    font-family: var(--mono);
    font-weight: 600;
  }
  .tl-x {
    border: 0;
    background: none;
    cursor: pointer;
    color: ${unsafeCSS(C.mute)};
    font-size: 15px;
    line-height: 1;
    padding: 0 2px;
  }
  .tl-lane {
    width: 100%;
    height: 40px;
    background: ${unsafeCSS(hexA(C.ink, 0.025))};
    border-radius: 4px;
  }
  .tl-scale {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 40px;
    font-family: var(--mono);
    font-size: 10px;
    color: ${unsafeCSS(C.mute)};
  }
  .tl-ticks {
    position: relative;
    height: 14px;
    font-family: var(--mono);
    font-size: 10px;
    color: ${unsafeCSS(C.mute)};
  }
  .tl-ticks span {
    position: absolute;
    transform: translateX(-50%);
    white-space: nowrap;
  }
  .tl-add {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
  }
  .tl-add select {
    max-width: 320px;
    font-size: 12px;
  }
  .room-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 2px 2px;
  }
  .room {
    flex: 1 1 250px;
    max-width: 380px;
    min-width: 0;
    border: 1px solid ${unsafeCSS(C.line)};
    border-radius: 10px;
    padding: 6px 10px 8px;
    background: #fbfaf6;
  }
  .room.open {
    border-color: #7fb0e0;
    background: #f1f7fd;
  }
  .room-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .room-head b {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .room-t {
    font-family: var(--mono);
    font-size: 20px;
    font-weight: 700;
    color: ${unsafeCSS(C.ink)};
    white-space: nowrap;
  }
  .room-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
    margin-top: 2px;
  }
  .room-line span:first-child {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .room-line b {
    color: ${unsafeCSS(C.ink)};
    font-weight: 600;
    white-space: nowrap;
  }
  .room-bar {
    flex: none;
    width: 60px;
    height: 6px;
    border-radius: 3px;
    background: #e6e3da;
    overflow: hidden;
  }
  .room-bar i {
    display: block;
    height: 100%;
    background: #ea580c;
  }
  .room-bar.cool i {
    background: #2f6db3;
  }
  .room-ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
  }
  .room-out {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${unsafeCSS(C.mute)};
  }
  .room-out b {
    font-family: var(--mono);
    color: ${unsafeCSS(C.ink)};
    min-width: 4.5em;
    text-align: center;
  }
  .room-out .btn {
    padding: 2px 8px;
  }
  .usb .hint select {
    font: inherit;
    font-size: 12px;
  }
  .usb-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: flex-end;
    padding: 8px 12px 4px;
  }
  .usb-row label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${unsafeCSS(C.mute)};
    min-width: 0;
  }
  .usb-row label small {
    font-weight: 400;
  }
  .usb-row select,
  .usb-row input {
    font: inherit;
    font-size: 13px;
    color: ${unsafeCSS(C.ink)};
    padding: 4px 6px;
    border: 1px solid #cfccc1;
    border-radius: 7px;
    background: #fff;
    max-width: 320px;
  }
  .usb-row input {
    width: 7em;
  }
  .usb-out {
    padding: 4px 12px 10px;
    font-size: 12.5px;
    color: ${unsafeCSS(C.mute)};
  }
  .usb-bad {
    color: ${unsafeCSS(C.red)};
    margin-bottom: 2px;
  }
  .usb-out b {
    color: ${unsafeCSS(C.ink)};
  }
  .mon {
    max-height: 196px;
    overflow: auto;
    container-type: inline-size;
  }
  .panel header .enlarge,
  .panel header .close {
    flex: none;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    padding: 0;
    font-size: 12px;
    line-height: 1;
  }
  dialog.enlarged {
    width: min(1400px, 96vw);
    max-height: 94vh;
    padding: 12px;
    border: 1px solid ${unsafeCSS(C.line)};
    border-radius: 14px;
    background: #fafaf7;
    box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.45);
    box-sizing: border-box;
    overflow: auto;
  }
  dialog.enlarged::backdrop {
    background: rgba(28, 30, 35, 0.45);
  }
  dialog.enlarged > .panel + .panel {
    margin-top: 10px;
  }
  dialog.enlarged .mon {
    max-height: 60vh;
  }
  dialog.enlarged .mon table {
    font-size: 14px;
  }
  dialog.enlarged .mon th,
  dialog.enlarged .mon td {
    padding: 5px 8px;
  }
  dialog.enlarged .mon td small {
    max-width: 18em;
  }
  /* On narrow panels, telegram type (always GroupValueWrite) and DPT remain in the details. */
  @container (max-width: 620px) {
    .mon .opt {
      display: none;
    }
  }
  .mon table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--mono);
    font-size: 12px;
  }
  .mon th {
    position: sticky;
    top: 0;
    background: #f4f3ef;
    text-align: left;
    font-family: inherit;
    font-weight: 600;
    color: ${unsafeCSS(C.mute)};
    padding: 3px 6px;
    white-space: nowrap;
  }
  .mon td {
    padding: 3px 6px;
    border-top: 1px solid #efede7;
    white-space: nowrap;
  }
  .mon tr {
    cursor: pointer;
  }
  .mon tbody tr:hover {
    background: #f7f6f2;
  }
  .mon tr.sel {
    background: ${unsafeCSS(C.amberSoft)};
  }
  .mon td small {
    color: ${unsafeCSS(C.mute)};
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    margin-left: 4px;
  }
  /* Truncate long device and address names with an ellipsis. */
  .mon td small {
    display: inline-block;
    max-width: 9em;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }
  .mon .state td:nth-child(4) {
    color: ${unsafeCSS(C.tg)};
  }
  .empty {
    font-size: 13px;
    color: ${unsafeCSS(C.mute)};
    padding: 6px 2px;
  }
  .kv-row {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 6px;
    align-items: baseline;
    font-size: 13px;
    padding: 1px 0;
  }
  .kv-row span:first-child {
    color: ${unsafeCSS(C.mute)};
  }
  .kv-row b {
    font-family: var(--mono);
    font-size: 14px;
  }
  .kv-row small {
    color: ${unsafeCSS(C.mute)};
    margin-left: 6px;
  }
  .frame {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 6px 0 2px;
  }
  .frame div {
    border-radius: 6px;
    padding: 2px 3px;
    font-family: var(--mono);
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid;
  }
  .frame button.oct {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    border-radius: 4px;
    padding: 0 2px;
    cursor: pointer;
  }
  .frame button.oct:hover,
  .frame button.oct:focus-visible {
    background: var(--f);
    color: #fff;
  }
  /* Opens the telegram details: set apart from the octets by its colour and its icon. */
  .frame .btn.details {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 4px;
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px 3px 8px;
    border-radius: 999px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  }
  .frame .btn.details svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .frame .btn.details:hover {
    filter: brightness(1.1);
  }
  .sep {
    border-top: 1px solid #ecebe5;
    margin-top: 6px;
    padding-top: 5px;
    font-size: 12.5px;
  }
  .sep .why {
    font-size: 11.5px;
    color: ${unsafeCSS(C.mute)};
    margin: -1px 0 3px;
  }
  .sep .line {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .badge {
    font-size: 11.5px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 10px;
    border: 1.5px solid ${unsafeCSS(C.tg)};
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .err {
    border: 1.5px solid ${unsafeCSS(C.red)};
    background: #fdf1ee;
    color: ${unsafeCSS(C.red)};
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13.5px;
    white-space: pre-wrap;
    font-family: var(--mono);
  }
  @media (prefers-reduced-motion: reduce) {
    /* Decorative effects removed; telegrams continue to circulate. */
    .val.fresh {
      animation: none;
    }
    .cell,
    .coupler,
    .key,
    .lamp svg,
    .lamp svg .glass {
      transition: none;
    }
    .fanicon .blades {
      animation: none !important;
    }
  }
`;
