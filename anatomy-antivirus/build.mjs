import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import { STATIONS, SAMPLES, VECTORS, THRESHOLD, ENTROPY_WARN } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 1000;
const HEIGHT = 470;

// ---------- world ----------
const BENCH = { x: -348, y: -134, w: 704, d: 226, r: 10 };
const BELT_Z = 14;
const X = { intake: -270, hash: -165, unpack: -55, static: 55, emu: 165, verdict: 260, exit: 324 };
const GATE_X = -232;
const RACK = { zip: [-55, -86, 18], upx: [-55, -48, 18] };
const VAULT_IN = -46;

const P = k.fitProjection(
  [...k.boxCorners(BENCH, -20, 0), [X.unpack, -128, 134], [X.unpack, 40, 134], [-300, -46, 110], [X.verdict, -40, 108], [-348, 92, 0], [356, 92, 0]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 62 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const key = (p) => +k.depthOf(p, P).toFixed(2);
const poly = (points, closed = true) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);

// items: { band, k, svg, st?, mv? }
const items = [];
const add = (band, k0, svg, extra = {}) => items.push({ band, k: k0, svg, ...extra });

// ---------- band 0: bench ----------
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -20, 14, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BENCH, 26))) {
    out.push(S(k.cylinder(x, y, 8, -20, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -18.2, 4.2, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BENCH, -14, 14, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -7, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(BENCH, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  // ruler strip along the front edge
  const strip = { x: -300, y: BENCH.y + BENCH.d - 16, w: 640, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate, front-left corner
  const label = { x: 300, y: 42, w: 30, d: 20, r: 1.2 };
  out.push(S(slab(label, 0, 0.8, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  [[305, 48, 16], [305, 52, 11], [305, 56, 14]].forEach(([x, y, w]) => out.push(L(k.lineOnTop([x, y], [x + w, y], 0.8, P), { tone: "lo", free: true })));
  return out.join("");
}
add(0, -1e4, bench());

// ---------- band 2: conveyor ----------
function conveyor() {
  const out = [];
  out.push(S(slab({ x: -326, y: -26, w: 6, d: 52, r: 1 }, 0, 14, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: -322, y: -20, w: 624, d: 40, r: 0 }, 11, 3, 2), { tone: "lo", crease: "lo" }));
  // back rail with a gap at the vault
  for (const [x0, x1] of [[-322, 236], [284, 302]]) {
    out.push(S(slab({ x: x0, y: -26, w: x1 - x0, d: 6, r: 1 }, 0, 18, 3, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: x0, y: -26, w: x1 - x0, d: 6, r: 1 }, 9, P, 3), { tone: "faint" }) }));
    const bolts = [];
    for (let x = x0 + 8; x < x1 - 4; x += 40) bolts.push(at([x, -23, 18]));
    out.push(D(bolts, { size: 0.45, tone: "lo" }));
  }
  // bridge into the vault
  out.push(S(slab({ x: 238, y: -36, w: 44, d: 16, r: 0 }, 0, 14, 2, 0.4), { tone: "mid" }));
  out.push(L([0, 1, 2, 3].map((i) => k.lineOnTop([242 + i * 12, -36], [242 + i * 12, -20], 14, P)).join(""), { tone: "faint" }));
  out.push(S(slab({ x: 302, y: -26, w: 4, d: 52, r: 0.8 }, 0, 14, 3, 0.4), { tone: "mid" }));
  // exit tray
  const tray = { x: 306, y: -26, w: 42, d: 52, r: 2 };
  out.push(S(slab(tray, 0, 8, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 3), 8, P, 4), { tone: "lo" }));
  out.push(D(k.corners(tray, 5).map(([x, y]) => at([x, y, 8])), { size: 0.45 }));
  return out.join("");
}
add(2, -9000, conveyor());

// belt slats: one path clipped to the belt, translated by the belt offset
const BELT_TOP = [[-322, -20, 14], [302, -20, 14], [302, 20, 14], [-322, 20, 14]];
const slats = [];
for (let x = -336; x <= 314; x += 12) slats.push(k.lineOnTop([x, -20], [x, 20], 14, P));
add(2, -8999, `<defs><clipPath id="belt-clip"><path d="${poly(BELT_TOP)}"/></clipPath></defs><g clip-path="url(#belt-clip)"><g data-belt>${L(slats.join(""), { tone: "faint" })}</g></g>`);

// front rail (band 4)
{
  const rail = { x: -322, y: 20, w: 624, d: 6, r: 1 };
  const bolts = [];
  for (let x = -314; x < 300; x += 40) bolts.push(at([x, 23, 18]));
  add(4, 0, S(slab(rail, 0, 18, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(rail, 9, P, 3), { tone: "faint" }) }) + D(bolts, { size: 0.45, tone: "lo" }));
}

// ---------- gantry helper ----------
function gantry(st, x, yBack, yFront, top, extra = "") {
  const post = (y) => S(slab({ x: x - 4, y, w: 8, d: 6, r: 1 }, 0, top, 3, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: x - 4, y, w: 8, d: 6, r: 1 }, 12, P, 3), { tone: "faint" }) });
  const foot = (y) => S(slab({ x: x - 8, y: y - 3, w: 16, d: 12, r: 1.5 }, 0, 3, 3, 0.4), { tone: "lo" }) + D([at([x - 5, y + 3, 3]), at([x + 5, y + 3, 3])], { size: 0.45 });
  const back = foot(yBack) + post(yBack);
  const front = foot(yFront) + post(yFront);
  const beamPlan = { x: x - 6, y: yBack - 2, w: 12, d: yFront - yBack + 10, r: 1.5 };
  const beam = S(slab(beamPlan, top, 8, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(beamPlan, top + 4, P, 3), { tone: "faint" }) }) + D([at([x, yBack + 3, top + 8]), at([x, yFront + 3, top + 8])], { size: 0.5 }) + extra;
  add(1, key([x, yBack + 3, top / 2]), back, { st });
  const frontKey = key([x, yFront + 3, top / 2]);
  add(5, frontKey, front, { st });
  return { frontKey, beam: (more = "") => add(5, frontKey + 40, beam + more, { st }) };
}

