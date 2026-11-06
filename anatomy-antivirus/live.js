// ---------- live: timeline-driven antivirus scan line ----------
const P = CFG.P, X = CFG.X, BZ = CFG.BELT_Z;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const sceneEl = svg.querySelector("[data-scene]");
const readout = document.querySelector("[data-readout]");
const logEl = document.querySelector("[data-log]");
const explainEl = document.querySelector("[data-explain]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (sel, root = svg) => root.querySelector(sel);
const mv = {};
svg.querySelectorAll("[data-mv]").forEach((el) => (mv[el.dataset.mv] = el));
const beltEl = $("[data-belt]");
const cableEl = $("[data-cable]");
const rodEl = $("[data-rod]");
const needleEl = $('[data-needle="entropy"]');
const glow = {};
svg.querySelectorAll("[data-glow]").forEach((el) => (glow[el.dataset.glow] = el));
const LAYERS = ["zip", "upx", "pe", "pdf", "eicar"];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fall = (t) => {
  // gravity drop with one small bounce, ends at rest
  if (t < 0.7) { const u = t / 0.7; return u * u; }
  const u = (t - 0.7) / 0.3;
  return 1 - 0.06 * Math.sin(Math.PI * u) * (1 - u);
};

// ---------- state ----------
let S;
function fresh(sample) {
  const s = {
    sample, belt: 0, gate: 0, drawer: 0, ramZ: 56, gy: 0, gz: 96, plate: 27, door: 0, score: 0, entropy: 0,
    pin: CFG.PIN_Y.map(() => 0), pinLit: CFG.PIN_Y.map(() => 0), sec: -1,
    glow: { intake: 0, hash: 0, sensor: 0, beacon: 0, verdict: 0, ...Object.fromEntries(CFG.LAMPS.map((_, i) => ["lamp" + i, 0])) },
    tint: {}, attached: [...sample.layers], station: "intake", read: "", focusSec: -1,
  };
  for (const id of LAYERS) s[id] = [X.intake, 0, BZ + 74];
  return s;
}
const COLORS = { red: "var(--anatomy-red)", green: "var(--anatomy-green)", lit: "var(--anatomy-lit)", hi: "var(--anatomy-hi)", mid: "var(--anatomy-mid)" };

// ---------- tasks ----------
// a task: { dur, start?(S), step?(S, e), log?: [[text, tone]] }
const get = (path) => path.split(".").reduce((o, k) => o[k], S);
const set = (path, v) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; };
function tween(dur, targets, curve = ease, extra = {}) {
  let from = {};
  let to = {};
  return {
    dur,
    ...extra,
    start() {
      from = {}; to = {};
      for (const [p, v] of Object.entries(typeof targets === "function" ? targets(S) : targets)) {
        const cur = get(p);
        from[p] = Array.isArray(cur) ? [...cur] : cur;
        to[p] = v;
      }
      extra.begin && extra.begin(S);
    },
    step(_, e) {
      const t = curve(e);
      for (const p in to) {
        const a = from[p], b = to[p];
        if (Array.isArray(a)) set(p, a.map((x, i) => lerp(x, b[i] ?? x, t)));
        else set(p, lerp(a, b, t));
      }
    },
  };
}
const hold = (dur, extra = {}) => ({ dur, ...extra, start() { extra.begin && extra.begin(S); }, step() {} });
const log = (lines, dur = 0.6, extra = {}) => hold(dur, { log: lines, ...extra });
const doit = (fn, dur = 0) => hold(dur, { begin: fn });

// moving the attached stack along the belt
function moveTo(x, dur) {
  return tween(dur, (s) => {
    const t = { belt: s.belt + (x - s[s.attached[0]][0]) };
    for (const id of s.attached) t[id] = [x, s[id][1], s[id][2]];
    return t;
  });
}
const gateOpen = (v, dur = 0.45) => tween(dur, { gate: v ? 26 : 0 });
const glowTo = (name, v, color, dur = 0.3) => tween(dur, { ["glow." + name]: v }, ease, { begin: (s) => { if (color) s.tint[name] = color; } });

function topOf(s) {
  // world z of the top of the attached stack (outermost layer)
  const id = s.attached[0];
  return s[id][2] + CFG.LAYER[id].top;
}

