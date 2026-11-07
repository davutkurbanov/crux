/* The about page's product tour: one paused GSAP timeline, registered for HyperFrames, that the
   <hyperframes-player> in the hero plays. The film runs 0 to LOOP s once; then Ask anything
   (LOOP to DUR s) loops for as long as the page is open (the player's range-start/range-end),
   ending exactly as it began.
   Two cuts of one film: wide (1920×1080), full-bleed behind the hero, the phone at the middle of
   the page and the map fading out on the left where the page's headline sits; and ?cut=square
   (1080×1080) for phones, under the headline.
   The map is the app's own topics (map-data.js, one continent laid out by
   apps/landing/scripts/demo-map.py), seen from above and close: every square shows its piece of
   its field's photograph (img/fields.webp) under a tint for how well it is known, in steps like
   a contour map: washed grey where it is new to you, through sand and gold, to the picture itself.
   Fields are kept apart by thin seams; squares within a field touch. Only the outer edges go soft.
     0    the map comes in
     2.4  the page's headline comes in (OPEN); the view settles on Drawing and printmaking
     3.6  that square is picked out where it lies (the rest of the map dims round it); a card says what it is
     4.6  the phone comes up and stays: the lesson, Learnt (the square clears, then its field
          brightens in a wave), then the game
     18.0 the card levels up; the field steps up again; three squares it opened up light in turn
     23.4 what's next: the edge of what you know drawn as one line, a gap fills itself, Ready
     31.2 Ask anything (the loop), the same shape for each question, typed on the phone:
          Everest, the octopus, black holes; 15 s each
   The map is drawn once into a picture of its own (tex) and only the squares that change are
   redrawn; each frame is that picture placed by the camera, and the marks over it. draw(t) works
   all of it out from the time alone, so any frame renders the same way every time; GSAP moves the
   card and the phone. Nothing is random (a seeded hash) and nothing is fetched.
   Tooling: hyperframes@0.8.223 (npx hyperframes lint / snapshot / render, run in this folder).
   vendor/ holds gsap 3.15.0 and @hyperframes/player 0.8.223, so the page asks no CDN for anything.
   poster-wide.webp and poster-square.webp are the frame at LOOP (`npx hyperframes snapshot --at
   31.2 --no-end`, the square one with ?cut=square forced on), where the loop begins: re-make
   them when that changes. */