// ---------- station 0: arrival devices (mail, USB, web) ----------
const DEV = { mail: [-326, 56, 40], usb: [-298, 56, 34], web: [-270, 60, 46] };
{
  // mailbox
  const [mx, my] = DEV.mail;
  const box = { x: mx - 11, y: my - 9, w: 22, d: 18, r: 3 };
  const out = [S(k.cylinder(mx, my, 6, 0, 1.6, P, 24), { tone: "lo" }), S(k.cylinder(mx, my, 2, 1.6, 18.4, P, 14), { tone: "mid", crease: "none" })];
  out.push(S(slab(box, 20, 18, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(box, 24, P, 6), { tone: "faint" }) }));
  out.push(L(poly([[mx - 7, my + 9, 33], [mx + 7, my + 9, 33], [mx + 7, my + 9, 31], [mx - 7, my + 9, 31]]), { tone: "lo" }));
  out.push(S(k.cylinder(mx - 4, my, 2.6, 38, 1.6, P, 18), { tone: "mid" }), `<path class="av-glow" data-glow="mail" d="${k.ring(mx - 4, my, 1.9, 39.6, P, 18)}"/>`);
  out.push(D(k.corners(box, 3).map(([cx, cy]) => at([cx, cy, 38])), { size: 0.4 }));
  add(5, key([mx, my, 20]), out.join(""), { st: "arrive" });
  add(5, key([mx + 12, my, 30]), S(slab({ x: mx + 11, y: my - 4, w: 1.4, d: 2, r: 0.3 }, 22, 12, 2, 0), { tone: "mid", crease: "none" }), { st: "arrive" });
  add(5, 0, S(slab({ x: mx + 11.2, y: my - 4, w: 1.4, d: 9, r: 0.4 }, 0, 5, 2, 0), { tone: "hi", lit: true }), { mv: "flag", st: "arrive" });
  // USB hub with a stick
  const [ux, uy] = DEV.usb;
  const hub = { x: ux - 12, y: uy - 9, w: 24, d: 18, r: 2 };
  const ho = [S(slab(hub, 0, 10, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(hub, 4, P, 3), { tone: "faint" }) })];
  ho.push(L(poly([[ux - 9, uy + 9, 7], [ux - 2, uy + 9, 7], [ux - 2, uy + 9, 5], [ux - 9, uy + 9, 5]]) + poly([[ux + 2, uy + 9, 7], [ux + 9, uy + 9, 7], [ux + 9, uy + 9, 5], [ux + 2, uy + 9, 5]]), { tone: "lo" }));
  ho.push(L(k.planOutline({ x: ux - 5, y: uy - 3, w: 10, d: 6, r: 0.5 }, 10, P, 2), { tone: "lo" }));
  ho.push(`<path class="av-glow" data-glow="usb" d="${k.ring(ux + 8, uy - 5, 1.3, 10, P, 14)}"/>`, D([at([ux + 8, uy - 5, 10])], { size: 0.5, tone: "lo" }));
  add(5, key([ux, uy, 5]), ho.join(""), { st: "arrive" });
  add(5, 0, S(slab({ x: ux - 3, y: uy - 1.6, w: 6, d: 3.2, r: 0.3 }, 0, 5, 2, 0), { tone: "lo", crease: "none" }) + S(slab({ x: ux - 4.5, y: uy - 2.5, w: 9, d: 5, r: 1.4 }, 5, 16, 3, 0.5), { tone: "hi", lit: true, inner: L(k.sideSeam({ x: ux - 4.5, y: uy - 2.5, w: 9, d: 5, r: 1.4 }, 17, P, 3), { tone: "faint" }) }) + L(k.ring(ux, uy, 1, 21, P, 12), { tone: "lo" }), { mv: "stick", st: "arrive" });
  // globe on a stand (internet)
  const [wx, wy, wz] = DEV.web;
  const c = [wx, wy, wz - 10];
  const go = [S(k.cylinder(wx, wy, 8, 0, 2, P, 32, 0.4), { tone: "lo" }), S(k.cylinder(wx, wy, 1.8, 2, wz - 19, P, 14), { tone: "mid", crease: "none" })];
  go.push(S(G.sphereOf(c, 9, P), { tone: "mid" }));
  const Fz = G.frameAlong(c, [0, 0, 1]);
  const lat = Math.sqrt(81 - 20.25);
  const arcs = [G.arcOf(Fz, 0, 9, P), G.arcOf(Fz, 4.5, lat, P, { slope: -4.5 / lat }), G.arcOf(Fz, -4.5, lat, P, { slope: 4.5 / lat })];
  for (const a of [[1, 0, 0], [0, 1, 0], [0.7071, 0.7071, 0], [0.7071, -0.7071, 0]]) arcs.push(G.arcOf(G.frameAlong(c, a), 0, 9, P));
  go.push(L(arcs.join(""), { tone: "lo" }));
  go.push(S(k.cylinder(wx, wy, 1.2, wz - 1, 3, P, 12), { tone: "mid" }), `<path class="av-glow" data-glow="web" d="${k.ring(wx, wy, 1, wz + 2, P, 12)}"/>`);
  add(5, key([wx, wy, 18]), go.join(""), { st: "arrive" });
}