// peel the outermost attached layer onto the rack
function peel(id, magic) {
  const L = CFG.LAYER[id];
  const [rx, ry, rz] = CFG.RACK[id];
  return [
    glowTo("sensor", 1, "lit", 0.25),
    log([["MAGIC  " + magic[0], "hi"], ["TYPE   " + magic[1], "mid"]], 1.1, { read: "magic " + magic[0] }),
    glowTo("sensor", 0, null, 0.25),
    tween(0.9, (s) => ({ gz: s[id][2] + L.top - 3 })),
    hold(0.2),
    tween(1.0, (s) => ({ gz: 100, [id]: [X.unpack, 0, 100 - L.top + 3] }), ease, { begin: (s) => (s.attached = s.attached.filter((a) => a !== id)) }),
    tween(1.2, { gy: ry, [id]: [rx, ry, 100 - L.top + 3] }),
    tween(0.9, { gz: rz + L.top - 3, [id]: [rx, ry, rz] }),
    log([["PEEL   " + magic[2], "mid"]], 0.35),
    tween(0.8, { gz: 96 }),
    tween(1.0, { gy: 0 }),
  ];
}

// ---------- chapters per sample ----------
function chaptersOf(sample) {
  const ch = [];
  const C = (id, tasks) => ch.push({ id, tasks });
  const he = (t) => [t, "he"];
  // 1 intake
  C("intake", [
    doit((s) => (s.read = "file written · access held")),
    log([["IRP_MJ_CREATE  " + sample.name + "  ← explorer.exe", "hi"], he("ה-Minifilter תפס את הבקשה – הגישה לקובץ מוחזקת עד לפסק דין")], 0.2),
    glowTo("intake", 1, "lit", 0.2),
    tween(1.0, (s) => Object.fromEntries(s.attached.map((id) => [id, [X.intake, 0, BZ]])), fall),
    log([["SIZE   " + sample.size, "mid"]], 0.8),
    glowTo("intake", 0, null, 0.3),
  ]);
  // 2 hash
  const hashTasks = [
    gateOpen(true),
    moveTo(X.hash, 1.5),
    gateOpen(false, 0.35),
    tween(0.6, (s) => ({ ramZ: topOf(s) })),
    log([["SHA-256  " + sample.sha.slice(0, 16) + "…" + sample.sha.slice(-8), "hi"]], 0.7, { read: "SHA-256 " + sample.sha.slice(0, 8) + "…" }),
    tween(0.7, { drawer: 16 }),
    log([[sample.hashHit ? "LOCAL DB  MATCH → " + sample.family : "LOCAL DB  no match (" + "2,814,903 hashes)", sample.hashHit ? "red" : "mid"]], 0.7),
    log([["CLOUD   " + sample.cloud, sample.hashHit ? "red" : "mid"]], 0.5),
    glowTo("hash", 1, sample.hashHit ? "red" : "mid", 0.3),
    hold(0.4),
    tween(0.6, { ramZ: 56, drawer: 0 }),
  ];
  if (sample.hashHit) hashTasks.push(log([he("התאמה מדויקת במאגר – פסק הדין סופי, אין צורך בשלבים הבאים")], 0.6));
  else hashTasks.push(log([he("Hash לא מוכר – זה עדיין לא אומר שהקובץ בטוח. ממשיכים לנתח")], 0.4));
  C("hash", hashTasks);

  if (!sample.hashHit) {
    // 3 unpack
    const t = [moveTo(X.unpack, 1.5)];
    const shells = sample.layers.slice(0, -1);
    shells.forEach((id, i) => t.push(...peel(id, sample.magic[i])));
    const last = sample.magic[sample.magic.length - 1];
    t.push(glowTo("sensor", 1, "lit", 0.25), log([["MAGIC  " + last[0], "hi"], ["TYPE   " + last[1], "mid"], ["       " + last[2], "mid"]], 1.3, { read: "core: " + last[1].split(" ")[0] }), glowTo("sensor", 0, null, 0.25));
    if (shells.length) t.push(log([he(`קולפו ${shells.length} שכבות – הליבה חשופה לניתוח`)], 0.4));
    C("unpack", t);
    // 4 static
    const st = [moveTo(X.static, 1.5)];
    const core = sample.layers[sample.layers.length - 1];
    const coreTop = BZ + CFG.LAYER[core].top;
    st.push(tween(0.9, Object.fromEntries(CFG.PIN_Y.map((_, i) => ["pin." + i, -(62 - coreTop) * (0.98 + (i % 3) * 0.01)]))));
    sample.pins.forEach((on, i) => { if (on) st.push(tween(0.14, { ["pinLit." + i]: 1 })); });
    st.push(log(sample.yara.slice(0, 2).map((l) => [l, l.includes("✔") ? "red" : "mid"]), 0.9, { read: `pins ${sample.pins.filter(Boolean).length}/9 matched` }));
    sample.sections.forEach(([name, e], i) => {
      st.push(tween(0.8, { entropy: e }, ease, { begin: (s) => (s.sec = i) }));
      st.push(log([[`ENTROPY ${name.padEnd(7)} ${e.toFixed(2)} bit/byte${e >= CFG.ENTROPY_WARN ? "  ⚠ encrypted payload" : ""}`, e >= CFG.ENTROPY_WARN ? "red" : "mid"]], 0.45, { read: `entropy ${name} ${e.toFixed(2)}` }));
    });
    st.push(log(sample.yara.slice(2).map((l) => [l, "mid"]), 0.6));
    st.push(tween(0.7, { entropy: 0, ...Object.fromEntries(CFG.PIN_Y.map((_, i) => ["pin." + i, 0])) }, ease, { begin: (s) => (s.sec = -1) }));
    st.push(doit((s) => (s.pinLit = s.pinLit.map(() => 0))));
    C("static", st);
    // 5 emulation
    const em = [moveTo(X.emu, 1.5), glowTo("beacon", 1, "lit", 0.3)];
    if (!sample.behaviour.length) {
      em.push(log([["EMU    no executable code paths → emulation not needed", "mid"], ["       0 API calls of interest", "green"]], 1.6, { read: "nothing to run" }));
    } else {
      em.push(log([["EMU    virtual CPU x86 · fake Win10 · 2,000,000 instr budget", "hi"]], 0.8, { read: "emulating…" }));
      sample.behaviour.forEach(([what, api], i) => {
        em.push(glowTo("lamp" + i, 1, "red", 0.25));
        em.push(log([["HOOK   " + api, "red"], he("  ↳ " + what)], 0.75, { read: what }));
      });
    }
    em.push(glowTo("beacon", 0, null, 0.3));
    C("emu", em);
  }
  // 6 verdict
  const v = [];
  v.push(moveTo(X.verdict, sample.hashHit ? 3.2 : 1.5));
  if (sample.hashHit) v.push(log([he("התחנות 3–5 דולגו: הזיהוי ב-Hash כבר סופי")], 0.3));
  v.push(tween(1.3, { score: sample.score }, ease, { log: [["ML     features: static " + (sample.pins.filter(Boolean).length || 0) + " · behaviour " + sample.behaviour.length + " · reputation", "mid"]] }));
  const bad = sample.verdict === "malicious";
  v.push(glowTo("verdict", 1, bad ? "red" : "green", 0.3));
  v.push(log([[`SCORE  ${sample.score.toFixed(2)}  ${bad ? "≥" : "<"} ${CFG.THRESHOLD.toFixed(2)}  →  ${bad ? "MALICIOUS · " + sample.family : "CLEAN"}`, bad ? "red" : "green"]], 0.9, { read: `score ${sample.score.toFixed(2)} · ${bad ? "malicious" : "clean"}` }));
  if (bad) {
    v.push(log([["ACTION open denied → STATUS_VIRUS_INFECTED", "hi"]], 0.4));
    v.push(tween(0.9, { door: 44 }));
    v.push(tween(1.3, (s) => ({ plate: CFG.VAULT_IN + 9, [s.attached[0]]: [X.verdict, CFG.VAULT_IN, BZ] }), ease, { begin: (s) => (s.attached = [s.attached[0]]) }));
    v.push(tween(0.9, { plate: 27 }));
    v.push(tween(1.0, { door: 0 }));
    v.push(log([["QUARANT file encrypted · moved to vault · original deleted", "red"], ...(sample.layers.length > 1 ? [["QUARANT container " + sample.name + " quarantined with it", "red"]] : []), ["CLOUD  telemetry sent → protection for all clients", "mid"], he("הקובץ נעול בכספת ההסגר – לא יכול לרוץ, וניתן לשחזר אותו אם זה זיהוי שגוי")], 2.4, { read: "quarantined" }));
  } else {
    v.push(tween(1.4, (s) => ({ belt: s.belt + 54, [s.attached[0]]: [X.exit, 0, 8] })));
    v.push(log([["ACTION access granted → file opened", "green"], ["CACHE  verdict cached by hash → next open is instant", "mid"], he("הקובץ שוחרר למשתמש. אם ישתנה – ייסרק מחדש")], 2.4, { read: "released" }));
  }
  C("verdict", v);
  return ch;
}