(() => {
  const root = document.getElementById("root");
  if (/[?&]cut=square\b/.test(location.search)) Object.assign(root.dataset, { width: "1080", height: "1080" }), root.classList.replace("wide", "square");
  const WIDE = root.classList.contains("wide");
  const M = window.CRUX_MAP;
  const OPEN = 2.4, LOOP = 31.2, CYCLE = 15, DUR = LOOP + 3 * CYCLE;
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const add = (parent, html) => parent.appendChild(el(html));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const out = (p) => 1 - Math.pow(1 - p, 3);
  const seg = (t, a, d) => clamp01((t - a) / d);
  /** 0 → 1 over [a, a + f], back to 0 over [b - f, b]; b omitted, it stays. */
  const env = (t, a, b = Infinity, f = 0.45) => Math.min(out(seg(t, a, f)), 1 - inOut(seg(t, b - f, f)));
  let seed = 7;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // ── Where things sit in each cut ───────────────────────────────────────
  const W = WIDE ? 1920 : 1080, H = 1080, CX = W / 2, CY = H / 2;
  const L = WIDE
    ? { phone: { x: 960 - 207 * 0.86, y: (1080 - 868 * 0.86) / 2, s: 0.86 }, card: { x: 1250, y: 300 }, pick: [1330, 205], s: 50, start: { x: 0, y: 0.5, s: 48 }, what: { at: [1230, 420], s: 40 },
        // Where a square can be seen beside the card, and where it can be seen with the card gone.
        nearby: [[1170, 40, 1880, 270], [1730, 270, 1880, 1040]], open: [[1270, 40, 1840, 1000]] }
    : { phone: { x: 130, y: 1080 - 868 * 0.82 - 40, s: 0.82 }, card: { x: 596, y: 400 }, pick: [812, 300], s: 46, start: { x: -2, y: -1, s: 40 }, what: { at: [520, 330], s: 34 },
        nearby: [[560, 70, 1050, 390]], open: [[660, 70, 1000, 1040], [90, 70, 1000, 360]] };
  const inside = (zones, X, Y) => zones.some(([a, b, c, d]) => X > a && X < c && Y > b && Y < d);

  const I = {
    check: '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.5"/><path d="M12 18h.01"/></svg>',
    search: '<svg viewBox="0 0 20 20"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="5.8"/><path d="m13.4 13.4 4 4"/></g></svg>',
    status: '<svg viewBox="0 0 70 13"><g fill="currentColor"><rect x="0" y="8" width="3" height="5" rx="1"/><rect x="5" y="5.5" width="3" height="7.5" rx="1"/><rect x="10" y="3" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="13" rx="1"/><path d="M33 3.5a9 9 0 0 1 12 0l-1.6 1.7a6.6 6.6 0 0 0-8.8 0ZM35.8 6.6a5 5 0 0 1 6.4 0L39 10Z"/><rect x="48" y=".5" width="20" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".45"/><rect x="50" y="2.5" width="14" height="8" rx="2"/><rect x="69" y="4.5" width="1.5" height="4" rx=".7" opacity=".45"/></g></svg>',
    pin: '<svg class="pin" viewBox="0 0 24 30"><path d="M12 29s-10-9.2-10-17a10 10 0 0 1 20 0c0 7.8-10 17-10 17z" fill="#8ed643" stroke="#151515" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="#151515"/></svg>',
  };
  const tl = gsap.timeline({ paused: true });
  const set = (t, v) => gsap.set(t, v);

  // ── The map ────────────────────────────────────────────────────────────
  const FL = M.f.map(([slug, name, d], i) => ({ i, slug, name, d, sq: [] }));
  const SQ = M.c.map(([f, x, y, topic, name], i) => { const q = { i, f, x, y, topic, name }; FL[f].sq.push(q); return q; });
  const AT = new Map(SQ.map((q) => [q.x + "," + q.y, q]));
  const TOPIC = new Map(SQ.filter((q) => q.topic >= 0).map((q) => [q.topic, q]));
  for (const f of FL) {
    const xs = f.sq.map((q) => q.x), ys = f.sq.map((q) => q.y);
    f.bx = Math.min(...xs) - 0.5; f.by = Math.min(...ys) - 0.5;
    const bw = Math.max(...xs) + 0.5 - f.bx, bh = Math.max(...ys) + 0.5 - f.by;
    f.side = Math.max(bw, bh); f.ox = (f.side - bw) / 2; f.oy = (f.side - bh) / 2;
  }
  const near = (q, dx, dy) => AT.get(q.x + dx + "," + (q.y + dy));
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const EDGE = SQ.map((q) => [[-1, 0], [0, -1], [1, 0], [0, 1]].map(([dx, dy]) => near(q, dx, dy)?.f !== q.f));
  const A = M.atlas, STEP = A.cell + 2 * A.pad;
  const SRC = SQ.map((q) => { const f = FL[q.f]; return [(f.i % A.cols) * STEP + A.pad + ((q.x - 0.5 - f.bx + f.ox) / f.side) * A.cell, Math.floor(f.i / A.cols) * STEP + A.pad + ((q.y - 0.5 - f.by + f.oy) / f.side) * A.cell, A.cell / f.side]; });
  const MINX = Math.min(...SQ.map((q) => q.x)), MINY = Math.min(...SQ.map((q) => q.y));
  const MAXX = Math.max(...SQ.map((q) => q.x)), MAXY = Math.max(...SQ.map((q) => q.y));
  const short = (n) => (n.length <= 26 ? n : n.split(/,| and /)[0]);

  const T = (n) => TOPIC.get(n);
  const HERO = T(791), GAP = T(739);
  const STORY = [
    { q: HERO, img: "wave.jpg", name: "Drawing and printmaking", from: 2 },
    { q: T(626), img: "everest.jpg", name: "Mountains", from: 1, ask: "How high is Mount Everest?" },
    { q: T(838), img: "octopus.jpg", name: "Molluscs", from: 1, ask: "Why is the octopus so strange?" },
    { q: T(54), img: "blackhole.jpg", name: "Black holes", from: 1, ask: "How do black holes form?" },
  ];
  // The camera when a square is in play: it sits at L.pick, beside the card.
  const view = (q) => ({ x: q.x - (L.pick[0] - CX) / L.s, y: q.y - (L.pick[1] - CY) / L.s, s: L.s });
  const WHAT = { x: HERO.x - (L.what.at[0] - CX) / L.what.s, y: HERO.y - (L.what.at[1] - CY) / L.what.s, s: L.what.s };
  const scr = (x, y, c) => [CX + (x - c.x) * c.s, CY + (y - c.y) * c.s];
  // When each comes into play.
  STORY.forEach((S, k) => {
    const t0 = k === 0 ? 0 : LOOP + (k - 1) * CYCLE;
    S.at = k === 0
      ? { pick: 3.6, learnt: 12.2, wave: 12.8, level: 18.0, unlock: [20.0, 20.8, 21.6], down: 23.0 }
      : { pick: t0 + 4.0, learnt: t0 + 8.0, wave: t0 + 8.6, level: t0 + 11.6, unlock: [12.8, 13.3, 13.8].map((v) => t0 + v), down: t0 + 14.3 };
  });
  // What learning one opens up: three topics in sight beside it, from its own field first, then its domain.
  const IN_PLAY = new Set(STORY.map((S) => S.q));
  for (const S of STORY) {
    const c = view(S.q), rank = (q) => (q.f === S.q.f ? 0 : FL[q.f].d === FL[S.q.f].d ? 100 : 1e6) + Math.hypot(q.x - S.q.x, q.y - S.q.y), pick = [];
    for (const q of [...SQ].sort((a, b) => rank(a) - rank(b))) {
      const [X, Y] = scr(q.x, q.y, c);
      if (rank(q) >= 1e6 || !q.name || IN_PLAY.has(q) || q === GAP || Math.hypot(q.x - S.q.x, q.y - S.q.y) < 1.5 || !inside(L.nearby, X, Y)) continue;
      if (pick.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 1.5)) continue;
      pick.push(q); if (pick.length === 3) break;
    }
    S.unlock = pick.map((q) => [q, short(q.name)]);
  }

  // How well each square is known: by field, rolling gently across the land.
  const FAMILIAR = { "visual-arts": 0.4, sport: 0.66, food: 0.58, music: 0.5, exploration: 0.46, "ancient-history": 0.5, "physical-geography": 0.36, literature: 0.4, film: 0.42, "classical-antiquity": 0.46, games: 0.4, "earth-science": 0.5, zoology: 0.32, astronomy: 0.28 };
  const base = SQ.map((q) => {
    const roll = Math.sin(q.x * 0.37 + 1.1) * Math.cos(q.y * 0.43 + 2.0) * 0.12;
    return clamp01((FAMILIAR[FL[q.f].slug] ?? 0.08 + rnd() * 0.14) + roll + (rnd() - 0.5) * 0.16);
  });
  base[GAP.i] = 0;
  for (const q of SQ) if (Math.hypot(q.x - GAP.x, q.y - GAP.y) < 1.5 && q !== GAP) base[q.i] = Math.max(base[q.i], 0.66);
  for (const S of STORY) { base[S.q.i] = 0.12; for (const [q] of S.unlock) base[q.i] = Math.min(base[q.i], 0.06); }
  const steps = SQ.map(() => []), cur = base.slice();
  const to = (q, t, v, d = 0.8) => { steps[q.i].push([t, v, d]); cur[q.i] = v; };
  const level = (i, t) => { let v = base[i]; for (const [a, v2, d] of steps[i]) { if (t < a) break; v += (v2 - v) * inOut(seg(t, a, d)); } return v; };
  const touched = new Set();
  // The field's waves: each square brightens as the wave reaches it, with a flash of white.
  const WAVES = [], WAVE_PACE = 0.16;
  let settledAtLoop = null;
  STORY.forEach((S, k) => {
    if (k === 1) settledAtLoop = cur.slice();
    const mark = (q) => { if (k > 0) touched.add(q); };
    // Learnt: the square clears; then its field brightens, in a wave out from it; at the level up, once more.
    to(S.q, S.at.learnt, 1, 1.0); mark(S.q);
    for (const [when, lift] of [[S.at.wave, 0.3], [S.at.level + 0.3, 0.2]]) {
      WAVES.push({ S, t: when });
      for (const q of FL[S.q.f].sq) if (q !== S.q) { to(q, when + Math.hypot(q.x - S.q.x, q.y - S.q.y) * WAVE_PACE, Math.min(1, cur[q.i] + lift), 0.6); mark(q); }
    }
    S.unlock.forEach(([q], j) => { to(q, S.at.unlock[j] + 0.3, Math.max(cur[q.i], 0.64), 0.9); mark(q); });
    if (k === 0) to(GAP, 27.6, 0.74, 1.4);
  });
  // The edge of what you know by the end of the film: round its two biggest stretches of known land.
  const KNOWN = (i) => settledAtLoop[i] >= 0.46;
  const lands = [], seen = new Set();
  for (const q of SQ) {
    if (!KNOWN(q.i) || seen.has(q)) continue;
    const land = [q]; seen.add(q);
    for (const r of land) for (const [dx, dy] of DIRS) { const n = near(r, dx, dy); if (n && KNOWN(n.i) && !seen.has(n)) { seen.add(n); land.push(n); } }
    lands.push(land);
  }
  const LAND = new Set(lands.sort((a, b) => b.length - a.length).slice(0, 2).flat());
  const FRONT = [];
  for (const q of LAND)
    [[1, 0, 0.5, -0.5, 0.5, 0.5], [-1, 0, -0.5, -0.5, -0.5, 0.5], [0, 1, -0.5, 0.5, 0.5, 0.5], [0, -1, -0.5, -0.5, 0.5, -0.5]].forEach(([dx, dy, ax, ay, bx, by]) => {
      const n = near(q, dx, dy);
      if (n && !LAND.has(n)) FRONT.push({ a: [q.x + ax, q.y + ay], b: [q.x + bx, q.y + by], k: Math.hypot(q.x - HERO.x, q.y - HERO.y) });
    });
  const FMAX = Math.max(...FRONT.map((F) => F.k));
  // Ready: a new square on that edge, nearest what the film learnt, in clear view, well away from the gap.
  const READY = SQ.filter((q) => { const [X, Y] = scr(q.x, q.y, WHAT); return !KNOWN(q.i) && q.name && !IN_PLAY.has(q) && inside(L.open, X, Y) && Math.hypot(q.x - GAP.x, q.y - GAP.y) > 4 && DIRS.filter(([dx, dy]) => LAND.has(near(q, dx, dy))).length >= 2; })
    .sort((a, b) => Math.hypot(a.x - HERO.x, a.y - HERO.y) - Math.hypot(b.x - HERO.x, b.y - HERO.y))[0] || SQ[0];
  // The loop gives back what it grew, softly, in its last moments, so it starts again as it began.
  for (const q of touched) to(q, DUR - 1.1, settledAtLoop[q.i], 0.8);

  // The tint for each step of knowing: [colour, how much of it lies over the picture].
  const TINT = [["#e4e2db", 0.74], ["#ece4cd", 0.56], ["#ecd9a6", 0.38], ["#e8c97c", 0.22], ["#e0b75c", 0.1], [null, 0]];
  const band = (k) => (k < 0.1 ? 0 : 1 + Math.min(4, Math.floor((k - 0.1) / 0.18)));

  // ── The canvases: the map's own picture, the frame, and the frame again, small, for the soft edges ──
  const DPR = 2, TU = 84;
  const tex = document.createElement("canvas"); tex.width = (MAXX - MINX + 1) * TU; tex.height = (MAXY - MINY + 1) * TU;
  const tc = tex.getContext("2d"); tc.fillStyle = "#f2f1ed"; tc.fillRect(0, 0, tex.width, tex.height);
  tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = "high";
  const cv = add(root, `<canvas class="cv" width="${W * DPR}" height="${H * DPR}"></canvas>`), ctx = cv.getContext("2d");
  const bv = add(root, `<canvas class="bv" width="${W / 10}" height="${H / 10}"></canvas>`), bctx = bv.getContext("2d");
  const atlas = add(root, `<img class="pre" src="img/fields.webp" alt="">`);
  const pics = Object.fromEntries(STORY.map((S) => [S.img, add(root, `<img class="pre" src="img/${S.img}" alt="">`)]));
  add(root, `<div class="edge"></div>`);
  const lfade = add(root, `<div class="lfade"></div>`);
  tl.to(lfade, { opacity: 1, duration: 1.6, ease: "power2.inOut" }, OPEN);
  const ok = (im) => im.complete && im.naturalWidth;
  const pop = SQ.map((q) => 0.05 + Math.min(1, Math.hypot(q.x - L.start.x, q.y - L.start.y) / 24) * 1.7 + rnd() * 0.15);
  const shown = new Int32Array(SQ.length).fill(-1);
  let shownPic = false;
  const paintSquare = (q, b, p) => {
    const e = EDGE[q.i], g = TU * 0.05, x = (q.x - MINX) * TU, y = (q.y - MINY) * TU;
    const x0 = x + (e[0] ? g : 0), y0 = y + (e[1] ? g : 0), x1 = x + TU - (e[2] ? g : 0), y1 = y + TU - (e[3] ? g : 0);
    tc.globalAlpha = 1; tc.fillStyle = "#f2f1ed"; tc.fillRect(x, y, TU, TU);
    if (p <= 0) return;
    tc.globalAlpha = p;
    if (ok(atlas)) { const [sx, sy, ss] = SRC[q.i]; tc.drawImage(atlas, sx, sy, ss, ss, x0, y0, x1 - x0, y1 - y0); }
    const [col, a] = TINT[b];
    if (col) { tc.globalAlpha = p * (ok(atlas) ? a : 1); tc.fillStyle = col; tc.fillRect(x0, y0, x1 - x0, y1 - y0); }
  };

  // ── The camera: close all the way; it eases to whatever is in play ─────
  const CAM = [
    { t: 0, ...L.start },
    { t: OPEN, d: 1.8, ...view(HERO) },
    { t: 23.4, d: 1.8, ...WHAT },
    ...STORY.slice(1).map((S, k) => ({ t: LOOP + k * CYCLE + 2.6, d: 1.6, ...view(S.q) })),
    { t: DUR - 1.3, d: 1.2, ...WHAT },
  ];
  const cam = (t) => {
    let c = CAM[0];
    for (const k of CAM.slice(1)) {
      if (t <= k.t) break;
      const p = inOut(seg(t, k.t, k.d));
      c = { x: c.x + (k.x - c.x) * p, y: c.y + (k.y - c.y) * p, s: Math.exp(Math.log(c.s) + (Math.log(k.s) - Math.log(c.s)) * p) };
    }
    return c;
  };

  // ── Marks: nothing lifts; what's in play is picked out where it lies ───
  const spots = [
    ...STORY.map((S) => ({ q: S.q, a: S.at.pick, b: S.at.down, main: true, own: S.img, learnt: S.at.learnt })),
    ...STORY.flatMap((S) => S.unlock.map(([q], j) => ({ q, a: S.at.unlock[j], b: S.at.down, from: S.q }))),
    { q: GAP, a: 27.4, b: 30.8 }, { q: READY, a: 28.8, b: 30.8 },
  ];
  const pills = [
    { q: GAP, text: short(GAP.name), tag: "Filled in", bg: "#ff7267", a: 28.4, b: 30.8 },
    { q: READY, text: short(READY.name), tag: "Ready", bg: "#8ed643", a: 29.2, b: 30.8 },
  ];
  const shines = [[GAP, 27.6, 1.2], ...STORY.map((S) => [S.q, S.at.learnt, 1.0])];

  const pill = (x, y, text, fs, a, tag, bg) => {
    ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = "middle";
    ctx.font = `600 ${fs}px Figtree, sans-serif`; const tw = ctx.measureText(text).width;
    ctx.font = `700 ${fs * 0.7}px Figtree, sans-serif`; const gw = tag ? ctx.measureText(tag.toUpperCase()).width + fs * 1.1 : 0;
    const h = fs * 1.9, w = tw + fs * 1.3 + (tag ? gw + fs * 0.45 : 0), x0 = Math.max(16, Math.min(W - 16 - w, x - w / 2));
    ctx.shadowColor = "rgba(21,21,21,.2)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, h / 2); ctx.fill(); ctx.shadowColor = "transparent";
    let tx = x0 + fs * 0.65;
    if (tag) {
      const th = h - fs * 0.5; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x0 + fs * 0.25, y - th / 2, gw, th, th / 2); ctx.fill();
      ctx.fillStyle = "#151515"; ctx.fillText(tag.toUpperCase(), x0 + fs * 0.8, y + 0.5); tx = x0 + fs * 0.25 + gw + fs * 0.45;
    }
    ctx.font = `600 ${fs}px Figtree, sans-serif`; ctx.fillStyle = "#151515"; ctx.fillText(text, tx, y + 0.5);
    ctx.restore();
  };

  function draw(t) {
    // Bring the map's picture up to date: only squares whose look has changed are painted again.
    const picNow = !!ok(atlas);
    for (const q of SQ) {
      const p = Math.round(out(seg(t, pop[q.i], 0.7)) * 12), b = band(level(q.i, t)), key = p * 10 + b;
      if (key !== shown[q.i] || picNow !== shownPic) { paintSquare(q, b, p / 12); shown[q.i] = key; }
    }
    shownPic = picNow;
    const c = cam(t), s = c.s, k = s / TU;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = "#f2f1ed"; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.setTransform(DPR * k, 0, 0, DPR * k, DPR * (CX + (MINX - 0.5 - c.x) * s), DPR * (CY + (MINY - 0.5 - c.y) * s));
    ctx.drawImage(tex, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const box = (q) => { const [x, y] = scr(q.x, q.y, c); return [x - s / 2, y - s / 2, s, x, y]; };

    // What's next: the edge of what you know, drawn out from where the film learnt, as one line.
    const fa = env(t, 25.0, 30.8, 0.6);
    if (fa > 0) {
      const reveal = out(seg(t, 25.0, 2.2)) * (FMAX + 0.5);
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = fa;
      for (const [lw, col] of [[Math.max(7, s * 0.2), "rgba(142,214,67,.85)"], [2.5, "#151515"]]) {
        ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath();
        for (const F of FRONT) { if (F.k > reveal) continue; const p = scr(F.a[0], F.a[1], c), q = scr(F.b[0], F.b[1], c); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
        ctx.stroke();
      }
      ctx.restore();
    }
    // While a square is in play the rest of the map dims; it, and what it opened up, stay lit.
    const live = spots.map((S) => [S, env(t, S.a, S.b, 0.7)]).filter(([, a]) => a > 0);
    let veil = 0;
    for (const [S, a] of live) if (S.main) veil = Math.max(veil, a);
    if (veil > 0) {
      ctx.save(); ctx.globalAlpha = veil * 0.55; ctx.fillStyle = "#f2f1ed"; ctx.beginPath(); ctx.rect(0, 0, W, H);
      for (const [S, a] of live) { const [x, y, z] = box(S.q); ctx.rect(x + z, y, -z, z); }
      ctx.fill("evenodd"); ctx.restore();
    }
    // The waves: a flash of white over each square of the field as the wave reaches it.
    for (const V of WAVES) {
      if (t < V.t || t > V.t + 3.2) continue;
      ctx.save(); ctx.fillStyle = "#fff";
      for (const q of FL[V.S.q.f].sq) {
        if (q === V.S.q) continue;
        const p = seg(t, V.t + Math.hypot(q.x - V.S.q.x, q.y - V.S.q.y) * WAVE_PACE, 0.55); if (p <= 0 || p >= 1) continue;
        const [x, y, z] = box(q); ctx.globalAlpha = 0.65 * Math.sin(Math.PI * p); ctx.fillRect(x, y, z, z);
      }
      ctx.restore();
    }
    // A fine line from the square out to each it opened up, drawn as it opens.
    for (const [S, a] of live) {
      if (!S.from) continue;
      const p = box(S.from), q = box(S.q), d = out(seg(t, S.a, 0.8));
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#151515"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p[3], p[4]); ctx.lineTo(p[3] + (q[3] - p[3]) * d, p[4] + (q[4] - p[4]) * d); ctx.stroke(); ctx.restore();
    }
    // The square's own picture, once learnt; then a white edge round everything picked out.
    for (const [S, a] of live) {
      const [x, y, z] = box(S.q);
      if (S.own && S.learnt && ok(pics[S.own])) {
        const im = pics[S.own], f = inOut(seg(t, S.learnt + 0.3, 0.9)) * a, m = Math.min(im.naturalWidth, im.naturalHeight);
        if (f > 0) { ctx.globalAlpha = f; ctx.drawImage(im, (im.naturalWidth - m) / 2, (im.naturalHeight - m) / 2, m, m, x, y, z, z); ctx.globalAlpha = 1; }
      }
      const lw = S.main ? 4 : 3;
      ctx.save(); ctx.globalAlpha = a * (S.main || t >= S.a + 0.6 ? 1 : seg(t, S.a, 0.6)); ctx.strokeStyle = "#fff"; ctx.lineWidth = lw;
      ctx.strokeRect(x + lw / 2, y + lw / 2, z - lw, z - lw);
      ctx.strokeStyle = "#151515"; ctx.lineWidth = S.main ? 2.5 : 1.5; ctx.strokeRect(x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, z + ctx.lineWidth, z + ctx.lineWidth);
      ctx.restore();
    }
    // A light passing over a square as it clears.
    for (const [q, b, d] of shines) {
      const p = seg(t, b, d); if (p <= 0 || p >= 1) continue;
      const [x, y, z] = box(q);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, z, z); ctx.clip();
      const sx = x - z + p * z * 3, g = ctx.createLinearGradient(sx - z * 0.6, y, sx + z * 0.6, y + z);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(x, y, z, z); ctx.restore();
    }
    for (const P of pills) { const a = env(t, P.a, P.b, 0.5); if (a <= 0) continue; const [, , , x, y] = box(P.q); pill(x, y + s / 2 + 32 + (1 - a) * 10, P.text, 21, a, P.tag, P.bg); }
    // The soft edges: the frame again, small.
    bctx.drawImage(cv, 0, 0, W * DPR, H * DPR, 0, 0, bv.width, bv.height);
  }
  const clock = { t: 0 };
  tl.to(clock, { t: DUR, duration: DUR, ease: "none", onUpdate: () => draw(clock.t) }, 0);
  for (const im of [atlas, ...Object.values(pics)]) if (!im.complete) im.addEventListener("load", () => draw(clock.t));
  if (document.fonts) document.fonts.load('600 20px "Figtree"').then(() => draw(clock.t));

  // ── The card: the square in play ───────────────────────────────────────
  const thumb = (q) => { const z = 38 / SRC[q.i][2]; return `background-image:url(img/fields.webp);background-size:${A.cols * STEP * z}px auto;background-position:${-SRC[q.i][0] * z}px ${-SRC[q.i][1] * z}px`; };
  STORY.forEach((S) => {
    const card = add(root, `<div class="info"><div class="info__top"><span class="info__pic" style="background-image:url(img/${S.img})"></span><div><small>${FL[S.q.f].name}</small><b>${S.name}</b></div></div>
      <div class="info__lv"><span>Level <span class="info__n"><i>${S.from}</i><i>${S.from + 1}</i></span></span><span class="info__up">Level up</span></div><div class="info__bar"><i></i></div>
      <div class="info__un"><small>Unlocked</small>${S.unlock.map(([q, n]) => `<div class="info__row"><span class="info__tile" style="${thumb(q)}"></span>${n}<em>New</em></div>`).join("")}</div></div>`);
    const n = card.querySelectorAll(".info__n i"), up = card.querySelector(".info__up"), bar = card.querySelector(".info__bar i"), un = card.querySelector(".info__un"), rows = card.querySelectorAll(".info__row");
    set(card, { x: L.card.x, y: L.card.y + 24 }); set(up, { opacity: 0, scale: 0.6 }); set(bar, { scaleX: 0.45 }); set(rows, { opacity: 0, x: -12 });
    tl.to(card, { opacity: 1, y: L.card.y, duration: 0.8, ease: "expo.out" }, S.at.pick + 0.4);
    tl.to(bar, { scaleX: 1, duration: 1.0, ease: "power2.inOut" }, S.at.level);
    tl.to(n, { yPercent: -100, duration: 0.6, ease: "expo.out" }, S.at.level + 1.0);
    tl.to(up, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.5)" }, S.at.level + 1.1);
    tl.to(bar, { scaleX: 0.14, duration: 0.7, ease: "power3.inOut" }, S.at.level + 1.5);
    tl.to(un, { height: 214, duration: 0.7, ease: "power3.inOut" }, S.at.unlock[0] - 0.6);
    rows.forEach((r, j) => tl.to(r, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" }, S.at.unlock[j]));
    tl.to(card, { opacity: 0, y: L.card.y - 16, duration: 0.5, ease: "power2.in" }, S.at.down - 0.5);
  });

  // ── The phone: up from the film's first lesson to the end ──────────────
  const phone = add(root, `<div class="phone"></div>`);
  set(phone, { x: L.phone.x, y: H + 60, scale: L.phone.s });
  tl.to(phone, { y: L.phone.y, duration: 1.3, ease: "expo.out" }, 4.6);
  const screen = (html) => add(phone, `<div class="scr"><div class="sb"><span>9:41</span>${I.status}</div>${html}</div>`);
  let current = null;
  const show = (s, t) => {
    if (current) tl.fromTo(current, { opacity: 1, x: 0 }, { opacity: 0, x: -40, duration: 0.45, ease: "power2.in", immediateRender: false }, t - 0.05);
    tl.fromTo(s, { opacity: 0, x: current ? 40 : 0 }, { opacity: 1, x: 0, duration: current ? 0.6 : 0.01, ease: "power3.out", immediateRender: false }, t + (current ? 0.12 : 0));
    current = s;
  };
  // A step goes on by its own button, pressed in and let go: no finger on the glass.
  const press = (s, t) => { const b = s.querySelector(".cta"); tl.to(b, { scale: 0.95, duration: 0.12, ease: "power2.out" }, t).to(b, { scale: 1, duration: 0.4, ease: "back.out(3)" }, t + 0.12); };
  // A game's answer: Check is pressed, and the verdict takes its place.
  const okBar = (s, text, t) => {
    const o = add(s, `<div class="ok">${I.check}<span>${text}</span></div>`);
    press(s, t - 0.35); set(o, { y: 14 });
    tl.to(s.querySelector(".cta"), { opacity: 0, duration: 0.2 }, t).to(o, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, t);
  };
  const head = (n) => `<div class="gh"><span class="ib">${I.x}</span><span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "" : "o"}"></i>`).join("")}<span>${n} of 5</span></span><span class="ib">${I.help}</span></div>`;
  const lessonTop = (p) => `<div class="gh"><span class="ib">${I.x}</span><span></span><span class="ib">${I.help}</span></div><div class="ls-bar"><i style="transform:scaleX(${p})"></i></div>`;
  const lesson = (img, k, h, p, prog) => screen(`${lessonTop(prog)}<div class="ls-pic" style="height:290px"><img src="img/${img}" alt=""></div><p class="ls-k" style="top:440px">${k}</p><h3 class="ls-h" style="top:464px;font-size:31px">${h}</h3><p class="ls-p" style="top:540px">${p}</p><div class="cta">Continue</div>`);
  // Learnt: the picture springs up, its square draws round it, the word lands, and a burst.
  const reward = (S, t) => {
    const s = screen(`${lessonTop(1)}<div class="rw-sq"><img src="img/${S.img}" alt=""></div><svg class="rw-ring" viewBox="0 0 232 232"><rect x="5" y="5" width="222" height="222" pathLength="1" stroke-dasharray="1"/></svg>
      ${Array.from({ length: 10 }, () => `<i class="rw-spark"></i>`).join("")}<h3 class="rw-h">Learnt</h3><p class="rw-p">${S.name}, on your map</p><div class="cta">Continue</div>`);
    const sq = s.querySelector(".rw-sq"), rect = s.querySelector(".rw-ring rect"), h = s.querySelector(".rw-h"), p = s.querySelector(".rw-p"), sparks = s.querySelectorAll(".rw-spark");
    set(sq, { scale: 0.4, opacity: 0 }); set(rect, { attr: { "stroke-dashoffset": 1 } }); set([h, p], { opacity: 0, y: 18 }); set(sparks, { scale: 0, opacity: 0 });
    show(s, t);
    tl.to(sq, { scale: 1, opacity: 1, duration: 0.9, ease: "back.out(1.8)" }, t + 0.3);
    tl.to(rect, { attr: { "stroke-dashoffset": 0 }, duration: 1.1, ease: "power2.inOut" }, t + 0.7);
    tl.to(h, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" }, t + 1.55);
    tl.to(p, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" }, t + 1.75);
    sparks.forEach((e, j) => {
      const a = (j / sparks.length) * Math.PI * 2 + 0.3, r = 150 + (j % 3) * 22;
      tl.to(e, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 1, opacity: 1, rotation: 45, duration: 0.7, ease: "expo.out" }, t + 1.75)
        .to(e, { opacity: 0, scale: 0.4, duration: 0.6, ease: "power2.in" }, t + 2.45);
    });
    return s;
  };

  // The film's square: the lesson first (the print, then a closer look), Learnt, then the game.
  const sA = lesson("wave.jpg", "Lesson · Drawing and printmaking", "The Great Wave off Kanagawa", "A woodblock print, made in Japan around 1831 by the artist Hokusai.", 0.25);
  const sB = screen(`${lessonTop(0.6)}<div class="ls-pic" style="height:360px"><img src="img/wave.jpg" alt=""><span class="lens" style="left:110px;top:150px"></span><span class="lens-tag" style="left:196px;top:304px">Mount Fuji</span></div><p class="ls-k" style="top:510px">Look closer</p><p class="ls-p" style="top:536px">Under the great wave sits a small peak: Mount Fuji, the subject of the whole series.</p><div class="cta">Continue</div>`);
  const lens = sB.querySelector(".lens"), lensTag = sB.querySelector(".lens-tag");
  set(lensTag, { opacity: 0, y: 10 });
  show(sA, 4.6);
  press(sA, 7.3);
  show(sB, 7.6);
  tl.to(lens, { x: 142, y: 95, duration: 1.2, ease: "power3.inOut" }, 8.2);
  tl.to(lensTag, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, 9.4);
  press(sB, 10.5);
  press(reward(STORY[0], 10.8), 13.7);
  const sG = screen(`${head(2)}<p class="gt">Where and when?</p><img class="og-pic" src="img/wave.jpg" alt="" style="top:166px;height:190px">
    <p class="og-l" style="top:374px">Where?</p><div class="og-map" style="top:396px;height:120px"><img src="img/world.png" alt="" style="height:120px"></div>
    <p class="og-l" style="top:536px">When?</p><p class="og-yr" style="top:530px">1500</p>
    <div class="og-track" style="top:576px"><i class="og-fill"></i><i class="og-knob"></i></div><div class="og-ends" style="top:596px"><span>1500</span><span>2000</span></div><div class="cta">Lock in</div>`);
  const oPin = add(sG.querySelector(".og-map"), `<span style="position:absolute;left:290px;top:39px">${I.pin}</span>`);
  const oFill = sG.querySelector(".og-fill"), oKnob = sG.querySelector(".og-knob"), oYr = sG.querySelector(".og-yr"), yr = { v: 1500 };
  set(oPin, { y: -60, opacity: 0 }); set(oFill, { scaleX: 0 });
  show(sG, 14.0);
  tl.to(oPin, { y: 0, opacity: 1, duration: 0.6, ease: "bounce.out" }, 14.9);
  tl.to(oFill, { scaleX: 0.662, duration: 1.0, ease: "power2.inOut" }, 15.5);
  tl.to(oKnob, { x: 0.662 * 350, duration: 1.0, ease: "power2.inOut" }, 15.5);
  tl.to(yr, { v: 1831, duration: 1.0, ease: "power2.inOut", onUpdate: () => { oYr.textContent = Math.round(yr.v); } }, 15.5);
  okBar(sG, "Spot on: Japan, 1831", 17.0);

  // Ask anything, in the app: the question is typed; the rest goes as the film's square did.
  const sS = screen(`<div class="gh"><span class="ib">${I.x}</span><span></span><span></span></div><h3 class="sr-h">Ask anything</h3>
    <div class="sr-f">${I.search}<span class="sr-q"></span><span class="sr-go">Go</span></div><p class="sr-k">People are asking</p>
    ${STORY.slice(1).map((S, j) => `<div class="sr-s" style="top:${310 + j * 70}px">${S.ask}</div>`).join("")}`);
  const srQ = sS.querySelector(".sr-q"), srGo = sS.querySelector(".sr-go");
  show(sS, 23.2);
  const typed = { n: 0, k: 1 };
  const type = () => { srQ.textContent = STORY[typed.k].ask.slice(0, Math.round(typed.n)); };
  const RANK = [["K2", "8,611 m", 1], ["Mont Blanc", "4,806 m", 3], ["Mount Everest", "8,849 m", 0], ["Kilimanjaro", "5,895 m", 2]];
  const GAMES = [null,
    (t) => {
      const g = screen(`${head(1)}<p class="gt">Tallest first</p>${RANK.map(([n, h], i) => `<div class="rk" style="top:${178 + i * 78}px">${n}<span>${h}</span></div>`).join("")}<div class="cta">Check</div>`);
      show(g, t);
      g.querySelectorAll(".rk").forEach((r, i) => tl.to(r, { y: (RANK[i][2] - i) * 78, duration: 0.8, ease: "power3.inOut" }, t + 1.2));
      okBar(g, "Right: Everest, then K2", t + 2.4);
    },
    (t) => {
      const g = screen(`${head(1)}<p class="gt">True or false?</p><div class="tf-card">Most of an octopus's neurons are in its arms, not its head.</div><div class="tf" style="left:16px"><span class="opt-on" style="border-radius:22px"></span><span style="position:relative">True</span></div><div class="tf" style="left:202px">False</div><div class="cta">Check</div>`);
      show(g, t); tl.to(g.querySelector(".opt-on"), { opacity: 1, duration: 0.3 }, t + 1.1);
      okBar(g, "True: about two-thirds", t + 2.0);
    },
    (t) => {
      const g = screen(`${head(1)}<p class="gt">The first picture of a black hole was taken in…</p>${["1919", "1969", "2019"].map((n, i) => `<div class="opt" style="top:${226 + i * 80}px"><span class="opt-on"></span><span style="position:relative">${n}</span><i style="position:relative">${I.check}</i></div>`).join("")}<div class="cta">Check</div>`);
      const o = g.querySelectorAll(".opt")[2];
      show(g, t);
      tl.to(o.querySelector(".opt-on"), { opacity: 1, duration: 0.25 }, t + 1.1); tl.to(o.querySelector("svg"), { opacity: 1, duration: 0.25 }, t + 1.1);
      okBar(g, "2019: Messier 87's black hole", t + 2.0);
    }];
  const LESSON = [null,
    ["Lesson · Mountains", "The roof of the world", "Mount Everest stands 8,849 m above the sea, and the plates beneath still push it higher."],
    ["Lesson · Molluscs", "Three hearts, blue blood", "An octopus has three hearts, and the copper in its blood turns it blue."],
    ["Lesson · Stars", "When a star collapses", "When a giant star runs out of fuel, its core can fall in on itself and become a black hole."]];
  STORY.slice(1).forEach((S, j) => {
    const k = j + 1, t0 = LOOP + j * CYCLE;
    tl.set(typed, { k, n: 0, onComplete: type }, t0 + 0.3);
    tl.to(typed, { n: S.ask.length, duration: 1.7, ease: "none", onUpdate: type }, t0 + 0.5);
    tl.to(srGo, { scale: 0.9, duration: 0.12 }, t0 + 2.4).to(srGo, { scale: 1, duration: 0.35, ease: "back.out(3)" }, t0 + 2.52);
    const ls = lesson(S.img, ...LESSON[k], 0.3);
    show(ls, t0 + 2.8); press(ls, t0 + 6.3);
    press(reward(S, t0 + 6.6), t0 + 9.3);
    GAMES[k](t0 + 9.6);
    tl.set(typed, { n: 0, onComplete: type }, t0 + 14.0);
    show(sS, t0 + 14.1);
  });

  tl.set({}, {}, DUR);
  window.__timelines = window.__timelines || {};
  window.__timelines.main = tl;
})();