// ---------- station 1: intake ----------
{
  const g = gantry("intake", X.intake, -42, 36, 104);
  const hopper = { x: X.intake - 26, y: -26, w: 52, d: 52, r: 2 };
  const hop = S(slab(hopper, 74, 30, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(hopper, 80, P, 4) + k.sideSeam(hopper, 98, P, 4), { tone: "faint" }) });
  const lamp = S(k.cylinder(X.intake + 14, 18, 3, 104, 3, P, 20), { tone: "mid" }) + `<path class="av-glow" data-glow="intake" d="${k.ring(X.intake + 14, 18, 2.2, 107, P, 20)}"/>`;
  add(5, g.frontKey + 20, hop, { st: "intake" });
  g.beam(lamp);
  // gate frame
  const guide = (y) => S(slab({ x: GATE_X - 2, y, w: 5, d: 5, r: 0.8 }, 0, 60, 3, 0.4), { tone: "mid" });
  add(1, key([GATE_X, -30, 30]), guide(-32), { st: "intake" });
  add(5, key([GATE_X, 29, 30]), guide(27), { st: "intake" });
  add(5, key([GATE_X, 29, 30]) + 30, S(slab({ x: GATE_X - 3, y: -34, w: 7, d: 68, r: 1 }, 60, 5, 3, 0.5), { tone: "mid" }) + D([at([GATE_X + 0.5, -29.5, 65]), at([GATE_X + 0.5, 29.5, 65])], { size: 0.45 }), { st: "intake" });
}
// gate plate (mover)
const gatePlate = { x: -1.2, y: -20, w: 2.4, d: 40, r: 0.5 };
add(3, 0, S(slab(gatePlate, 0, 30, 2, 0.3), { tone: "hi", lit: true, inner: L(k.sideSeam(gatePlate, 10, P, 2) + k.sideSeam(gatePlate, 20, P, 2), { tone: "faint" }) }), { mv: "gate", st: "intake" });

// ---------- station 2: hash press + signature cabinet ----------
{
  const x = X.hash;
  const g = gantry("hash", x, -42, 36, 98);
  const housing = S(k.cylinder(x, 0, 10, 62, 36, P, 40, 0.5), { tone: "mid", inner: L(k.sideArc(x, 0, 10, 70, P, 30) + k.sideArc(x, 0, 10, 90, P, 30), { tone: "faint" }) }) + L(k.knurl(x, 0, 10, 72, 88, 44, P), { tone: "lo" });
  add(5, g.frontKey + 20, housing, { st: "hash" });
  g.beam();
  // cabinet of signatures
  const cab = { x: x - 40, y: -118, w: 80, d: 44, r: 2 };
  const out = [`<path class="iso-halo" d="${k.haloOf(cab, 0, 64, P)}"/>`, S(slab(cab, 0, 64, 4, 0.8), { tone: "mid" })];
  const pulls = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue;
      out.push(drawerFront(x - 37 + c * 25.5, 6 + r * 19));
    }
  }
  out.push(L(k.planOutline(k.insetPlan(cab, 4), 64, P, 4), { tone: "lo" }));
  out.push(D(k.corners(cab, 7).map(([cx, cy]) => at([cx, cy, 64])), { size: 0.5 }));
  // cloud mast with dish
  out.push(S(k.cylinder(x - 26, -106, 4, 64, 3, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(x - 26, -106, 1.4, 67, 22, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x - 26, -106, 8, 89, 1.6, P, 36, 0.4), { tone: "mid" }));
  out.push(L(k.ring(x - 26, -106, 5, 90.6, P, 30) + k.ring(x - 26, -106, 2.4, 90.6, P, 20), { tone: "lo" }));
  out.push(D([at([x - 26, -106, 90.6])], { size: 0.7, tone: "hi" }));
  // verdict lamp on top
  out.push(S(k.cylinder(x + 24, -100, 5, 64, 4, P, 24), { tone: "mid" }));
  out.push(`<path class="av-glow" data-glow="hash" d="${k.ring(x + 24, -100, 3.8, 68, P, 24)}"/>`);
  // cable from post to cabinet
  out.push(k.wireSvg(at([x, -42, 60]), at([x, -74, 50]), { via: [at([x, -58, 58])], tone: "lo" }));
  add(1, key([x, -96, 32]), out.join(""), { st: "hash" });
}
function drawerFront(x0, z0) {
  const front = { x: x0, y: -74, w: 23, d: 2.5, r: 0.6 };
  const cx = x0 + 11.5;
  const pull = { x: cx - 3.5, y: -71.5, w: 7, d: 1.6, r: 0.6 };
  return (
    S(slab(front, z0, 16, 2, 0.3), { tone: "mid" }) +
    L(poly([[cx - 5, -71.5, z0 + 13], [cx + 5, -71.5, z0 + 13], [cx + 5, -71.5, z0 + 10], [cx - 5, -71.5, z0 + 10]]), { tone: "lo" }) +
    S(slab(pull, z0 + 4, 2.4, 2, 0), { tone: "mid", crease: "none" })
  );
}
// lookup drawer (mover): built in place at the middle slot, slides +y
add(1, 0, `<g data-drawerbody></g>`, { mv: "drawerbody", st: "hash" });
add(1, 0, drawerFront(X.hash - 37 + 25.5, 25), { mv: "drawer", st: "hash" });