// ---------- player ----------
let sampleIndex = 0, chapters = [], ci = 0, ti = 0, tt = 0, playing = true, tour = true, endWait = 0;
const sample = () => CFG.SAMPLES[sampleIndex];
const logs = [];
function emit(lines) {
  for (const [text, tone] of lines) {
    const div = document.createElement("div");
    div.className = tone === "he" ? "t-he" : "t-" + tone;
    div.textContent = text;
    logEl.appendChild(div);
  }
  logEl.scrollTop = logEl.scrollHeight;
}
function begin(task) {
  task.start && task.start(S);
  if (task.log) emit(task.log);
  if (task.read) S.read = task.read;
}
function load(index, chapter = 0) {
  sampleIndex = index;
  S = fresh(sample());
  chapters = chaptersOf(sample());
  logEl.textContent = "";
  emit([["▸ " + sample().name + "  ·  " + sample().size, "hi"], [sample().he, "he"]]);
  ci = 0; ti = 0; tt = 0; endWait = 0;
  // fast-forward through earlier chapters
  while (ci < chapter && ci < chapters.length) {
    for (const task of chapters[ci].tasks) { begin(task); task.step && task.step(S, 1); }
    ci++;
  }
  S.station = chapters[Math.min(ci, chapters.length - 1)].id;
  if (ci < chapters.length) begin(chapters[ci].tasks[0]);
  document.querySelectorAll("[data-sample]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.sample === index)));
  showExplain(S.station);
  draw();
}
function advance(dt) {
  if (ci >= chapters.length) {
    endWait += dt;
    if (tour && endWait > 3.2) load((sampleIndex + 1) % CFG.SAMPLES.length);
    return;
  }
  const calm = still.matches;
  tt += dt;
  let guard = 0;
  while (ci < chapters.length && guard++ < 200) {
    const task = chapters[ci].tasks[ti];
    const dur = calm && task.step && !task.log ? 0 : task.dur;
    if (tt < dur) { task.step && task.step(S, dur ? tt / dur : 1); break; }
    task.step && task.step(S, 1);
    tt -= dur;
    ti++;
    if (ti >= chapters[ci].tasks.length) {
      ci++; ti = 0;
      if (ci < chapters.length) { S.station = chapters[ci].id; showExplain(S.station); }
    }
    if (ci < chapters.length) begin(chapters[ci].tasks[ti]);
  }
}

// ---------- drawing ----------
const tr = (el, p) => el && el.setAttribute("transform", translateAlong(P, p));
const meta = {}; // mover → { band, key }
function place(name, p, center, band) {
  tr(mv[name], p);
  const c = center || p;
  meta[name] = { band: band ?? (c[1] < -30 ? 1 : 3), key: depthOf(c, P) };
}
function draw() {
  const smp = sample();
  // layers
  for (const id of LAYERS) {
    const on = smp.layers.includes(id);
    mv[id].style.display = on ? "" : "none";
    if (!on) { meta[id] = { band: -1, key: 0 }; continue; }
    const p = S[id];
    place(id, p, [p[0], p[1], p[2] + CFG.LAYER[id].h / 2]);
  }
  // belt
  const off = ((S.belt % 12) + 12) % 12;
  beltEl.setAttribute("transform", translateAlong(P, [off, 0, 0]));
  // gate, drawer, ram
  place("gate", [CFG.GATE_X, 0, BZ + S.gate], [CFG.GATE_X, 0, BZ + S.gate + 15]);
  place("drawer", [0, S.drawer, 0], [X.hash, -96 + S.drawer, 32], 1);
  meta.drawer.key += 6;
  const dbody = svg.querySelector("[data-drawerbody]");
  dbody.innerHTML = S.drawer > 0.3 ? solidSvg(slabOf({ x: X.hash - 36.5 + 25.5, y: -74, w: 22, d: S.drawer, r: 0.4 }, 26, 13, P, 2, 0), { tone: "lo", crease: "none" }) + lineSvg(lineOnTop([X.hash - 33 + 25.5, -74], [X.hash - 33 + 25.5, -74 + S.drawer], 39, P), { tone: "faint" }) : "";
  meta.drawerbody = { band: 1, key: meta.drawer.key - 0.5 };
  drawRam();
  // trolley, cable, gripper
  place("trolley", [X.unpack, S.gy, 126], [X.unpack, S.gy, 122], S.gy < -30 ? 1 : 3);
  place("gripper", [X.unpack, S.gy, S.gz], [X.unpack, S.gy, S.gz + 8]);
  cableEl.setAttribute("d", pathOf([iso([X.unpack, S.gy, S.gz + 15], P), iso([X.unpack, S.gy, 118], P)]));
  meta.cable = { band: meta.gripper.band, key: meta.gripper.key + 0.5 };
  // pins
  CFG.PIN_Y.forEach((y, i) => {
    const z = 62 + S.pin[i];
    place("pin" + i, [X.static, y, z], [X.static, y, z + 6]);
    const solid = mv["pin" + i].querySelectorAll(".iso-solid");
    solid.forEach((el) => (S.pinLit[i] > 0.5 ? el.setAttribute("data-lit", "") : el.removeAttribute("data-lit")));
  });
  // entropy needle
  const d = CFG.DIAL;
  const span = Math.PI * 1.5, a = -span / 2 + (S.entropy / 8) * span;
  needleEl.setAttribute("d", lineOnTop([d.x - Math.sin(a) * 3, d.y + Math.cos(a) * 3], [d.x + Math.sin(a) * (d.r - 3.5), d.y - Math.cos(a) * (d.r - 3.5)], d.top + 0.2, P));
  needleEl.setAttribute("data-tone", S.entropy >= CFG.ENTROPY_WARN ? "red" : "lit");
  // sections of the core light while the dial reads them
  for (const id of ["pe", "pdf", "eicar"]) {
    mv[id].querySelectorAll("[data-sec]").forEach((g) => {
      const solid = g.querySelector(".iso-solid");
      +g.dataset.sec === S.sec ? solid.setAttribute("data-lit", "") : solid.removeAttribute("data-lit");
    });
  }
  // verdict: slider, door, pusher
  place("slider", [X.verdict - 42, 50, 7 + S.score * 60], [X.verdict - 42, 50, 44], 5);
  meta.slider.key += 0.5;
  place("door", [X.verdict, 0, 12 + S.door], [X.verdict, -34, 33 + S.door], 1);
  place("plate", [X.verdict, S.plate, 0], null, 4.5);
  drawRod();
  // glows
  for (const [name, el] of Object.entries(glow)) {
    const v = S.glow[name] || 0;
    el.style.setProperty("--on", v.toFixed(2));
    el.style.setProperty("--glow", COLORS[S.tint[name] || "lit"]);
  }
  order();
  // readout
  const st = CFG.STATIONS.find((x) => x.id === S.station);
  const text = `${String(st.n).padStart(2, "0")} ${st.en.toLowerCase()} · ${S.read}`;
  if (readout.textContent !== text) readout.textContent = text;
  updateSteps();
}
function drawRam() {
  const x = X.hash, z = S.ramZ;
  mv.ram ||= (() => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("data-it", ""); g.setAttribute("data-st", "hash"); g.dataset.mv = "ram";
    sceneEl.appendChild(g);
    return g;
  })();
  mv.ram.innerHTML =
    solidSvg(cylinder(x, 0, 3.2, z + 4, Math.max(0.1, 62 - z - 4), P, 16), { tone: "mid", crease: "none" }) +
    solidSvg(cylinder(x, 0, 11, z, 4, P, 40, 0.5), { tone: "hi", lit: S.ramZ < 55 }) +
    lineSvg(sideArc(x, 0, 11, z + 2, P, 30), { tone: "faint" });
  meta.ram = { band: 3, key: depthOf([x, 0, z + 10], P) };
}
function drawRod() {
  const y0 = S.plate + 3, y1 = 34;
  rodEl.innerHTML = y1 - y0 > 0.2 ? solidSvg(slabOf({ x: X.verdict - 3, y: y0, w: 6, d: y1 - y0, r: 1 }, 23, 5, P, 2, 0.3), { tone: "mid" }) : "";
  meta.rod = { band: 4.4, key: 0 };
}
function order() {
  const nodes = [...sceneEl.children];
  const keyed = nodes.map((el, i) => {
    const m = el.dataset.mv && meta[el.dataset.mv];
    return { el, band: m ? m.band : +el.dataset.band, key: m ? m.key : +el.dataset.k, i };
  });
  keyed.sort((a, b) => a.band - b.band || a.key - b.key || a.i - b.i);
  for (let i = 0; i < nodes.length; i++) if (nodes[i] !== keyed[i].el) { for (const n of keyed) sceneEl.appendChild(n.el); return; }
}