// ---------- station 3: unpacking gantry and rack ----------
{
  const x = X.unpack;
  const g = gantry("unpack", x, -126, 36, 126);
  // rack (staging shelf for peeled layers)
  const rack = { x: x - 28, y: -110, w: 56, d: 80, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(rack, 0, 18, P)}"/>`, S(slab(rack, 0, 18, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(rack, 9, P, 4), { tone: "faint" }) })];
  out.push(L(k.planOutline({ x: x - 23, y: -106, w: 46, d: 40, r: 2.5 }, 18, P, 4), { tone: "lo" }));
  out.push(L(k.ring(x, RACK.upx[1], 17, 18, P, 40), { tone: "lo" }));
  out.push(D(k.corners(rack, 4).map(([cx, cy]) => at([cx, cy, 18])), { size: 0.45 }));
  add(1, key([x, -70, 9]), out.join(""), { st: "unpack" });
  // sensor head on the front post
  const sensor = { x: x - 9, y: 26, w: 18, d: 8, r: 1.5 };
  add(5, g.frontKey + 5, S(slab(sensor, 34, 10, 3, 0.5), { tone: "mid" }) + S(k.cylinder(x + 4, 30, 2.4, 44, 2, P, 18), { tone: "mid" }) + `<path class="av-glow" data-glow="sensor" d="${k.ring(x + 4, 30, 1.7, 46, P, 18)}"/>` + D([at([x - 6, 30, 44])], { size: 0.45 }), { st: "unpack" });
  g.beam(L(k.lineOnTop([x - 3, -120], [x - 3, 40], 134, P) + k.lineOnTop([x + 3, -120], [x + 3, 40], 134, P), { tone: "faint" }));
}
// trolley and gripper (movers)
add(3, 0, S(slab({ x: -8, y: -8, w: 16, d: 16, r: 1.5 }, -8, 8, 3, 0.5), { tone: "mid" }) + D([at([-5, 8, -4]), at([5, 8, -4])], { size: 0.55 }), { mv: "trolley", st: "unpack" });
add(3, 0, `<path class="iso-line" data-tone="mid" data-cable d=""/>`, { mv: "cable", st: "unpack" });
{
  const head = { x: -9, y: -7, w: 18, d: 14, r: 1.5 };
  const finger = (fx) => S(slab({ x: fx, y: -3, w: 2.4, d: 6, r: 0.4 }, 0, 9, 2, 0), { tone: "hi", lit: true });
  add(3, 0, finger(-10.4) + S(slab(head, 7, 8, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(head, 11, P, 3), { tone: "faint" }) }) + finger(8) + D([at([-6, 7, 15]), at([6, 7, 15])], { size: 0.45 }), { mv: "gripper", st: "unpack" });
}

// ---------- station 4: signature comb + entropy dial ----------
const PIN_Y = Array.from({ length: 9 }, (_, i) => -12 + i * 3);
{
  const x = X.static;
  const g = gantry("static", x, -42, 36, 92);
  const hanger = { x: x - 6, y: -18, w: 12, d: 36, r: 1.2 };
  const comb = S(slab({ x: x - 3, y: -4, w: 6, d: 8, r: 1 }, 82, 10, 2, 0.3), { tone: "mid" }) + S(slab(hanger, 74, 8, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(hanger, 78, P, 3), { tone: "faint" }) }) + D(PIN_Y.map((y) => at([x + 3.5, y, 82])), { size: 0.35, tone: "lo" });
  add(5, g.frontKey + 20, comb, { st: "static" });
  g.beam();
  // entropy dial at the front
  const [dx, dy] = [X.static + 26, 60];
  const R = 15, TOP = 38;
  const out = [];
  out.push(S(k.cylinder(dx, dy, 7, 0, 2, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(dx, dy, 2.6, 2, TOP - 8 - 2, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(dx, dy, R, TOP - 8, 8, P, 56, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(dx, dy, R, TOP - 3, TOP, 70, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(dx, dy, R, TOP - 3, P, 36), { tone: "faint" }));
  out.push(L(k.ring(dx, dy, R - 2, TOP, P, 56), { tone: "lo" }));
  const span = Math.PI * 1.5;
  const from = -span / 2;
  const t = k.radialTicks(dx, dy, R - 2.6, 40, 5, TOP, [1.1, 2.4], P, from, span);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const warn = from + (ENTROPY_WARN / 8) * span;
  const warnArc = [];
  for (let a = warn; a <= from + span + 1e-6; a += (from + span - warn) / 8) warnArc.push([dx + Math.sin(a) * (R - 2.6), dy - Math.cos(a) * (R - 2.6)]);
  out.push(L(k.onTop(warnArc, TOP, P), { tone: "red" }));
  out.push(L(k.ring(dx, dy, 1.3, TOP, P, 14), { tone: "mid" }));
  add(5, key([dx, dy, 20]), out.join(""), { st: "static" });
  add(5, key([dx, dy, 20]) + 1, `<path class="iso-line" data-tone="lit" data-free="start" data-needle="entropy" style="stroke-width:1.1" d=""/>`, { st: "static" });
}
// pins (movers)
PIN_Y.forEach((y, i) => {
  add(3, 0, S(k.cylinder(0, 0, 1.1, 0, 12, P, 12), { tone: "mid", crease: "none" }) + S(k.cylinder(0, 0, 1.6, 0, 1.2, P, 12), { tone: "mid" }), { mv: `pin${i}`, st: "static" });
});

// ---------- station 5: emulation chamber ----------
const LAMPS = [];
{
  const x = X.emu;
  const wall = { x: x - 30, y: -40, w: 60, d: 5, r: 1 };
  const out = [S(slab(wall, 0, 78, 3, 0.6), { tone: "mid" })];
  out.push(L(poly([[x - 26, -35, 30], [x + 26, -35, 30], [x + 26, -35, 72], [x - 26, -35, 72]]), { tone: "lo" }));
  let i = 0;
  for (const z of [62, 44]) {
    for (const lx of [x - 16, x, x + 16]) {
      const F = G.frameAlong([lx, -35, z], [0, 1, 0]);
      out.push(S(G.disc(0, 1.6, 4.6, F, P), { tone: "mid" }));
      out.push(S(G.disc(1.6, 2.6, 3.2, F, P), { tone: "lo" }));
      out.push(`<path class="av-glow" data-glow="lamp${i}" d="${G.circleOf(F, 2.6, 3, P)}"/>`);
      LAMPS.push([lx, z]);
      i++;
    }
  }
  // hook bus: a cable along the wall under the lamps
  out.push(L(poly([[x - 26, -35, 36], [x + 26, -35, 36]], false), { tone: "faint" }));
  add(1, key([x, -38, 39]), out.join(""), { st: "emu" });
  const post = (px) => S(slab({ x: px, y: 34, w: 6, d: 6, r: 1 }, 0, 78, 3, 0.4), { tone: "mid" });
  const fk = key([x, 37, 39]);
  add(5, fk, post(x - 30) + post(x + 24), { st: "emu" });
  const roof = { x: x - 32, y: -44, w: 64, d: 26, r: 2 };
  const vents = [];
  for (let v = 0; v < 6; v++) vents.push(k.planOutline({ x: x - 22 + v * 8, y: -38, w: 3, d: 14, r: 1.5 }, 84, P, 3));
  const lintel = { x: x - 31, y: 33, w: 62, d: 8, r: 1 };
  const spine = { x: x - 3, y: -18, w: 6, d: 51, r: 0.8 };
  add(1, key([x, -31, 81]) + 30, S(slab(roof, 78, 6, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(roof, 81, P, 4), { tone: "faint" }) }) + L(vents.join(""), { tone: "lo" }) + D(k.corners(roof, 4).map(([cx, cy]) => at([cx, cy, 84])), { size: 0.45 }), { st: "emu" });
  add(5, fk + 40, S(slab(spine, 79, 4, 2, 0.3), { tone: "mid" }) + S(slab(lintel, 78, 6, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(lintel, 81, P, 3), { tone: "faint" }) }) + S(k.cylinder(x + 20, 37, 3.4, 84, 4, P, 24), { tone: "mid" }) + `<path class="av-glow" data-glow="beacon" d="${k.ring(x + 20, 37, 2.6, 88, P, 24)}"/>` + D([at([x - 27, 37, 84]), at([x + 27, 37, 84])], { size: 0.45 }), { st: "emu" });
  // probe lamp hanging from the roof (drawn in band 3, above the file)
  const lampF = G.frameAlong([x, 0, 79], [0, 0, -1]);
  add(3, key([x, 0, 70]) + 200, S(G.solidOf([[0, 7], [3, 7], [5, 5, 1], [8, 3]], lampF, P), { tone: "mid" }), { st: "emu" });
}

// ---------- station 6: verdict column, pusher, vault ----------
{
  const x = X.verdict;
  // vault
  const vault = { x: x - 26, y: -124, w: 52, d: 88, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(vault, 0, 74, P)}"/>`, S(slab(vault, 0, 74, 4, 1.2), { tone: "mid", inner: L(k.sideSeam(vault, 8, P, 4) + k.sideSeam(vault, 66, P, 4), { tone: "faint" }) })];
  // opening on the front face y = -36
  const op = [[x - 20, -36, 14], [x + 22, -36, 14], [x + 22, -36, 52], [x - 20, -36, 52]];
  out.push(`<defs><clipPath id="vault-open"><path d="${poly(op)}"/></clipPath></defs>`);
  out.push(`<path class="av-cavity" d="${poly(op)}"/>`);
  out.push(`<g clip-path="url(#vault-open)"><path class="iso-top" d="${poly([[x - 20, -36, 14], [x + 22, -36, 14], [x + 22, -110, 14], [x - 20, -110, 14]])}"/><path class="iso-shade" data-shade="1" d="${poly([[x - 20, -36, 14], [x - 20, -110, 14], [x - 20, -110, 52], [x - 20, -36, 52]])}"/></g>`);
  out.push(L(poly(op), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(vault, 5), 74, P, 4), { tone: "lo" }));
  const rivets = [];
  for (let rx = x - 22; rx <= x + 22; rx += 5.5) rivets.push(at([rx, -42, 74]));
  out.push(D(rivets, { size: 0.45, tone: "lo" }));
  // hazard label plate on top
  const plate = { x: x - 12, y: -100, w: 24, d: 16, r: 1.2 };
  out.push(S(slab(plate, 74, 0.8, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 74.8, P), { tone: "faint" }));
  [[-96, 14], [-92, 9], [-88, 12]].forEach(([y, w]) => out.push(L(k.lineOnTop([x - 8, y], [x - 8 + w, y], 74.8, P), { tone: "lo", free: true })));
  add(1, key([x, -80, 37]), out.join(""), { st: "verdict" });
  // guides and header for the guillotine door
  const guide = (gx) => S(slab({ x: gx, y: -38, w: 5, d: 6, r: 0.8 }, 0, 106, 3, 0.4), { tone: "mid" });
  add(1, key([x - 26, -35, 53]) + 30, guide(x - 27), { st: "verdict" });
  add(1, key([x + 26, -35, 53]) + 30, guide(x + 22), { st: "verdict" });
  add(1, key([x, -35, 108]) + 60, S(slab({ x: x - 29, y: -40, w: 58, d: 8, r: 1 }, 106, 6, 3, 0.6), { tone: "mid" }) + D([at([x - 24, -32, 112]), at([x + 24, -32, 112])], { size: 0.45 }), { st: "verdict" });
  // pusher body on a stand at the front
  const body = { x: x - 12, y: 34, w: 24, d: 28, r: 3 };
  const pb = [S(slab({ x: x - 8, y: 38, w: 16, d: 20, r: 1.5 }, 0, 18, 3, 0.4), { tone: "lo" }), S(slab(body, 18, 14, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(body, 25, P, 4), { tone: "faint" }) })];
  pb.push(S(k.cylinder(x + 6, 54, 2.2, 32, 3, P, 16), { tone: "mid" }), S(k.cylinder(x - 6, 54, 2.2, 32, 3, P, 16), { tone: "mid" }));
  pb.push(D([at([x - 9, 37, 32]), at([x + 9, 37, 32])], { size: 0.45 }));
  add(5, key([x, 48, 16]), pb.join(""), { st: "verdict" });
  // score column
  const col = { x: x - 48, y: 44, w: 12, d: 12, r: 1.5 };
  const cout = [S(k.cylinder(x - 42, 50, 10, 0, 2, P, 32), { tone: "lo" }), S(slab(col, 2, 86, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(col, 10 + THRESHOLD * 60, P, 3), { tone: "red" }) })];
  const strip = { x: x - 46, y: 56, w: 7, d: 0.8, r: 0 };
  cout.push(S(slab(strip, 8, 64, 2, 0), { tone: "lo", crease: "none" }));
  const minor = [];
  const major = [];
  for (let i = 0; i <= 20; i++) {
    const z = 10 + i * 3;
    const len = i % 5 === 0 ? 4.4 : 2.4;
    (i % 5 === 0 ? major : minor).push(poly([[strip.x + strip.w, 56.8, z], [strip.x + strip.w - len, 56.8, z]], false));
  }
  cout.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  cout.push(S(k.cylinder(x - 42, 50, 5.5, 88, 5, P, 24), { tone: "mid" }), `<path class="av-glow" data-glow="verdict" d="${k.ring(x - 42, 50, 4.4, 93, P, 24)}"/>`);
  const ck = key([x - 42, 50, 44]);
  add(5, ck, cout.join(""), { st: "verdict" });
  add(5, ck + 0.5, S(slab({ x: -9, y: -9, w: 18, d: 18, r: 2 }, 0, 6, 3, 0.6), { tone: "hi", lit: true }) + D([at([-6, 9, 3]), at([6, 9, 3])], { size: 0.4 }), { mv: "slider", st: "verdict" });
}
// door (mover)
{
  const door = { x: -21, y: -36, w: 44, d: 4, r: 0.6 };
  const F = G.frameAlong([1, -32, 21], [0, 1, 0]);
  const rim = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    rim.push(poly([[1 + Math.cos(a) * 2, -32, 21 + Math.sin(a) * 2], [1 + Math.cos(a) * 8, -32, 21 + Math.sin(a) * 8]], false));
  }
  add(1, 0, S(slab(door, 0, 40, 2, 0.6), { tone: "mid", inner: L(k.sideSeam(door, 6, P, 2) + k.sideSeam(door, 34, P, 2), { tone: "faint" }) }) + L(G.circleOf(F, 0, 8, P) + G.circleOf(F, 0, 2, P) + rim.join(""), { tone: "lo" }) + D([[-17, 4], [19, 4], [-17, 36], [19, 36]].map(([dx, dz]) => at([dx, -32, dz])), { size: 0.5 }), { mv: "door", st: "verdict" });
}
// pusher plate + rod (movers)
add(4.5, 0, S(slab({ x: -14, y: 0, w: 28, d: 3, r: 0.8 }, 19, 17, 2, 0.5), { tone: "hi", lit: true }) + D([at([-10, 3, 36]), at([10, 3, 36])], { size: 0.4 }), { mv: "plate", st: "verdict" });
add(4.4, 0, `<g data-rod></g>`, { mv: "rod", st: "verdict" });