// ---------- side panels ----------
const stepEls = [...document.querySelectorAll("[data-step]")];
function updateSteps() {
  const ids = chapters.map((c) => c.id);
  const now = ci < chapters.length ? chapters[ci].id : null;
  stepEls.forEach((el) => {
    const id = el.dataset.step;
    const idx = ids.indexOf(id);
    let state = "todo";
    if (idx < 0) state = ci > 0 ? "skip" : "todo";
    else if (idx < ci) state = "done";
    else if (idx === ci) state = "now";
    if (el.dataset.state !== state) el.dataset.state = state;
    let p = state === "done" ? 1 : 0;
    if (state === "now") {
      const tasks = chapters[ci].tasks;
      const total = tasks.reduce((a, t) => a + t.dur, 0) || 1;
      const doneDur = tasks.slice(0, ti).reduce((a, t) => a + t.dur, 0) + Math.min(tt, tasks[ti].dur);
      p = doneDur / total;
    }
    el.style.setProperty("--p", p.toFixed(3));
  });
}
let focused = null;
function showExplain(id) {
  const st = CFG.STATIONS.find((x) => x.id === id);
  if (!st) return;
  explainEl.innerHTML = `<h3>${st.n}. ${st.he}<small>${st.en.toUpperCase()}</small></h3><p>${st.what}</p><p class="av-real">${st.real}</p>`;
  svg.setAttribute("data-focus", id);
}