// ---------- the file: layers ----------
const LAYER = {
  zip: { top: 39, h: 39, svg: crate() },
  upx: { top: 28, h: 28, svg: canister() },
  pe: { top: 19, h: 19, svg: core() },
  pdf: { top: 11, h: 11, svg: pdf() },
  eicar: { top: 15, h: 15, svg: eicar() },
};
function crate() {
  const sleeve = { x: -21, y: -19, w: 42, d: 38, r: 2 };
  const lid = { x: -22, y: -20, w: 44, d: 40, r: 2.5 };
  const label = { x: -15, y: 3, w: 20, d: 12, r: 1 };
  return [
    `<path class="iso-halo" d="${k.haloOf(sleeve, 0, 1, P)}" style="filter:blur(3px)"/>`,
    S(slab(sleeve, 0, 31, 4, 0.6), { tone: "hi", inner: L(k.sideSeam(sleeve, 7, P, 4) + k.sideSeam(sleeve, 24, P, 4), { tone: "faint" }) }),
    S(slab(lid, 31, 4, 4, 1), { tone: "hi" }),
    L(k.planOutline(k.insetPlan(lid, 3), 35, P, 4), { tone: "faint" }),
    S(slab(label, 35, 0.6, 3), { tone: "lo" }),
    ...[[6, 14], [9, 9], [12, 12]].map(([y, w]) => L(k.lineOnTop([-12, y], [-12 + w, y], 35.6, P), { tone: "lo", free: true })),
    S(k.cylinder(6, -8, 4.2, 35, 1.4, P, 20), { tone: "mid" }),
    S(k.cylinder(6, -8, 2.4, 36.4, 2.6, P, 16), { tone: "mid" }),
    D(k.corners(lid, 3).map(([cx, cy]) => at([cx, cy, 35])), { size: 0.45 }),
  ].join("");
}
function canister() {
  const dots = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    dots.push(at([Math.sin(a) * 12.5, -Math.cos(a) * 12.5, 24]));
  }
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: -15, y: -15, w: 30, d: 30, r: 15 }, 0, 1, P)}" style="filter:blur(3px)"/>`,
    S(k.cylinder(0, 0, 15.5, 0, 24, P, 56, 0.6), { tone: "hi", inner: L(k.sideArc(0, 0, 15.5, 6, P, 40) + k.sideArc(0, 0, 15.5, 18, P, 40), { tone: "faint" }) }),
    L(k.knurl(0, 0, 15.5, 0.6, 6, 64, P) + k.knurl(0, 0, 15.5, 18, 23.4, 64, P), { tone: "lo" }),
    L(k.ring(0, 0, 14, 24, P, 48), { tone: "lo" }),
    D(dots, { size: 0.45 }),
    S(k.cylinder(0, 0, 4.4, 24, 1.4, P, 20), { tone: "mid" }),
    S(k.cylinder(0, 0, 2.4, 25.4, 2.6, P, 16), { tone: "mid" }),
  ].join("");
}
function core() {
  const plan = { x: -11, y: -9, w: 22, d: 18, r: 1 };
  const cuts = [[0, 4], [4, 3], [7, 4], [11, 6]]; // .rsrc .data .rdata .text (bottom to top)
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 1, P)}" style="filter:blur(3px)"/>`];
  cuts.forEach(([z, h], i) => out.push(`<g data-sec="${3 - i}">${S(slab(plan, z, h, 2, 0.3), { tone: "hi" })}</g>`));
  const head = k.insetPlan(plan, 1.2);
  out.push(S(slab(head, 17, 2, 2, 0.4), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([-1, 1.4], 19, P, "x"), "MZ", { size: 6, tone: "mid", anchor: "middle" }));
  out.push(D(k.corners(head, 1.6).map(([cx, cy]) => at([cx, cy, 19])), { size: 0.4 }));
  return out.join("");
}
function pdf() {
  const plan = { x: -15, y: -11, w: 30, d: 22, r: 0.8 };
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 1, P)}" style="filter:blur(3px)"/>`];
  [0, 2.5, 5, 7.5].forEach((z, i) => out.push(`<g data-sec="${3 - i}">${S(slab(k.insetPlan(plan, i * 0.3), z, 2.5, 2, 0.2), { tone: "hi" })}</g>`));
  out.push(S(slab(k.insetPlan(plan, 1.2), 10, 1, 2, 0.3), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([0, 1.4], 11, P, "x"), "%PDF", { size: 5, tone: "mid", anchor: "middle" }));
  return out.join("");
}
function eicar() {
  const plan = { x: -9, y: -9, w: 18, d: 18, r: 1.5 };
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, 1, P)}" style="filter:blur(3px)"/>`,
    `<g data-sec="0">${S(slab(plan, 0, 13, 3, 0.4), { tone: "hi", inner: L(k.sideSeam(plan, 6.5, P, 3), { tone: "faint" }) })}</g>`,
    S(slab(k.insetPlan(plan, 1.2), 13, 2, 3, 0.4), { tone: "hi" }),
    k.faceTextSvg(k.topMatrix([0, 1.2], 15, P, "x"), "X5O!", { size: 4.4, tone: "mid", anchor: "middle" }),
  ].join("");
}
for (const [id, layer] of Object.entries(LAYER)) add(3, 0, layer.svg, { mv: id, st: "file" });