// ---------- loop ----------
let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  if (playing) advance(dt);
  draw();
  frame = visible && playing ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && playing) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// ---------- controls ----------
const playBtn = document.querySelector('[data-act="play"]');
function setPlaying(v) {
  playing = v;
  playBtn.setAttribute("aria-pressed", String(v));
  playBtn.innerHTML = (v ? "⏸ השהה" : "▶ הפעל") + "<kbd>space</kbd>";
  run();
}
function jump(chapterIndex) {
  tour = false;
  const n = chaptersOf(sample()).length;
  load(sampleIndex, clamp(chapterIndex, 0, n - 1));
  run();
}
function stationJump(id) {
  const ids = chaptersOf(sample()).map((c) => c.id);
  const idx = ids.indexOf(id);
  if (idx >= 0) jump(idx);
}
document.querySelectorAll("[data-sample]").forEach((b) => b.addEventListener("click", () => { tour = false; load(+b.dataset.sample); setPlaying(true); }));
document.querySelector('[data-act="prev"]').addEventListener("click", () => jump(ti === 0 && tt < 0.5 ? ci - 1 : ci));
document.querySelector('[data-act="next"]').addEventListener("click", () => jump(ci + 1));
playBtn.addEventListener("click", () => setPlaying(!playing));
stepEls.forEach((el) => {
  el.addEventListener("click", () => stationJump(el.dataset.step));
  el.addEventListener("pointerenter", () => showExplain(el.dataset.step));
  el.addEventListener("pointerleave", () => showExplain(S.station));
});
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") jump(ci + 1);
  else if (e.key === "ArrowLeft") jump(ti === 0 && tt < 0.5 ? ci - 1 : ci);
  else if (e.key === " ") setPlaying(!playing);
  else if (["1", "2", "3"].includes(e.key)) { tour = false; load(+e.key - 1); setPlaying(true); }
  else return;
  e.preventDefault();
});
// hover a machine → explain it; click → jump there
const stationScreenX = CFG.STATIONS.map((st) => [st.id, iso([X[st.id], 0, 40], P)[0]]);
function stationAt(ev) {
  const box = svg.getBoundingClientRect();
  const sx = ((ev.clientX - box.left) / box.width) * svg.viewBox.baseVal.width;
  let best = null, dist = 60;
  for (const [id, x] of stationScreenX) if (Math.abs(x - sx) < dist) { dist = Math.abs(x - sx); best = id; }
  return best;
}
stage.addEventListener("pointermove", (ev) => {
  const id = stationAt(ev);
  if (id !== focused) { focused = id; showExplain(id || S.station); }
});
stage.addEventListener("pointerleave", () => { focused = null; showExplain(S.station); });
stage.addEventListener("click", (ev) => { const id = stationAt(ev); if (id) stationJump(id); });
if (still.matches) tour = false;
load(0);