// ---------- assemble ----------
items.forEach((item, i) => (item.i = i));
const sorted = [...items].sort((a, b) => a.band - b.band || a.k - b.k || a.i - b.i);
const scene = sorted
  .map((item) => `<g data-it data-band="${item.band}" data-k="${item.k}"${item.st ? ` data-st="${item.st}"` : ""}${item.mv ? ` data-mv="${item.mv}"` : ""}>${item.svg}</g>`)
  .join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An antivirus engine drawn as an inspection conveyor on a workbench. A file arrives as a nested parcel through an intake gate, is stamped by a hash press next to a cabinet of signatures, has its archive and packer shells lifted off by a gantry onto a rack, is probed by a comb of signature pins and an entropy dial, runs inside an emulation chamber whose wall lamps light for each dangerous API call, and is weighed on a score column: above the threshold a pusher shoves it into a quarantine vault, below it the file rides on to the exit tray.",
  body: `<g data-scene>${scene}</g>`,
});

const stationCss = STATIONS.map((s) => `.av svg[data-focus="${s.id}"] [data-st="${s.id}"] .iso-edge{stroke:var(--anatomy-hi)}`).join("");

const CSS = `
.av-glow{fill:var(--glow,transparent);opacity:var(--on,0);transition:opacity .35s var(--anatomy-ease),fill .35s}
.av-cavity{fill:var(--anatomy-shade-0)}
${stationCss}
.av svg[data-focus] [data-st]:not([data-st="file"]) .iso-edge{transition:stroke .25s}
.av-ui{margin-top:18px;display:grid;gap:14px;font-size:13px}
.av-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.av-btn{appearance:none;border:0;background:var(--anatomy-card);color:var(--anatomy-text);box-shadow:0 0 0 1px var(--anatomy-lo);padding:7px 12px;font:inherit;font-size:12.5px;cursor:pointer;border-radius:0;transition:box-shadow .2s,color .2s}
.av-btn:hover{color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--anatomy-mid)}
.av-btn[aria-pressed="true"]{color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--anatomy-hi)}
.av-btn kbd{font-family:var(--anatomy-mono);font-size:10.5px;color:var(--anatomy-muted);margin-inline-start:6px}
.av-steps{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;direction:rtl}
.av-step{appearance:none;border:0;text-align:right;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);color:var(--anatomy-muted);padding:8px 10px;font:inherit;font-size:12px;cursor:pointer;line-height:1.35;border-radius:0;position:relative;overflow:hidden}
.av-step b{display:block;text-align:right;font-family:var(--anatomy-mono);font-weight:400;font-size:10.5px;letter-spacing:.06em;margin-bottom:2px}
.av-step[data-state="done"]{color:var(--anatomy-text)}
.av-step[data-state="now"]{color:var(--anatomy-strong);box-shadow:0 0 0 1px var(--anatomy-hi)}
.av-step[data-state="skip"]{opacity:.45}
.av-step i{position:absolute;inset:auto 0 0 0;height:2px;background:var(--anatomy-hi);transform-origin:right;transform:scaleX(var(--p,0))}
.av-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;direction:rtl}
.av-rtl{direction:rtl}
.av-q{color:var(--anatomy-muted);font-size:12.5px;min-width:96px}
.av-ico{font-size:14px;line-height:1}
.av-log[data-mode="simple"]>div:not(.t-he){display:none}
.av-log[data-mode="simple"] .t-he{font-size:13.5px;line-height:1.6;color:var(--anatomy-text);margin-bottom:6px}
.av-log .t-he.t-strong{color:var(--anatomy-strong)}
.av-log .t-he.t-bad{color:var(--anatomy-red)}
.av-log .t-he.t-good{color:var(--anatomy-green)}
.av-explain .av-plain{font-size:14.5px;color:var(--anatomy-strong);line-height:1.7;margin:0 0 10px}
.av-explain .av-tech{color:var(--anatomy-muted);font-size:12px;border-top:1px solid var(--anatomy-faint);padding-top:8px;margin:0}
.av-explain .av-tech b{font-weight:500;color:var(--anatomy-text)}
.av-explain .av-tip{margin-top:12px;padding:10px 12px;box-shadow:0 0 0 1px var(--anatomy-mid);color:var(--anatomy-strong)}

.av-card{background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);padding:14px 16px}
.av-explain{direction:rtl;text-align:right}
.av-explain h3{margin:0 0 6px;font-size:15px;color:var(--anatomy-strong);font-weight:600}
.av-explain h3 small{font-family:var(--anatomy-mono);font-size:10.5px;color:var(--anatomy-muted);font-weight:400;margin-inline-start:8px;letter-spacing:.06em}
.av-explain p{margin:0 0 8px}
.av-explain .av-real{color:var(--anatomy-muted);font-size:12px;border-top:1px solid var(--anatomy-faint);padding-top:8px;margin:0}
.av-log{font-family:var(--anatomy-mono);font-size:11px;line-height:1.55;height:280px;overflow:auto;direction:ltr;color:var(--anatomy-text);white-space:pre-wrap;word-break:break-word;scrollbar-width:thin}
.av-log div{animation:av-in .35s var(--anatomy-ease)}
.av-log .t-mid{color:var(--anatomy-muted)}
.av-log .t-hi{color:var(--anatomy-strong)}
.av-log .t-red{color:var(--anatomy-red)}
.av-log .t-green{color:var(--anatomy-green)}
.av-log .t-he{direction:rtl;text-align:right;font-family:ui-sans-serif,system-ui,sans-serif;color:var(--anatomy-muted)}
@keyframes av-in{from{opacity:0;transform:translateY(3px)}}
.av-title{direction:rtl;text-align:right;margin:0 0 18px}
.av-title h1{margin:0;font-size:22px;color:var(--anatomy-strong);font-weight:600;letter-spacing:-.01em}
.av-title p{margin:4px 0 0;color:var(--anatomy-muted)}
@media (max-width:760px){.av-steps{grid-template-columns:repeat(4,1fr)}.av-cols{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.av-log div{animation:none}.av-glow{transition:none}}
`;

const ui = `
<div class="av-ui">
  <div class="av-row av-rtl" role="group" aria-label="How did the file arrive">
    <span class="av-q">איך הקובץ הגיע?</span>
    ${VECTORS.map((v, i) => `<button class="av-btn" data-vector="${i}" aria-pressed="${i === 0}"><span class="av-ico">${v.icon}</span> ${v.he}</button>`).join("")}
  </div>
  <div class="av-row av-rtl" role="group" aria-label="Which file">
    <span class="av-q">איזה קובץ?</span>
    ${SAMPLES.map((s, i) => `<button class="av-btn" data-sample="${i}" aria-pressed="${i === 0}">${s.he}<kbd>${s.key}</kbd></button>`).join("")}
  </div>
  <div class="av-row av-rtl">
    <button class="av-btn" data-act="restart">↻ מההתחלה</button>
    <button class="av-btn" data-act="prev" aria-label="Previous station">▶ תחנה קודמת</button>
    <button class="av-btn" data-act="play" aria-pressed="true">⏸ השהה<kbd>space</kbd></button>
    <button class="av-btn" data-act="next" aria-label="Next station">תחנה הבאה ◀</button>
    <span style="flex:1"></span>
    <span class="av-q" style="min-width:0">יומן:</span>
    <button class="av-btn" data-mode="simple" aria-pressed="true">בשפה פשוטה</button>
    <button class="av-btn" data-mode="tech" aria-pressed="false">טכני</button>
  </div>
  <div class="av-steps">${STATIONS.map((s) => `<button class="av-step" data-step="${s.id}"><b dir="ltr">0${s.n} · ${s.en.toUpperCase()}</b>${s.he}<i></i></button>`).join("")}</div>
  <div class="av-cols">
    <div class="av-card av-explain" data-explain></div>
    <div class="av-card av-log" data-log data-mode="simple" aria-live="polite"></div>
  </div>
</div>`;

const body = `<header class="av-title"><h1>אנטומיה של אנטי-וירוס</h1><p>מה קורה בתוך המחשב מהרגע שקובץ מגיע – במייל, בדיסק און קי או בהורדה – ועד שהוא נפתח או ננעל בהסגר. כל מכונה כאן היא מנגנון אמיתי של אנטי-וירוס. במציאות כל זה קורה בשבריר שנייה עד כמה שניות; כאן הכול מואט כדי שנוכל לראות.</p></header>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "Antivirus scan line",
    hint: "hover a machine · click to jump · space pause",
    readout: "",
    keys: [
      { mark: "lit", label: "The file and what touches it: gate, die, gripper, pins, pusher" },
      { mark: "dim", label: "Front left: how it arrived – mailbox, USB hub, internet globe" },
      { mark: "raised", label: "Peeled shells: ZIP crate and UPX canister, parked on the rack" },
      { mark: "red", label: "Danger: entropy above 7.2, score above 0.70, behaviour lamps" },
      { mark: "green", label: "Clean verdict" },
    ],
    caption:
      "Each station is one mechanism of a real engine: on-access interception, hash and cloud reputation, file-type identification and unpacking, static signatures (YARA) and entropy, emulation with API hooks, and a machine-learning verdict that ends in quarantine. Sample hashes are illustrative except EICAR's, which is the real SHA-256 of the 68-byte test file.",
    body: `<div class="iso-stage av" tabindex="0" role="application" aria-label="Antivirus scan line: arrow keys step through stations, space pauses, 1 to 3 choose a file">${svg}</div>${ui}`,
  });

const CFG = {
  P,
  X,
  BELT_Z,
  GATE_X,
  RACK,
  VAULT_IN,
  PIN_Y,
  LAMPS,
  LAYER: Object.fromEntries(Object.entries(LAYER).map(([id, l]) => [id, { top: l.top, h: l.h }])),
  STATIONS,
  SAMPLES,
  VECTORS,
  DEV,
  THRESHOLD,
  ENTROPY_WARN,
  DIAL: { x: X.static + 26, y: 60, r: 15, top: 38 },
};
const live = `const CFG = ${JSON.stringify(CFG)};\n` + readFileSync(join(HERE, "live.js"), "utf8");
const name = theme === "light" ? "antivirus-light.html" : "antivirus.html";
const html = k.pageHtml({ title: "Antivirus anatomy", theme, body, script: kitScript() + live, width: 1040 }).replace("</style>", CSS + "</style>").replace('<html lang="en">', '<html lang="he">');
writeFileSync(join(HERE, name), html);
console.log("wrote", name, (html.length / 1024).toFixed(0) + " KB", items.length, "items");
