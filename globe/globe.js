/* Crux — the hero globe. A camera over a planet tiled with every topic on the map, drawn as the
   about tour's map is: each field (demo/map-data.js) holds its own picture (demo/img/fields.webp)
   across its land, fields meet at thin seams and squares within a field touch, and a tint over
   each square says how well it is known — a scale of blues where it is new to you, then sand and
   gold, to the picture itself. On a loop, forever: a tile is picked out and a tooltip runs it
   through Learn (one of the app's real lessons, globe/lessons.js), Play (its game) and Next; the
   tile clears, its field brightens in a wave, and what's next lights up on the map (next, a gap,
   the frontier). One is taken, and the loop goes on there.

   One WebGL2 canvas: a full-screen pass for the sky, its halo and the globe's body, then every
   tile as one instanced quad whose state lives in two small buffers that only upload where they
   changed. Words (tooltip, chips, count) are DOM on top, placed by the same projection each frame.
   Runs only while on screen; a still frame for reduced motion.

   Tuning in the URL: ?n= tiles round the globe, ?h= camera height, ?look= degrees down, ?spin= deg/s,
   ?start= a field to begin on, ?game= order|match|estimate to watch one kind. */
(() => {
'use strict';
const root = document.querySelector('[data-globe]');
const MAP = window.CRUX_MAP;
if (!root || !MAP) return;
const canvas = root.querySelector('canvas');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
if (!gl) { root.classList.add('is-flat'); return; }

const qs = new URLSearchParams(location.search);
const num = (k, d) => { const v = parseFloat(qs.get(k)); return Number.isFinite(v) ? v : d; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// The look and pace of it, in one place.
const tune = {
  look: num('look', 74), lens: .46, turn: 0, sway: 0, wash: .07, horizon: .45,   // camera (look, turn in degrees)
  known: .4, spread: 1.9, strength: 3.1, shade: 3, seams: 0, wave: 1,                // land
  pace: 1, haze: .37, paused: false, side: 'auto', names: 14,                        // the loop
};
let running = false, onScreen = true, last = 0, raf = 0;   // the loop's state

// ── The globe: rings of square tiles round the X axis, so the surface rolls toward the camera.
// It is drawn out sideways (an ellipsoid WIDE times as long across as it is deep), so seen from high
// up and nearly straight down it reads as a map, curving away only gently at its edges.
const TAU = Math.PI * 2;
const RING = Math.round(num('n', 440));            // tiles round the globe
const D = TAU / RING;                              // one tile, in radians
let WIDE_AT = num('wide', 2.2), WIDE = WIDE_AT;   // WIDE_AT on the map; it rounds to 1, a sphere, on the way out
const HALF = Math.ceil(num('across', 1.15) / D);   // rows each side of the middle, as far across as the view reaches
const ROWS = HALF * 2 + 1;                          // rows across, the middle one under the camera
const N = RING * ROWS;                              // tile i = column c * ROWS + row r
let H = num('h', 0.335);                             // camera height over a unit globe
let SPIN = num('spin', 0.32) * Math.PI / 180;       // radians a second
let DIP = Math.acos(1 / (1 + H));                   // how far away the horizon is
let DH = Math.sqrt((1 + H) * (1 + H) - 1);          // and how far, in a straight line

const thetaOf = c => c * D;
const phiOf = r => (r - HALF) * D;
const sph = (th, ph) => { const u = ph / WIDE; return [WIDE * Math.sin(u), Math.cos(u) * Math.cos(th), Math.cos(u) * Math.sin(th)]; };
const normalAt = w => [w[0] / (WIDE * WIDE), w[1], w[2]];   // the surface's outward direction (unnormalised)
const wrapC = dc => dc - RING * Math.round(dc / RING);
const mod = (a, m) => ((a % m) + m) % m;
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ── Fields: regions a few squares across, as the tour's fields are, each one field of the app's
// 76 holding its picture. Seeds sit on a jittered grid; domains come in broad patches; and no
// field is used twice within APART tiles, so a picture never repeats in view.
const F = MAP.f, NF = F.length;
const SP = Math.max(3, Math.round(num('field', 8)));          // a region's size, in tiles
const APART = num('apart', 44);
const GW = Math.floor(RING / SP), GH = Math.ceil(ROWS / SP);
const byDomain = MAP.d.map((_, d) => F.map((f, i) => i).filter(i => F[i][2] === d));
const vnP = (x, y, P) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf), x0 = mod(xi, P), x1 = mod(xi + 1, P);
  const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const regions = [];   // { f, seed: [column, row] }, one per grid cell: region g = gx * GH + gy
for (let gx = 0; gx < GW; gx++) for (let gy = 0; gy < GH; gy++)
  regions.push({ f: -1, seed: [gx * SP + SP / 2 + (hash(gx, gy + 99) - .5) * SP * .8, gy * SP + SP / 2 + (hash(gx + 99, gy) - .5) * SP * .8] });
{
  const uses = new Int32Array(NF), reach = Math.ceil(APART / SP) + 1;
  for (let gx = 0; gx < GW; gx++) for (let gy = 0; gy < GH; gy++) {
    const g = gx * GH + gy, sd = regions[g].seed, near = new Set();
    for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) {
      const y = gy + b; if (y < 0 || y >= GH) continue;
      const o = regions[mod(gx + a, GW) * GH + y];
      if (o.f >= 0 && Math.hypot(wrapC(o.seed[0] - sd[0]), o.seed[1] - sd[1]) < APART) near.add(o.f);
    }
    const d = Math.min(MAP.d.length - 1, Math.floor(vnP(gx * 32 / GW, gy * .3 + 5, 32) * MAP.d.length));
    const free = F.map((_, f) => f).filter(f => !near.has(f));
    const inD = free.filter(f => F[f][2] === d);
    const pool = inD.length ? inD : free.length ? free : byDomain[d];
    let best = pool[0], bs = Infinity;
    for (const f of pool) { const sc = uses[f] + hash(f, g) * .9; if (sc < bs) { bs = sc; best = f; } }
    regions[g].f = best; uses[best]++;
  }
}
const NR = regions.length;
const regionOf = new Uint16Array(N), fieldOf = new Uint8Array(N);
for (let c = 0; c < RING; c++) {
  const gx = Math.floor(c / SP);
  for (let r = 0; r < ROWS; r++) {
    const gy = Math.floor(r / SP);
    let bg = 0, bd = Infinity;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const y = gy + b; if (y < 0 || y >= GH) continue;
      const g = mod(gx + a, GW) * GH + y, sd = regions[g].seed, dx = wrapC(c + .5 - sd[0]), dy = r + .5 - sd[1], dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; bg = g; }
    }
    regionOf[c * ROWS + r] = bg; fieldOf[c * ROWS + r] = regions[bg].f;
  }
}

// Each region's middle (column, row) and its size across, for the place names.
const regionMid = regions.map(() => [0, 0, 0]);
{
  const n = new Float64Array(NR);
  for (let i = 0; i < N; i++) { const g = regionOf[i], c = Math.floor(i / ROWS); regionMid[g][0] += wrapC(c - regions[g].seed[0]); regionMid[g][1] += i % ROWS; n[g]++; }
  regionMid.forEach((m, g) => { if (n[g]) { m[0] = regions[g].seed[0] + m[0] / n[g]; m[1] /= n[g]; } m[2] = Math.sqrt(n[g]); });
}
// Each region shows its field's picture once, across the whole of its land (as the tour does), and
// each tile notes which of its sides meet another field, where a thin seam is drawn.
const AT = MAP.atlas, ATW = AT.cols * (AT.cell + 2 * AT.pad);
const box = regions.map(() => [Infinity, -Infinity, Infinity, -Infinity]);
for (let i = 0; i < N; i++) {
  const g = regionOf[i], c = Math.floor(i / ROWS), r = i % ROWS, dx = wrapC(c - regions[g].seed[0]), b = box[g];
  if (dx < b[0]) b[0] = dx; if (dx > b[1]) b[1] = dx; if (r < b[2]) b[2] = r; if (r > b[3]) b[3] = r;
}
const cellOrigin = f => [(f % AT.cols) * (AT.cell + 2 * AT.pad) + AT.pad, Math.floor(f / AT.cols) * (AT.cell + 2 * AT.pad) + AT.pad];
// The sea's depth: a smooth height, periodic round the ring, evened out so each blue covers as much.
const depth = new Float32Array(N);
for (let c = 0; c < RING; c++) for (let r = 0; r < ROWS; r++)
  depth[c * ROWS + r] = vnP(c * 48 / RING, r * .045, 48) * .7 + vnP(c * 128 / RING, r * .11 + 3.1, 128) * .3;
{ const order = Array.from(depth.keys()).sort((a, b) => depth[a] - depth[b]); order.forEach((i, k) => { depth[i] = k / N; }); }
const statics = new Float32Array(N * 8);
function staticAt(i) {
  const g = regionOf[i], f = fieldOf[i], c = Math.floor(i / ROWS), r = i % ROWS, b = box[g];
  const bw = b[1] - b[0] + 1, bh = b[3] - b[2] + 1, s = Math.max(bw, bh);
  const u = (r - b[2] + (s - bh) / 2) / s, v = (wrapC(c - regions[g].seed[0]) - b[0] + (s - bw) / 2) / s;
  const [ox, oy] = cellOrigin(f), cs = AT.cell / s;
  const other = j => j >= 0 && regionOf[j] !== g ? 1 : 0;
  const seams = other(mod(c - 1, RING) * ROWS + r) + 2 * other(mod(c + 1, RING) * ROWS + r) + 4 * other(r > 0 ? i - 1 : -1) + 8 * other(r < ROWS - 1 ? i + 1 : -1);
  statics.set([thetaOf(c), phiOf(r), (ox + AT.cell * u) / ATW, (oy + AT.cell * v) / ATW, cs / ATW, cs / ATW, depth[i], seams], i * 8);
}
for (let i = 0; i < N; i++) staticAt(i);

// Lessons: the app's own (globe/lessons.js), one per tile that is played, from the tile's field,
// with a picture where there is one; the game kinds take turns.
const LESSONS = window.CRUX_LESSONS || [];
const lessonsOf = F.map(() => []);
LESSONS.forEach(l => { const f = F.findIndex(x => x[0] === l.f); if (f >= 0) lessonsOf[f].push(l); });
const hasLesson = i => lessonsOf[fieldOf[i]].length > 0;
const GAMES = qs.get('game') ? [qs.get('game')] : ['order', 'estimate', 'match'];
let gameTurn = 0;
const lessonOf = new Map();
function lessonFor(i, avoid = []) {
  if (lessonOf.has(i)) return lessonOf.get(i);
  const ls = lessonsOf[fieldOf[i]];
  if (!ls.length) return null;
  const want = GAMES[gameTurn % GAMES.length], o = Math.floor(hash(i, 7) * ls.length);
  let pick = null, ps = -1;
  for (let j = 0; j < ls.length; j++) {
    const l = ls[(o + j) % ls.length];
    if (avoid.includes(l.title)) continue;
    const sc = (l.game.k === want ? 2 : 0) + (l.img ? 1 : 0);
    if (sc > ps) { ps = sc; pick = l; }
  }
  pick = pick || ls[o];
  lessonOf.set(i, pick);
  return pick;
}

// ── What is known: by field, rolling gently across the land, with no holes. Each column is
// reseeded as it passes round the back (unseen), so new land always comes over the horizon.
const S = new Float32Array(N * 4);   // known, warmth, picked, flash
const R = new Float32Array(N * 4);   // recommendation kind, amount, phase, and 1 for a tile of a highlighted region
let dirtyLo = 0, dirtyHi = N - 1;
const dirty = i => { if (i < dirtyLo) dirtyLo = i; if (i > dirtyHi) dirtyHi = i; };
// How well a region is known: broad lands of knowledge from a smooth noise read at the region's
// own seed (so a region is all one), along the unrolled strip, so each lap brings new lands.
const familiar = (g, U, c) => {
  const sd = regions[g].seed, su = U + wrapC(sd[0] - c), n = vnP(su * .055 + 400, sd[1] * .07 + 2.3, 1 << 20);
  return n > tune.known ? Math.min(.95, .32 + (n - tune.known) * 3) : 0;
};
function seedColumn(c, L) {
  const U = c - L * RING;
  for (let r = 0; r < ROWS; r++) {
    const i = c * ROWS + r, fam = familiar(regionOf[i], U, c);
    const roll = Math.sin(U * .07 + 1.1) * Math.cos(r * .09 + 2) * .14 + (hash(U, r) - .5) * .12;
    S[i * 4] = fam ? Math.max(.14, Math.min(1, fam + roll)) : 0;
    S[i * 4 + 2] = 0; S[i * 4 + 3] = 0;
    R[i * 4] = 0; R[i * 4 + 1] = 0; R[i * 4 + 2] = hash(i, 3) * TAU;
  }
  dirty(c * ROWS); dirty(c * ROWS + ROWS - 1);
}
// Start with a field (?start=slug) a little ahead of the camera.
// The first lesson's field (?first=<title>) is laid where the land in view is made from.
const FIRST = LESSONS.find(l => l.title === (qs.get('first') || 'Volcanoes')) || null;
const startF = Math.max(0, F.findIndex(f => f[0] === (qs.get('start') || (FIRST ? FIRST.f : 'visual-arts'))));
let spin = -8 * Math.PI / 180 - (regions.find(g => g.f === startF && Math.abs(g.seed[1] - HALF) < SP) || regions[0]).seed[0] * D;
const colLap = new Float64Array(RING);
const lapOf = c => Math.floor((thetaOf(c) + spin - Math.PI) / TAU);
const seedAll = () => { for (let c = 0; c < RING; c++) { colLap[c] = lapOf(c); seedColumn(c, colLap[c]); } };
// Heat: how near each tile is to what is known, as in the map studio — the known field blurred
// (a separable Gaussian, HR tiles each way), so known land's edges glow and it fades out into
// the dark. Kept in each tile's second slot; recomputed where knowledge changes.
let HR = 14, GK = [];
const setSpread = sigma => { HR = Math.ceil(sigma * 2.5); const g = []; for (let j = -HR; j <= HR; j++) g.push(Math.exp(-j * j / (2 * sigma * sigma))); const t = g.reduce((a, b) => a + b); GK = g.map(v => v / t); };
setSpread(tune.spread);
const tmpH = new Float32Array(N);
function heatCols(c0, c1) {
  for (let cc = c0 - HR; cc <= c1 + HR; cc++) {
    const c = mod(cc, RING);
    for (let r = 0; r < ROWS; r++) {
      let t = 0;
      for (let j = -HR; j <= HR; j++) { const rr = r + j; if (rr >= 0 && rr < ROWS) t += Math.min(1, S[(c * ROWS + rr) * 4]) * GK[j + HR]; }
      tmpH[c * ROWS + r] = t;
    }
  }
  for (let cc = c0; cc <= c1; cc++) {
    const c = mod(cc, RING);
    for (let r = 0; r < ROWS; r++) {
      let t = 0;
      for (let j = -HR; j <= HR; j++) t += tmpH[mod(cc + j, RING) * ROWS + r] * GK[j + HR];
      S[(c * ROWS + r) * 4 + 1] = 1 - Math.exp(-tune.strength * t);
    }
    dirty(c * ROWS); dirty(c * ROWS + ROWS - 1);
  }
}
// Where knowledge is changing (a ripple, a gap surfacing), heat is redone each frame for a while.
let heatZones = [];
const warmAround = (c, w, secs) => heatZones.push({ c, w, until: clock + secs });
// Open on a view with some known land in it, and plenty still to learn: step round until the
// ground ahead is between a sixth and a half known.
for (let tries = 0; tries < 80; tries++) {
  seedAll();
  // known land in the middle distance and some in front, where the play happens
  const share = (a0, a1) => { let k = 0, n = 0; for (let a = a0; a <= a1; a += .5) { const c = mod(Math.round((-a * Math.PI / 180 - spin) / D), RING); for (let r = HALF - 30; r <= HALF + 30; r++) { n++; if (S[(c * ROWS + r) * 4] >= .1) k++; } } return k / n; };
  const mid = share(4, 9), front = share(2.5, 4);
  if (mid > .22 && mid < .6 && front > .08) break;
  spin -= 23 * D;
}
heatCols(0, RING - 1);

// ── GL ───────────────────────────────────────────────────────────────────────────────────────
const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
const CAM = `uniform vec3 uEye, uRight, uUp, uFwd; uniform vec2 uTan; uniform float uDh, uHaze, uShift, uWide;`;

const skyP = prog(`#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`,
`#version 300 es
precision highp float;
${CAM}
uniform vec2 uRes; uniform vec3 uPaper, uBase, uHalo; uniform float uBody;
out vec4 o;
void main(){
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 dir = normalize(uFwd + ndc.x * uTan.x * uRight + (ndc.y - uShift) * uTan.y * uUp);
  // against the drawn-out globe: squeeze x, and it is the unit sphere
  vec3 s = vec3(1.0 / uWide, 1.0, 1.0), e = uEye * s, d = dir * s;
  float a = dot(d, d), b = dot(e, d) / a, e2 = dot(e, e);
  float dmin = sqrt(max(e2 - b * b * a, 0.0));
  float lift = max(dmin - 1.0, 0.0);
  vec3 sky = mix(uPaper, uHalo, exp(-lift / 0.0025) * 0.85 + exp(-lift / 0.014) * 0.3);
  float t = -b - sqrt(max(b * b - (e2 - 1.0) / a, 0.0));
  vec3 ground = mix(uBase, uPaper, pow(smoothstep(0.62 * uDh, 1.0 * uDh, t), 1.5) * uHaze);
  float edge = fwidth(dmin) * 0.9;
  float hit = b < 0.0 ? 1.0 - smoothstep(1.0 - edge, 1.0 + edge, dmin) : 0.0;
  o = vec4(mix(uPaper, mix(sky, ground, hit), uBody), 1.0);   // uBody: 0 is the bare page, before the map is made
}`);

const tileP = prog(`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec2 aCell;
layout(location=2) in vec4 aAtlas;
layout(location=3) in vec4 aState;
layout(location=4) in vec4 aRec;
layout(location=5) in vec2 aTopo;
${CAM}
uniform float uSpin, uStep, uNear, uFar;
uniform vec4 uWave;
uniform float uShadeK;
uniform float uWaveA;
uniform vec3 uLight;
uniform vec3 uGrow;   // the making of the map: seconds in, and where it starts (theta, phi of a cell)
out vec2 vUV, vTopo; out vec4 vAtlas, vS, vR; out float vFog, vFacing, vShade, vWave, vDevelop;
vec3 sph(float th, float ph){ float u = ph / uWide; return vec3(uWide * sin(u), cos(u) * cos(th), cos(u) * sin(th)); }
vec3 nrm(vec3 p){ return normalize(vec3(p.x / (uWide * uWide), p.y, p.z)); }
void main(){
  vec3 wc = sph(aCell.x + uSpin, aCell.y);
  if (dot(nrm(wc), normalize(uEye - wc)) < -0.03) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // Tiles are laid outward from one point, each springing up to size; then what you know develops on them.
  float da = mod(aCell.x - uGrow.y + 3.14159265, 6.28318531) - 3.14159265;
  float far = length(vec2(da, aCell.y - uGrow.z)), jit = fract(sin(dot(aCell, vec2(127.1, 311.7))) * 43758.5453);
  float g = clamp((uGrow.x - 0.35 - far * 3.2 - jit * 0.35) / 0.75, 0.0, 1.0);
  float lay = 1.0 + 2.2 * pow(g - 1.0, 3.0) + 1.2 * pow(g - 1.0, 2.0);   // ease out, a touch past full, back
  vDevelop = smoothstep(0.0, 1.0, (uGrow.x - 1.7 - far * 3.0 - jit * 0.6) / 1.1);
  if (g <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 k = aCorner * 1.004 * lay;   // a hair over, so neighbours meet with no crack
  vec3 p = sph(aCell.x + uSpin + k.y * uStep, aCell.y + k.x * uStep);
  vec3 rel = p - uEye;
  float cz = dot(rel, uFwd);
  gl_Position = vec4(dot(rel, uRight) / uTan.x, dot(rel, uUp) / uTan.y + uShift * cz, (cz * (uFar + uNear) - 2.0 * uFar * uNear) / (uFar - uNear), cz);
  vUV = aCorner; vAtlas = aAtlas; vS = aState; vR = aRec; vTopo = aTopo;
  vFog = pow(smoothstep(0.62 * uDh, 1.0 * uDh, length(rel)), 1.5) * uHaze;
  vFacing = dot(nrm(p), normalize(uEye - p));
  vShade = 1.0 + uShadeK * (0.06 * dot(nrm(wc), uLight) - 0.04);
  vec3 nc = sph(aCell.x, aCell.y);
  vWave = uWaveA * exp(-pow((length(nc - uWave.xyz) - uWave.w) / (2.2 * uStep), 2.0));
}`,
`#version 300 es
precision highp float;
in vec2 vUV, vTopo; in vec4 vAtlas, vS, vR; in float vFog, vFacing, vShade, vWave, vDevelop;
uniform sampler2D uAtlas;
uniform float uTime, uPics;
uniform vec3 uPaper, uInk, uSeam, uGap;
uniform float uSeamK;
uniform vec3 uFill[5], uRing[5], uRamp[4];
out vec4 o;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// The land's scale, in steps as the Map Studio draws it: plain paper where nothing near is known,
// then four steps of mint, pale to deep, toward the edge of what you know.
vec3 rampAt(float t){
  t = clamp(t, 0.0, 1.0);
  if (t < 0.14) return uRamp[0];
  float q = floor((t - 0.14) / 0.86 * 3.0 + 0.5) / 3.0;
  return q < 0.5 ? mix(uRamp[1], uRamp[2], q * 2.0) : mix(uRamp[2], uRamp[3], (q - 0.5) * 2.0);
}
void main(){
  if (vFacing < 0.0) discard;
  vec2 fw = fwidth(vUV);
  float px = max(max(fw.x, fw.y), 1e-5), aa = px * 0.8;
  float d = sdRR(vUV, vec2(0.5), 0.06);
  float k = vS.x;
  vec3 pic = mix(vec3(0.92), texture(uAtlas, vAtlas.xy + (vUV + 0.5) * vAtlas.zw).rgb, uPics);
  // Locked: a flat square from the scale, a hairline of paper round it so each reads on its own.
  // Known: its picture, coming in from mint as it is learnt, the squares joined into one picture.
  float heat = vS.y * vDevelop, gw = max(0.9 * px, 0.03);
  vec3 lockedCol = mix(rampAt(heat), uGap, smoothstep(-gw - aa, -gw + aa, d));
  vec3 knownCol = mix(mix(uRamp[3], pic, 0.45), pic, smoothstep(0.1, 0.55, k));
  vec3 col = k < 0.1 ? lockedCol : mix(lockedCol, knownCol, vDevelop);
  col *= vShade;
  int kind = int(vR.x + 0.5);
  if (kind > 0) {
    float pulse = 0.72 + 0.28 * sin(uTime * 2.4 + vR.z);
    if (vR.w > 0.5) {
      // a tile of a highlighted region (its field there): a wash of the colour, and the region's edge drawn
      col = mix(col, uFill[kind], vR.y * 0.3 * (0.8 + 0.2 * pulse));
      int se = int(vTopo.y + 0.5);
      float ew = max(2.4 * px, 0.08), e = 0.0;
      if ((se & 1) != 0) e = max(e, 1.0 - smoothstep(ew - aa, ew + aa, vUV.y + 0.5));
      if ((se & 2) != 0) e = max(e, 1.0 - smoothstep(ew - aa, ew + aa, 0.5 - vUV.y));
      if ((se & 4) != 0) e = max(e, 1.0 - smoothstep(ew - aa, ew + aa, vUV.x + 0.5));
      if ((se & 8) != 0) e = max(e, 1.0 - smoothstep(ew - aa, ew + aa, 0.5 - vUV.x));
      col = mix(col, uRing[kind], vR.y * vR.y * e);   // the edge firms up after the wash, so the field's outline draws in softly
    } else {
      col = mix(col, uFill[kind], vR.y * 0.85 * pulse);
      float rw = max(2.2 * px, 0.07);
      col = mix(col, uRing[kind], vR.y * smoothstep(-rw - aa, -rw + aa, d));
    }
  }
  float sw = max(3.0 * px, 0.09), iw = max(5.5 * px, 0.16);
  col = mix(col, vec3(1.0), vS.z * (0.16 + 0.1 * sin(uTime * 3.0)) * (1.0 - smoothstep(-iw - aa, -iw + aa, d)));
  col = mix(col, vec3(1.0), vS.z * smoothstep(-iw - aa, -iw + aa, d));
  col = mix(col, uInk, vS.z * smoothstep(-sw - aa, -sw + aa, d));
  col = mix(col, vec3(1.0), clamp(vS.w + vWave * 0.75, 0.0, 1.0));
  // Seams where another field begins: thin, paper-coloured, gone when the tile is tiny.
  int sm = int(vTopo.y + 0.5);
  float g = max(0.9 * px, 0.045), seam = 0.0;
  if ((sm & 1) != 0) seam = max(seam, 1.0 - smoothstep(g - aa, g + aa, vUV.y + 0.5));
  if ((sm & 2) != 0) seam = max(seam, 1.0 - smoothstep(g - aa, g + aa, 0.5 - vUV.y));
  if ((sm & 4) != 0) seam = max(seam, 1.0 - smoothstep(g - aa, g + aa, vUV.x + 0.5));
  if ((sm & 8) != 0) seam = max(seam, 1.0 - smoothstep(g - aa, g + aa, 0.5 - vUV.x));
  col = mix(col, k < 0.1 ? mix(col, vec3(1.0), 0.16) : uSeam, seam * uSeamK * smoothstep(3.0, 9.0, 1.0 / px));
  col = mix(col, uPaper, vFog);
  o = vec4(col, 1.0);
}`);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const buf = (data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
buf(new Float32Array([-.5, -.5, .5, -.5, -.5, .5, .5, .5]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const staticBuf = buf(statics, gl.STATIC_DRAW);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(1, 1);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 8); gl.vertexAttribDivisor(2, 1);
gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 2, gl.FLOAT, false, 32, 24); gl.vertexAttribDivisor(5, 1);
const sBuf = buf(S, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(3, 1);
const rBuf = buf(R, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(4, 1);
gl.bindVertexArray(null);

const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([237, 237, 237, 255]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
const atlasUrl = root.dataset.atlas || new URL('../demo/img/fields.webp', document.currentScript ? document.currentScript.src : location.href).href;   // demo/ is this folder's sibling
const img = new Image();
img.decoding = 'async';
img.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  root.classList.add('is-ready');
  if (reduced) uni.pics = 1; else tween(uni, 'pics', 1, 1.4, 0, ease.inOut);
  if (!running) draw();
};
img.src = atlasUrl;

const U = {};
for (const p of [skyP, tileP]) {
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), key = p === skyP ? 'sky' : 'tile';
  U[key] = {};
  for (let j = 0; j < n; j++) { const a = gl.getActiveUniform(p, j); U[key][a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name); }
}
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const C = {
  paper: hex('#f2f1ed'), halo: hex('#fbfaf7'), base: hex('#efeee8'), seam: hex('#f4f3ef'), ink: hex('#151515'), gap: hex('#fbfaf7'),
  // kinds: 1 next (kiwi), 2 gap (coral), 3 frontier (gold)
  // and 4: the field in play, the region of the tile being learnt
  fill: [[0, 0, 0], hex('#8ed643'), hex('#ff7267'), hex('#fec84b'), hex('#ffffff')].flat(),
  ring: [[0, 0, 0], hex('#447202'), hex('#c73834'), hex('#856302'), hex('#151515')].flat(),
  // the scale for locked tiles, after the Map Studio: unknown (paper), then kiwi in steps to the edge of the known
  ramp: ['#efeee8', '#e5ecd8', '#c2df9a', '#8ed643'].map(hex).flat(),
};
// Dark mode (the page's [data-theme], else the system's): the same map at night — dark squares on darker
// seams, the kiwi steps deepened, the field in play outlined in light. Pictures are the same.
const LIGHT_C = { paper: C.paper, halo: C.halo, base: C.base, gap: C.gap, ramp: C.ramp, fill4: hex('#ffffff'), ring4: hex('#151515') };
const DARK_C = { paper: hex('#151515'), halo: hex('#22221f'), base: hex('#1e1e1c'), gap: hex('#141413'),
  ramp: ['#21211f', '#262c1f', '#3d5426', '#6fad29'].map(hex).flat(), fill4: hex('#3a3a37'), ring4: hex('#f2f1ed') };
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
function applyTheme() {
  const T = isDark() ? DARK_C : LIGHT_C;
  Object.assign(C, { paper: T.paper, halo: T.halo, base: T.base, gap: T.gap, ramp: T.ramp });
  C.fill.splice(12, 3, ...T.fill4); C.ring.splice(12, 3, ...T.ring4);
}
applyTheme();
const LIGHT = (() => { const v = [-.35, .85, -.4], l = Math.hypot(...v); return v.map(x => x / l); })();

// ── Camera ───────────────────────────────────────────────────────────────────────────────────
let W = 1, Hh = 1, dpr = 1, tanX = .6, tanY = .35, narrow = false;
const cam = { eye: [0, 1 + H, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] };
// Grow pulls the camera up and back over the flat map (zoom, 0 to 1); leaving (exit.v) lifts it on
// until the whole map is a globe below it, and darkens the page into the next section
const zoom = { v: 0 };
const exit = { v: 0, to: 0 };
const globeK = () => exit.v;
const camHeight = () => H * (1 + 1.6 * zoom.v) * (1 - exit.v) + 3.2 * exit.v;
let yaw = 0;
root.style.setProperty('--gl-wash', tune.wash);
// The framing: the camera looks LOOK degrees down (90 is straight down at the map), and the image
// is then slid down, as a view camera's lens shift does, until the horizon sits below the start
// button. The view keeps its steep angle; the sky behind the headline is what the slide uncovers.
const horizonShare = () => Math.max(narrow ? .3 : tune.horizon, (copyBottom + (narrow ? 26 : 34)) / Hh);   // never above the start button
// The map is made in front of you: the page is bare, the land rises out of it, tiles are laid out
// from the middle of the view, then what you know develops on them (GROW_END s in all).
const GROW_END = 4.6;
const grow = { t: reduced ? 99 : 0, th: 0, ph: 0 };
// Scrolling on: the hero holds (it is sticky over a runway, [data-globe-scroll]) while the camera
// tips straight down onto the same map, and How it works comes in beside it ([data-globe-how]).
// From there scrolling plays one turn, step by step (explainTo): the lesson, the game, the map
// growing and what's next; scrolling back takes it back. Then the page scrolls on.
const runway = reduced ? null : root.closest('[data-globe-scroll]');   // no runway under reduced motion (globe.css)
const how = root.querySelector('[data-globe-how]');
const EXPLAIN = .25;   // how far down the runway the explaining starts
const EXIT = .78;      // and where it ends: from here the map rounds into a globe and the page moves on
let scrolled = 0, explaining = false, heroKept = new Map();   // heroKept: what each square the hero filled was before   // 0 at rest, 1 at the runway's end
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// The page scrolls freely; the scene follows it eased (scrollTo, eased toward each frame in follow()),
// so however fast the page moves, the camera turns and the steps change smoothly.
let scrollGoal = 0, scrollRaw = 0;
function onScroll() {
  if (!runway) return;
  const range = runway.offsetHeight - root.offsetHeight, top = parseFloat(getComputedStyle(root).top) || 0;
  const rawTop = runway.getBoundingClientRect().top;
  scrollRaw = range > 0 ? (top - rawTop) / range : 0;
  scrollGoal = Math.min(1, Math.max(0, scrollRaw));
  if (!running) applyScroll(scrollGoal);
}
function follow(dt) {
  if (scrollGoal === scrolled) return;
  const d = scrollGoal - scrolled, v = Math.abs(d) < 1e-4 ? scrollGoal : scrolled + d * (1 - Math.exp(-dt * 5.5));
  applyScroll(v);
}
function applyScroll(v) {
  if (v === scrolled) return;
  const raw = v >= 1 ? scrollRaw : v;
  scrolled = v;
  root.style.setProperty('--gp', v.toFixed(4));
  // the tooltip and its marks step aside while the camera turns, and come back for the explaining
  const out = 1 - smooth(EXIT, EXIT + .05, v);   // the words step away as the map leaves
  root.style.setProperty('--ui', (Math.max(1 - smooth(.02, .1, v), smooth(EXPLAIN - .04, EXPLAIN + .06, v)) * out).toFixed(3));
  root.style.setProperty('--gx', (smooth(EXPLAIN - .1, EXPLAIN + .02, v) * out).toFixed(3));
  exit.to = smooth(EXIT, .97, v);
  const ex = how && v >= EXPLAIN;
  if (ex !== explaining) { explaining = ex; root.classList.toggle('is-explaining', ex); measureHow(); scrollStage = ex ? stageAt() : 0; if (ex) unfillHero(); restart(); }
  // the scroll moves the steps only when it crosses into another; between times they play themselves
  if (explaining) { const st = stageAt(); if (st !== scrollStage) { scrollStage = st; autoIdle = 0; if (st === 3 && xStage < 3) rush = 5; explainTo(st); } }   // scrolled to Grow: what is left of the game plays fast, so Grow comes at once
  // scrolled on past the last step before Grow had played out: it finishes at once, no waiting
  if (explaining && raw > 1 && xStage >= 3 && !xDone) rush = 4;
  if (!running) { setCamera(); draw(); }
}
addEventListener('scroll', onScroll, { passive: true });
// the explaining's box, in hero pixels: the map's play keeps clear of it
let howBox = [0, 0, 0, 0];
function measureHow() {
  if (!how) return;
  const r = how.getBoundingClientRect(), h = root.getBoundingClientRect();
  howBox = [r.left - h.left, r.top - h.top, r.right - h.left, r.bottom - h.top];
}
// what the land's play must stay below (the headline, or on a phone the explaining) and right of
const clearTop = () => explaining ? (narrow ? howBox[3] : 60) : copyBottom;   // looking down: clear of the top, where a pick's chip would rise into the header
const clearLeft = () => explaining && !narrow ? howBox[2] : 0;
let shift = 0;
function setCamera() {
  const he = camHeight();
  if (cam.eye[1] !== 1 + he) { cam.eye[1] = 1 + he; DIP = Math.acos(1 / (1 + he)); DH = Math.sqrt((1 + he) * (1 + he) - 1); }
  // the lens holds the height; a phone's tall, narrow frame opens it until it sees enough across
  tanY = tune.lens; tanX = tanY * W / Hh;
  if (narrow && tanX < tune.lens * .62) { tanX = tune.lens * .62; tanY = tanX * Hh / W; }
  // while the map is made the camera tips down into it, from SETTLE degrees shallower
  const settle = grow.t < GROW_END ? 14 * Math.pow(1 - grow.t / GROW_END, 3) : 0;
  const down = smooth(0, EXPLAIN - .04, scrolled), look = tune.look - settle;
  const pitch = Math.min(90, look + (90 - look) * down) * Math.PI / 180;
  const ya = yaw + tune.turn * Math.PI / 180;
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(ya), sy = Math.sin(ya);
  cam.fwd = [sy * cp, -sp, -cy * cp];
  cam.right = [cy, 0, sy];
  const f = cam.fwd, r = cam.right;
  cam.up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  // where the horizon falls unshifted (as a share of the half-height), then the slide that puts it at its mark
  const e = cam.eye, h = sph(-DIP, 0), v = [h[0] - e[0], h[1] - e[1], h[2] - e[2]];
  const hz = v[0] * f[0] + v[1] * f[1] + v[2] * f[2], hy = v[0] * cam.up[0] + v[1] * cam.up[1] + v[2] * cam.up[2];
  shift = (hz > 0 ? 1 - hy / hz / tanY - 2 * horizonShare() : 0) * (1 - down);   // let go of the horizon as it looks down
}
// World point → hero pixels (x, y), with cz > 0 when in front.
function project(p) {
  const e = cam.eye, rx = p[0] - e[0], ry = p[1] - e[1], rz = p[2] - e[2];
  const cz = rx * cam.fwd[0] + ry * cam.fwd[1] + rz * cam.fwd[2];
  const cx = rx * cam.right[0] + ry * cam.right[1] + rz * cam.right[2];
  const cy = rx * cam.up[0] + ry * cam.up[1] + rz * cam.up[2];
  return { x: (cx / cz / tanX + 1) / 2 * W, y: (1 - cy / cz / tanY - shift) / 2 * Hh, cz };
}
const worldOf = i => sph(thetaOf(Math.floor(i / ROWS)) + spin, phiOf(i % ROWS));
function tileScreen(i) {
  const w = worldOf(i), p = project(w);
  const e = cam.eye, vx = e[0] - w[0], vy = e[1] - w[1], vz = e[2] - w[2], n = normalAt(w);
  p.facing = (n[0] * vx + n[1] * vy + n[2] * vz) / Math.hypot(vx, vy, vz) / Math.hypot(...n);
  const r = i % ROWS, j = r < ROWS - 1 ? i + 1 : i - 1, q = project(worldOf(j));
  p.size = Math.hypot(q.x - p.x, q.y - p.y);   // its width on screen, from the next row's centre
  return p;
}

let copyBottom = 0, copyBoxes = [];
function resize() {
  const rect = root.getBoundingClientRect();
  W = Math.max(1, rect.width); Hh = Math.max(1, rect.height); narrow = W < 640;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
  const copy = root.querySelector('[data-globe-copy]');
  copyBottom = copy ? copy.getBoundingClientRect().bottom - rect.top : Hh * .3;
  // the ink of the headline, line by line, and the button: the hero's screen may rise beside them, never over
  copyBoxes = [];
  const head = root.querySelector('[data-globe-copy] h1'), btn = root.querySelector('[data-globe-copy] .btn');
  if (head) { const r = document.createRange(); r.selectNodeContents(head); copyBoxes.push(...r.getClientRects()); }
  if (btn) copyBoxes.push(btn.getBoundingClientRect());
  copyBoxes = copyBoxes.filter(b => b.width > 2).map(b => [b.left - rect.left, b.top - rect.top, b.right - rect.left, b.bottom - rect.top]);
  tipW = tip.offsetWidth || tipW; tipH = tip.offsetHeight || tipH;
  measureHow(); onScroll(); setCamera();
  if (!running) { draw(); if (onScreen && !document.hidden) start(); }
}

// ── Draw ─────────────────────────────────────────────────────────────────────────────────────
const uni = { wave: [0, 1, 0, 0], waveA: 0, pics: 0 };
let clock = 0;
const mix3 = (a, b, t) => a.map((x, j) => x + (b[j] - x) * t);
const NIGHT = hex('#151515'), GLOW = hex('#3a4a2a');
let paperNow = C.paper;
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  const dark = ease.inOut(Math.min(1, exit.v * 1.4));
  paperNow = mix3(C.paper, NIGHT, dark);
  if (dirtyLo <= dirtyHi) {
    gl.bindBuffer(gl.ARRAY_BUFFER, sBuf); gl.bufferSubData(gl.ARRAY_BUFFER, dirtyLo * 16, S, dirtyLo * 4, (dirtyHi - dirtyLo + 1) * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, rBuf); gl.bufferSubData(gl.ARRAY_BUFFER, dirtyLo * 16, R, dirtyLo * 4, (dirtyHi - dirtyLo + 1) * 4);
    dirtyLo = N; dirtyHi = -1;
  }
  const cs = (u) => {
    gl.uniform3fv(u.uEye, cam.eye); gl.uniform3fv(u.uRight, cam.right); gl.uniform3fv(u.uUp, cam.up); gl.uniform3fv(u.uFwd, cam.fwd);
    gl.uniform2f(u.uTan, tanX, tanY); gl.uniform1f(u.uShift, shift); gl.uniform1f(u.uWide, WIDE); gl.uniform1f(u.uDh, DH); gl.uniform1f(u.uHaze, tune.haze); gl.uniform3fv(u.uPaper, paperNow);
  };
  gl.useProgram(skyP);
  const us = U.sky;
  cs(us);
  gl.uniform2f(us.uRes, canvas.width, canvas.height);
  gl.uniform3fv(us.uBase, C.base); gl.uniform3fv(us.uHalo, mix3(C.halo, GLOW, dark)); gl.uniform1f(us.uBody, Math.min(1, Math.max(0, (grow.t - .15) / .9)));
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.useProgram(tileP);
  const ut = U.tile;
  cs(ut);
  gl.uniform3fv(ut.uLight, LIGHT);
  gl.uniform1f(ut.uSpin, spin % TAU); gl.uniform1f(ut.uStep, D); gl.uniform1f(ut.uNear, .001); gl.uniform1f(ut.uFar, 12);
  gl.uniform4fv(ut.uWave, uni.wave); gl.uniform1f(ut.uWaveA, uni.waveA);
  gl.uniform1f(ut.uTime, clock); gl.uniform1f(ut.uPics, uni.pics);
  gl.uniform3fv(ut.uInk, C.ink); gl.uniform3fv(ut.uGap, C.gap); gl.uniform3fv(ut.uSeam, C.seam); gl.uniform1f(ut.uSeamK, tune.seams); gl.uniform1f(ut.uShadeK, tune.shade);
  gl.uniform3fv(ut.uFill, C.fill); gl.uniform3fv(ut.uRing, C.ring);
  gl.uniform3fv(ut.uRamp, C.ramp); gl.uniform3f(ut.uGrow, grow.t, grow.th, grow.ph);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(ut.uAtlas, 0);
  gl.bindVertexArray(vao);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N);
  gl.bindVertexArray(null);
}

// ── Tweens and cues, on the scene's own clock (which never jumps after a hidden tab) ─────────
const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  lin: t => t,
};
let tweens = [], cues = [];
function tween(obj, key, to, dur, delay = 0, e = ease.out) {
  tweens = tweens.filter(t => !(t.obj === obj && t.key === key && t.t0 >= clock + delay - 1e-6));
  tweens.push({ obj, key, to, d: Math.max(dur, 1e-3), t0: clock + delay, from: null, e });
}
const tileTween = (arr, i, slot, to, dur, delay, e) => tween(arr, i * 4 + slot, to, dur, delay, e);
function stepTweens() {
  const keep = [];
  for (const t of tweens) {
    if (clock < t.t0) { keep.push(t); continue; }
    if (t.from === null) t.from = t.obj[t.key];
    const u = Math.min(1, (clock - t.t0) / t.d);
    t.obj[t.key] = t.from + (t.to - t.from) * t.e(u);
    if (t.obj === S || t.obj === R) dirty(t.key >> 2);
    if (u < 1) keep.push(t);
  }
  tweens = keep;
}
// Many squares at once (the globe filling in, or put back): one job, its own arrays, no tween each.
let jobs = [];
function batchTo(items, dur, e = ease.out) {
  const n = items.length, j = { i: new Int32Array(n), from: new Float32Array(n).fill(NaN), to: new Float32Array(n), d: new Float32Array(n), t0: clock, dur, e };
  items.forEach(([i, to, dl], q) => { j.i[q] = i; j.to[q] = to; j.d[q] = dl || 0; });
  jobs.push(j);
}
function stepJobs() {
  jobs = jobs.filter(j => {
    let alive = false;
    for (let q = 0; q < j.i.length; q++) {
      const u = (clock - j.t0 - j.d[q]) / j.dur; if (u < 0) { alive = true; continue; }
      const i = j.i[q]; if (Number.isNaN(j.from[q])) j.from[q] = S[i * 4];
      if (u < 1) { alive = true; S[i * 4] = j.from[q] + (j.to[q] - j.from[q]) * j.e(u); } else if (j.from[q] === j.from[q]) { S[i * 4] = j.to[q]; j.from[q] = j.to[q]; }
      dirty(i);
    }
    return alive;
  });
}
const at = (dt, fn) => cues.push({ t: clock + dt, fn });
function stepCues() {
  if (!cues.length) return;
  const due = cues.filter(c => c.t <= clock);
  if (!due.length) return;
  cues = cues.filter(c => c.t > clock);
  due.sort((a, b) => a.t - b.t).forEach(c => c.fn());
}

// ── The words on top ─────────────────────────────────────────────────────────────────────────
const ui = root.querySelector('[data-globe-ui]');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const letters = (s, step = 26) => esc(s).split('').map((ch, j) => `<i style="--d:${j * step}ms">${ch === ' ' ? '&nbsp;' : ch}</i>`).join('');
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('class', 'gl-lines'); svg.setAttribute('aria-hidden', 'true');
ui.append(svg);
const line = () => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); svg.append(l); return l; };
const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.6"/></svg>';
const KINDS = { 1: 'Next', 2: 'Gap', 3: 'Frontier' };
const KIND_WHY = { 1: 'Right at the edge of what you know', 2: 'You missed this in a game', 3: 'New ground, further out' };

// The places on the map: field names written out as their land comes into view, as a map labels them.
const placeLayer = el('div', 'gl-places');
ui.append(placeLayer);
// The tile in play: a line from it to the tooltip at the side.
const tipLine = line();
tipLine.classList.add('gl-lines__tip');

// The tooltip: a small app screen at the side of the map, in three steps: Learn, Play, Grow.
const tip = el('div', 'gl-tip', `
  <div class="gl-tabs"><span>Learn</span><span>Play</span><span>Grow</span></div>
  <div class="gl-tip__view"><div class="gl-tip__track">
    <section class="gl-s gl-s--cover">
      <div class="gl-hero"><img alt="" decoding="async"><span class="gl-hero__f"></span></div>
      <h3></h3><p></p>
      <span class="gl-btn">Start</span>
    </section>
    <section class="gl-s gl-s--idea">
      <div class="gl-vis"></div>
      <h4></h4><p></p>
      <span class="gl-btn">Continue</span>
    </section>
    <section class="gl-s gl-s--game">
      <div class="gl-gpic"><img alt="" decoding="async"><span></span></div>
      <h4></h4><div class="gl-board"></div>
      <span class="gl-btn">Check</span>
    </section>
    <section class="gl-s gl-s--next">
      <div class="gl-done"><span class="gl-done__tick">${TICK}</span><div><b>Learnt</b><span></span></div><em>+1 level</em></div>
      <span class="gl-s__k">Grow from here</span>
      <div class="gl-recs"></div>
      <span class="gl-btn">Grow</span>
    </section>
  </div></div>
  <span class="gl-tip__caret"></span>`);
tip.setAttribute('aria-hidden', 'true');
ui.append(tip);
const $ = sel => tip.querySelector(sel);
const btns = tip.querySelectorAll('.gl-btn');
const TAB_OF = [0, 0, 1, 2], HOW_OF = [0, 0, 0, 1];   // the card's tabs; How it works has two steps, Learn and play, then Grow
function setScreen(n) {
  tip.style.setProperty('--s', n);
  tip.dataset.screen = n;
  tip.querySelectorAll('.gl-tabs span').forEach((t, j) => { t.classList.toggle('is-on', j === TAB_OF[n]); t.classList.toggle('is-done', j < TAB_OF[n]); });
  if (how) {
    how.querySelectorAll('li').forEach((li, j) => li.classList.toggle('is-on', j === HOW_OF[n]));
    const now = how.querySelector('.gl-how__now'), on = how.querySelectorAll('li span')[HOW_OF[n]];
    if (now && on) now.textContent = on.textContent;
  }
}
// A button is pressed (it dips), then what it does happens.
const press = (b, then) => { b.classList.add('is-press'); at(.2, () => { b.classList.remove('is-press'); then && then(); }); };
// A burst of little squares from an element: the map's own shape, celebrating.
function burst(host) {
  const b = el('div', 'gl-burst');
  for (let j = 0; j < 14; j++) {
    const a = Math.PI * (1.08 + j / 13 * .84) + (hash(j, Math.floor(clock * 7)) - .5) * .2, d = 34 + hash(j, 3 + Math.floor(clock)) * 30;
    const s = el('i');
    s.style.setProperty('--x', `${(Math.cos(a) * d * 1.6).toFixed(1)}px`); s.style.setProperty('--y', `${(Math.sin(a) * d).toFixed(1)}px`);
    s.style.background = ['#8ed643', '#ff7267', '#fec84b', '#8ed643', '#151515'][j % 5];
    b.append(s);
  }
  host.append(b);
  setTimeout(() => b.remove(), 1400);
}

// Regions lit as a whole: the field in play, and the field each pick lies in.
const regionTiles = Array.from({ length: NR }, () => []);
for (let i = 0; i < N; i++) regionTiles[regionOf[i]].push(i);
let regionMarks = [];
// The field lights from the tile outward, a soft wave across its squares, rather than all at once.
function markRegion(i, kind, amount, delay = 0) {
  for (const j of regionTiles[regionOf[i]]) {
    if (R[j * 4] > 0 && R[j * 4 + 3] < .5 && R[j * 4 + 1] > .05) continue;   // a pick's own tile keeps its full mark
    if (R[j * 4] !== kind) R[j * 4 + 1] = 0;   // another kind's wash does not carry over into this one
    R[j * 4] = kind; R[j * 4 + 3] = 1; dirty(j);
    tileTween(R, j, 1, amount, 1.6, delay + gridDist(i, j) * .07, ease.inOut); regionMarks.push(j);
  }
}
function clearRegions(fade = .4) {
  for (const j of regionMarks) { if (fade) tileTween(R, j, 1, 0, fade * 1.8, 0, ease.inOut); else { R[j * 4] = 0; R[j * 4 + 1] = 0; R[j * 4 + 3] = 0; dirty(j); } }
  if (!fade) regionMarks = [];
}
// What's next, marked on the map: one of each kind in the loop; when it is explained, up to three
// of each, named, each joined by a line drawn out from the tile just learnt.
const chips = [1, 2, 3, 1, 2, 3, 1, 2, 3].map(kind => {
  const c = el('div', 'gl-chip', `<i></i><b>${KINDS[kind]}</b>`);
  c.dataset.kind = kind; c.setAttribute('aria-hidden', 'true');
  ui.append(c);
  const link = line(); link.classList.add('gl-lines__link'); link.dataset.kind = kind; link.setAttribute('pathLength', '1');
  return { el: c, line: line(), link, kind, tile: -1, w: 0, h: 0 };
});
let recFrom = -1;
const unmark = c => { c.el.classList.remove('is-in', 'is-chosen'); c.el.classList.add('is-out'); c.line.classList.remove('is-in'); c.link.classList.remove('is-in'); };
let target = -1, tipSide = 1, tipW = 300, tipH = 460, tipBox = null;
const TIPK = () => (!narrow && W > 1100 ? 1.42 : 1.15);   // the hero's screen, as large as the room beside the headline allows
// The highest a screen of this width can sit at the side without touching the headline or the button.
const clearOfCopy = (x0, x1) => copyBoxes.reduce((t, b) => (b[2] > x0 - 18 && b[0] < x1 + 18 ? Math.max(t, b[3] + 12) : t), 16);
const DOCK_H = 372;   // globe.css .gl-tip.is-dock
const MARGIN = () => Math.max(20, W * .025);
function placeUI() {
  const on = target >= 0 && tip.classList.contains('is-in');
  if (on) {
    const p = tileScreen(target), half = p.size / 2;
    let x, y, c, fit = 1;
    if (narrow && tip.classList.contains('is-dock')) {
      // on a phone, Grow docks low and short, so what's next has ground to show on above it
      x = (W - tipW) / 2; y = Hh - DOCK_H - 12; c = tipW / 2;
    } else if (narrow) {
      x = Math.max(12, Math.min(W - tipW - 12, p.x - tipW / 2)); y = p.y + half + 13;
      fit = Math.max(.7, Math.min(1, (Hh - 10 - y) / tipH));
      c = Math.max(26, Math.min(tipW - 26, p.x - x)) / fit;
    } else {
      // always at the side of the map, away from the tile, joined to it by a line
      // it may rise beside the headline when clear of it, and shrinks rather than run off the bottom
      // in the hero: the largest screen that fits beside the copy; while explaining, the plain size
      let top = 16;
      if (explaining) fit = Math.max(.6, Math.min(1, (Hh - 30) / tipH));
      else for (fit = TIPK(); fit > .6; fit -= .02) {
        const w = tipW * fit, x0 = tipSide > 0 ? W - w - MARGIN() : MARGIN();
        top = clearOfCopy(x0, x0 + w);
        if (top + tipH * fit <= Hh - 14) break;
      }
      x = tipSide > 0 ? W - tipW * fit - MARGIN() : MARGIN();
      y = Math.max(top, Math.min(Hh - tipH * fit - 14, p.y - tipH * fit * .45));
      c = Math.max(30, Math.min(tipH - 30, (p.y - y) / fit));
      setLine(tipLine, p.x + tipSide * half * .5, p.y, tipSide > 0 ? x - 10 : x + tipW * fit + 10, y + c * fit);
    }
    tip.style.zoom = fit.toFixed(3);   // zoom scales the translate too, so place it in zoomed units
    tip.style.translate = `${(x / fit).toFixed(1)}px ${(y / fit).toFixed(1)}px`;
    tip.style.setProperty('--c', `${c.toFixed(1)}px`);
    tipBox = [x, y, x + tipW * fit, y + (tip.classList.contains('is-dock') ? DOCK_H : tipH) * fit];
  }
  tipLine.classList.toggle('is-in', on && !narrow);
  for (const c of chips) {
    if (c.tile < 0) continue;
    const p = tileScreen(c.tile), rise = 16 + p.size * .3;
    const x = Math.max(8, Math.min(W - c.w - 8, p.x - c.w / 2)), y = p.y - p.size * .5 - rise - c.h;
    c.el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    setLine(c.line, p.x, p.y - p.size * .38, p.x, y + c.h);
    if (recFrom >= 0) { const q = tileScreen(recFrom); setLine(c.link, q.x, q.y, p.x, p.y); }
  }
  placePlaces();
}
function setLine(l, x1, y1, x2, y2) { l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1)); l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1)); }

// Field names, as on a map: every so often, the regions in clear view that are big enough on
// screen and clear of other names get theirs, written out letter by letter; names go as their
// land leaves. Each frame they follow their land.
const places = new Map();   // region → { el, at }
let placeCheck = 0;
function regionScreen(g) {
  const [c, r] = regionMid[g], w = sph(c * D + spin, (r - HALF) * D);
  const p = project(w), q = project(sph(c * D + spin, (r + 1 - HALF) * D));
  p.size = Math.hypot(q.x - p.x, q.y - p.y);
  return p;
}
function placePlaces() {
  if (grow.t < 3.2) return;   // no names on land not made yet
  const hz = horizonY(), maxN = narrow ? Math.min(4, tune.names) : tune.names;
  const fits = p => p.cz > 0 && p.y > hz + 22 && p.y < Hh - 56 && p.x > Math.max(50, clearLeft() + 90) && p.x < W - 50 && p.y > clearTop() + 20 &&
    !(tipBox && tip.classList.contains('is-in') && p.x > tipBox[0] - 70 && p.x < tipBox[2] + 70 && p.y > tipBox[1] - 20 && p.y < tipBox[3] + 20);
  for (const [g, P] of places) {
    const p = regionScreen(g);
    if (!fits(p)) { P.el.classList.remove('is-in'); places.delete(g); setTimeout(() => P.el.remove(), 600); continue; }
    P.el.style.translate = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
    P.el.style.scale = Math.max(.72, Math.min(1.15, p.size / 42)).toFixed(3);
    P.el.classList.toggle('is-ink', kAt(idx(Math.round(regionMid[g][0]), Math.round(regionMid[g][1]))) < .1);   // dark on land not yet known
    P.p = p;
  }
  if (clock < placeCheck) return;
  placeCheck = clock + .45;
  for (const [g, P] of places) { if (places.size <= maxN) break; P.el.classList.remove('is-in'); places.delete(g); setTimeout(() => P.el.remove(), 600); }
  if (places.size >= maxN) return;
  const shownF = new Set([...places.keys()].map(g => regions[g].f));
  const taken = [...places.values()].map(P => P.p).filter(Boolean);
  const cands = [];
  for (let g = 0; g < NR; g++) {
    let w = (regionMid[g][0] * D + spin) % TAU; if (w > Math.PI) w -= TAU; if (w < -Math.PI) w += TAU;
    if (w < -DIP + .004 || w > .4 || places.has(g) || shownF.has(regions[g].f)) continue;
    const p = regionScreen(g);
    const half = F[regions[g].f][1].length * 4.6 * Math.max(.72, Math.min(1.15, p.size / 42));
    if (!fits(p) || p.size * regionMid[g][2] < 80 || p.x - half < 12 || p.x + half > W - 12) continue;
    cands.push([g, p]);
  }
  cands.sort((a, b) => a[1].y - b[1].y);   // nearest the top first: the land just come into view
  for (const [g, p] of cands) {
    if (places.size >= maxN) break;
    if (shownF.has(regions[g].f) || taken.some(t => Math.abs(t.x - p.x) < 170 && Math.abs(t.y - p.y) < 34)) continue;
    const e = el('div', 'gl-place', `<span>${letters(F[regions[g].f][1].toUpperCase(), 32)}</span>`);
    placeLayer.append(e);
    e.style.translate = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
    requestAnimationFrame(() => e.classList.add('is-in'));
    places.set(g, { el: e, p });
    shownF.add(regions[g].f); taken.push(p);
  }
}

// ── Pictures: the lesson's own (from Wikipedia), or its field's from the atlas ──────────────
function fieldPic(e, f, w, h) {
  const [ox, oy] = cellOrigin(f), s = Math.max(w, h) / AT.cell;
  e.style.backgroundImage = `url("${atlasUrl}")`;
  e.style.backgroundSize = `${(ATW * s).toFixed(1)}px`;
  e.style.backgroundPosition = `${(-ox * s - (AT.cell * s - w) / 2).toFixed(1)}px ${(-oy * s - (AT.cell * s - h) / 2).toFixed(1)}px`;
}
function setPic(imgEl, L, f, w, h) {
  const holder = imgEl.parentNode;
  fieldPic(holder, f, w, h);
  imgEl.classList.remove('is-loaded');
  imgEl.onload = () => imgEl.classList.add('is-loaded');
  imgEl.onerror = () => imgEl.removeAttribute('src');
  if (L.img) imgEl.src = L.img; else imgEl.removeAttribute('src');
}

// ── Learn: the article's idea, always on its picture, shown three ways in turn — a number
// counting up over it, the picture looked into closely, or the new word set on it.
const NUM = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s?(?:million|billion|thousand|%|per cent|km|kilometres|metres|years|°C|BC))?/;
let ideaTurn = 0;
function setIdea(L, f) {
  const vis = $('.gl-vis'), t = L.read.t, m = t.match(NUM), ph = narrow ? 130 : 156;
  const kinds = ['number', 'picture', 'word'].filter(k => k !== 'number' || m);
  const kind = kinds[ideaTurn++ % kinds.length];
  vis.className = 'gl-vis gl-vis--' + kind;
  vis.style.height = ph + 'px';
  let anim = null;
  if (kind === 'number') {
    const raw = m[1], val = parseFloat(raw.replace(/,/g, '')), unit = (m[2] || '').trim();
    const year = !unit && val >= 1000 && val <= 2100 && !raw.includes(',');
    const dec = raw.includes('.') ? raw.split('.')[1].length : 0;
    const fmtN = v => year ? String(Math.round(v)) : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const from = year ? val - 80 : 0;
    vis.innerHTML = `<div class="gl-frame"><img alt="" decoding="async"><div class="gl-num"><b>${fmtN(from)}</b>${unit ? `<span>${esc(unit)}</span>` : ''}</div><div class="gl-num__bar"><i></i></div></div>`;
    setPic(vis.querySelector('img'), L, f, tipW - 32, ph);
    const b = vis.querySelector('b'), st = { v: from };
    anim = t0 => {
      at(t0, () => { tween(st, 'v', val, 1.8, 0, ease.out); vis.classList.add('is-go'); });
      const tick = () => { b.textContent = fmtN(st.v); if (st.v !== val) requestAnimationFrame(tick); };
      at(t0, tick);
    };
  } else if (kind === 'picture') {
    vis.innerHTML = `<div class="gl-frame gl-look"><img alt="" decoding="async"><svg class="gl-look__ring" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" rx="10" pathLength="1"/></svg><span class="gl-look__w"></span></div>`;
    setPic(vis.querySelector('img'), L, f, tipW - 32, ph);
    vis.querySelector('.gl-look__w').textContent = L.read.w || L.title;
    anim = t0 => at(t0, () => vis.classList.add('is-go'));
  } else {
    vis.innerHTML = `<div class="gl-frame"><img alt="" decoding="async"><div class="gl-word"><span>New word</span><b>${letters(L.read.w || L.title, 30)}</b></div></div>`;
    setPic(vis.querySelector('img'), L, f, tipW - 32, ph);
    anim = t0 => at(t0, () => vis.classList.add('is-go'));
  }
  $('.gl-s--idea h4').textContent = L.read.h;
  const tt = esc(t), w = L.read.w && esc(L.read.w);
  $('.gl-s--idea p').innerHTML = w && tt.includes(w) ? tt.replace(w, `<mark>${w}</mark>`) : tt;
  return anim;
}

// ── Play: the games, each drawn as a picture of its own — a ladder that fills, threads that
// join pairs, a dial, lettered cards — laid out, then run from a time; run() says how long it
// takes and check() marks it right.
const GAME_NAME = { order: 'Put in order', match: 'Match', estimate: 'Estimate', pick: 'Pick one' };
const PAIR = ['#8ed643', '#fec84b', '#ff7267', '#d6d5cf'];
function setupGame(g, board) {
  board.className = 'gl-board gl-board--' + g.k;
  if (g.k === 'order') {
    const n = g.items.length, IH = 38, GAP = 6, pos = n === 4 ? [2, 0, 3, 1] : [1, 2, 0];
    board.innerHTML = `<div class="gl-rail" style="height:${n * (IH + GAP) - GAP}px"><i class="gl-rail__fill"></i>${g.items.map((_, j) => `<b style="top:${j * (IH + GAP) + IH / 2}px">${j + 1}</b>`).join('')}</div>
      <div class="gl-col gl-col--move" style="height:${n * (IH + GAP) - GAP}px">${g.items.map(t => `<div class="gl-it" style="height:${IH}px"><i class="gl-grip"></i><span>${esc(t)}</span></div>`).join('')}</div>`;
    const els = board.querySelectorAll('.gl-it'), nodes = board.querySelectorAll('.gl-rail b'), fill = board.querySelector('.gl-rail__fill');
    const put = () => els.forEach((e, i) => { e.style.translate = `0 ${pos[i] * (IH + GAP)}px`; });
    put();
    return {
      run(t0) {
        for (let k = 0; k < n; k++) {
          at(t0 + k * .8, () => { const j = pos.indexOf(k); els[k].classList.add('is-lift'); pos[j] = pos[k]; pos[k] = k; put(); });
          at(t0 + k * .8 + .5, () => {
            els[k].classList.remove('is-lift'); els[k].classList.add('is-set'); nodes[k].classList.add('is-on');
            fill.style.transform = `scaleY(${n > 1 ? k / (n - 1) : 1})`;   // the ladder fills to step k
          });
        }
        return n * .8 + .2;
      },
      check() { els.forEach((e, j) => { e.style.transitionDelay = `${j * 70}ms`; e.classList.add('is-right'); }); fill.classList.add('is-right'); },
    };
  }
  if (g.k === 'match') {
    const n = g.pairs.length, IH = 44, GAP = 8, perm = n === 3 ? [2, 0, 1] : [1, 3, 0, 2];
    const rights = perm.map(j => g.pairs[j][1]), h = n * (IH + GAP) - GAP;
    board.innerHTML = `<div class="gl-col">${g.pairs.map((p, j) => `<div class="gl-it gl-it--l" style="height:${IH}px;--pc:${PAIR[j]}"><span>${esc(p[0])}</span></div>`).join('')}</div>
      <svg class="gl-threads" viewBox="0 0 40 ${h}" preserveAspectRatio="none" style="height:${h}px">${g.pairs.map((_, j) => {
        const y1 = j * (IH + GAP) + IH / 2, y2 = perm.indexOf(j) * (IH + GAP) + IH / 2;
        return `<path d="M0 ${y1} C 20 ${y1}, 20 ${y2}, 40 ${y2}" pathLength="1" style="--pc:${PAIR[j]}"/>`;
      }).join('')}</svg>
      <div class="gl-col">${rights.map(t => `<div class="gl-it gl-it--r" style="height:${IH}px"><span>${esc(t)}</span></div>`).join('')}</div>`;
    const ls = board.querySelectorAll('.gl-it--l'), rs = board.querySelectorAll('.gl-it--r'), th = board.querySelectorAll('.gl-threads path');
    return {
      run(t0) {
        for (let j = 0; j < n; j++) {
          at(t0 + j * .85, () => { ls[j].classList.add('is-on'); th[j].classList.add('is-on'); });
          at(t0 + j * .85 + .45, () => { const r = rs[perm.indexOf(j)]; r.style.setProperty('--pc', PAIR[j]); r.classList.add('is-on'); ls[j].classList.add('is-set'); r.classList.add('is-set'); });
        }
        return n * .85 + .3;
      },
      check() { board.classList.add('is-right'); },
    };
  }
  if (g.k === 'estimate') {
    const logScale = g.min > 0 && g.max / g.min >= 50;
    const year = g.min >= 1000 && g.max <= 2100 && (!g.unit || g.unit === 's');
    const at01 = v => logScale ? Math.log(v / g.min) / Math.log(g.max / g.min) : (v - g.min) / (g.max - g.min);
    const from01 = u => logScale ? g.min * Math.pow(g.max / g.min, u) : g.min + (g.max - g.min) * u;
    const show = v => {
      const r = logScale ? Number(v.toPrecision(2)) : Math.round(v);
      return (year ? String(r) : r.toLocaleString('en-US')) + (g.unit === '%' || g.unit === 's' ? g.unit : '');
    };
    const unit = g.unit && g.unit !== '%' && g.unit !== 's' ? g.unit : '';
    // A dial: an arc from the low end to the high, a bead that runs along it, the answer's mark.
    const R = 70, CX = 90, CY = 84, pt = u => [CX - R * Math.cos(Math.PI * u), CY - R * Math.sin(Math.PI * u)];
    const arc = u => { const [x, y] = pt(Math.max(.0001, u)); return `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`; };
    board.innerHTML = `<svg class="gl-dial" viewBox="0 0 180 96"><path class="gl-dial__track" d="${arc(1)}"/><path class="gl-dial__fill" d="${arc(.5)}"/>
        ${[0, .25, .5, .75, 1].map(u => { const [x1, y1] = pt(u), x2 = CX - (R - 9) * Math.cos(Math.PI * u), y2 = CY - (R - 9) * Math.sin(Math.PI * u); return `<line class="gl-dial__tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('')}
        <circle class="gl-dial__ans" r="7"/><circle class="gl-dial__bead" r="9"/></svg>
      <div class="gl-est__v"><b>${show(from01(.5))}</b>${unit ? `<span>${esc(unit)}</span>` : ''}</div>
      <div class="gl-est__ends"><span>${show(g.min)}</span><span>${show(g.max)}</span></div>`;
    const v = board.querySelector('.gl-est__v b'), fillP = board.querySelector('.gl-dial__fill'), bead = board.querySelector('.gl-dial__bead'), ansC = board.querySelector('.gl-dial__ans');
    const ans = at01(g.a), guess = Math.max(.04, Math.min(.96, ans + (ans > .5 ? -.14 : .14)));
    const [ax, ay] = pt(ans); ansC.setAttribute('cx', ax); ansC.setAttribute('cy', ay);
    const state = { u: .5, done: false };
    const paint = () => {
      const [x, y] = pt(state.u);
      bead.setAttribute('cx', x.toFixed(2)); bead.setAttribute('cy', y.toFixed(2)); fillP.setAttribute('d', arc(state.u));
      if (!state.done) v.textContent = show(from01(state.u));
    };
    paint();
    return {
      run(t0) {
        let t = t0;
        for (const [to, d] of [[ans > .5 ? .15 : .85, .8], [guess, .9], [ans, .7]]) { at(t, () => tween(state, 'u', to, d, 0, ease.inOut)); t += d + .05; }
        at(t0, () => board.classList.add('is-drag'));
        at(t, () => board.classList.remove('is-drag'));
        return t - t0;
      },
      check() { state.done = true; state.u = ans; board.classList.add('is-right'); v.textContent = show(g.a); },
      paint,
    };
  }
  board.innerHTML = g.opts.map((o, j) => `<div class="gl-opt"><b>${'ABCD'[j]}</b><span>${esc(o)}</span></div>`).join('');
  const opts = board.querySelectorAll('.gl-opt');
  return {
    run(t0) { at(t0 + .5, () => opts[(g.a + 1) % opts.length].classList.add('is-hover')); at(t0 + 1.1, () => { opts.forEach(o => o.classList.remove('is-hover')); opts[g.a].classList.add('is-sel'); }); return 1.5; },
    check() { opts[g.a].classList.add('is-right'); opts.forEach((o, j) => j !== g.a && o.classList.add('is-dim')); },
  };
}
let game = null;

function fillTip(T, L) {
  const f = fieldOf[T];
  setPic($('.gl-hero img'), L, f, tipW - 32, narrow ? 120 : 156);
  $('.gl-hero__f').textContent = F[f][1];
  $('.gl-s--cover h3').textContent = L.title;
  $('.gl-s--cover p').textContent = L.ch;
  const idea = setIdea(L, f);
  setPic($('.gl-gpic img'), L, f, tipW - 32, 64);
  $('.gl-gpic span').textContent = GAME_NAME[L.game.k];
  $('.gl-s--game h4').textContent = L.game.q;
  game = setupGame(L.game, $('.gl-board'));
  $('.gl-done div span').textContent = L.title;
  $('.gl-recs').innerHTML = '';
  btns[2].className = 'gl-btn'; btns[2].textContent = 'Check';
  setScreen(0);
  tip.className = 'gl-tip';
  tip.dataset.side = narrow ? 'below' : tipSide > 0 ? 'right' : 'left';
  return idea;
}

// ── Choosing tiles ───────────────────────────────────────────────────────────────────────────
const kAt = i => S[i * 4];
const cr = i => [Math.floor(i / ROWS), i % ROWS];
const idx = (c, r) => (r < 0 || r >= ROWS) ? -1 : mod(c, RING) * ROWS + r;
const n4 = i => { const [c, r] = cr(i); return [idx(c - 1, r), idx(c + 1, r), idx(c, r - 1), idx(c, r + 1)].filter(j => j >= 0); };
const gridDist = (a, b) => { const [ca, ra] = cr(a), [cb, rb] = cr(b); return Math.hypot(wrapC(ca - cb), ra - rb); };
const horizonY = () => { const p = project(sph(-DIP, 0)); return p.cz > 0 ? p.y : -Infinity; };   // off the top when looking down
const groundTop = () => Math.max(horizonY(), narrow ? clearTop() + 12 : clearTop());   // the land's top edge in view, under the headline
// Every tile on the visible side, with where it lands on screen.
function visible() {
  const out = [];
  for (let c = 0; c < RING; c++) {
    let w = (thetaOf(c) + spin) % TAU; if (w > Math.PI) w -= TAU;
    if (w < -DIP - .01 || w > Math.max(.5, DIP * smooth(.05, .3, globeK()))) continue;
    for (let r = 0; r < ROWS; r++) {
      const i = c * ROWS + r, p = tileScreen(i);
      if (p.cz > 0 && p.facing > .02 && p.x > 0 && p.x < W && p.y > 0 && p.y < Hh) out.push({ i, ...p });
    }
  }
  return out;
}
// Where a tile can be played: room for the tooltip beside it (or, on a phone, below it).
const stage = p => {
  const hz = groundTop();
  // on a phone: just under the horizon, so the tooltip below it has as much room as it can (it shrinks to fit)
  if (narrow) return p.y > hz + 8 && p.y < hz + 130 && p.y + p.size / 2 + 13 + tipH * .6 < Hh - 8 && p.x > W * .1 && p.x < W * .9 && p.size > 7;
  const m = MARGIN() + tipW * TIPK() + 70;
  if (explaining) return p.x > howBox[2] + 70 && p.x < W - m && p.y > Hh * .2 && p.y < Hh * .8 && p.size > 15;   // between the explaining and the tooltip
  if ((tune.side === 'right' && p.x > W - m) || (tune.side === 'left' && p.x < m)) return false;   // clear of a tooltip kept to one side
  return p.y > hz + (Hh - hz) * .24 && p.y < Hh * .82 && p.x > Math.max(W * .14, m - W * .5 + W * .14) && p.x < W - Math.max(W * .14, m - W * .5 + W * .14) && p.x > 40 && p.size > 15 && (p.x < W - m || p.x > m);
};
const surfaced = new Set();   // gaps shown on the map: playable again, to put right
const playable = i => (kAt(i) < .1 || surfaced.has(i)) && hasLesson(i) && !lessonsOf[fieldOf[i]].every(l => l.title === lastTitle);
function pickStage(vis) {
  const hz = groundTop(), mid = narrow ? hz + 30 : hz + (Hh - hz) * .5;
  let best = -1, bs = -Infinity;
  for (const v of vis) {
    if (!stage(v) || !playable(v.i)) continue;
    const touches = n4(v.i).some(j => kAt(j) > .1);
    const fits = lessonsOf[fieldOf[v.i]].some(l => l.game.k === GAMES[gameTurn % GAMES.length]);
    const s = (touches ? 3 : 0) + (fits ? 2.5 : 0) - Math.abs(v.y - mid) / 60 - Math.abs(v.x - W / 2) / (W * .25) + hash(v.i, Math.floor(clock)) * .8;
    if (s > bs) { bs = s; best = v.i; }
  }
  return best;
}
function pickRecs(T, vis, n = 1) {
  const tp = tileScreen(T), hz = horizonY(), tb = tipBox || [0, 0, 0, 0];
  // named marks are wider: keep each one's label (above its tile) clear of the tooltip, the card and each other
  const cw = n > 1 ? 95 : 30, ch = n > 1 ? 80 : 20;
  const underTip = v => v.x > tb[0] - cw && v.x < tb[2] + cw && v.y > tb[1] - (narrow ? 14 : 60) && v.y < tb[3] + ch;
  const underHow = v => explaining && !narrow && v.x - cw < howBox[2] + 16 && v.y > howBox[1] - 20 && v.y < howBox[3] + ch;
  const inView = v => v.y > (narrow ? Math.max(hz + 16, clearTop() + 50) : Math.max(hz + 40, clearTop() + 70)) && v.y < Hh - 30 && v.x > Math.max(W * .06, clearLeft() + 30) && v.x < W * .94 && v.i !== T && v.size > 8 && hasLesson(v.i) && !underTip(v) && !underHow(v) && v.y > (n > 1 ? 150 : 0);
  let pool = vis.filter(v => inView(v) && kAt(v.i) < .1);
  const taken = [], used = [lastTitle];
  // a tile can only be offered with a lesson not already on screen
  const fresh = i => lessonsOf[fieldOf[i]].some(l => !used.includes(l.title));
  const clear = v => fresh(v.i) && taken.every(t => Math.abs(t.x - v.x) > (narrow ? 100 : n > 1 ? 185 : 110) || Math.abs(t.y - v.y) > (narrow ? 40 : n > 1 ? 70 : 56));
  const choose = score => {
    let best = null, bs = -Infinity;
    for (const v of pool) { if (!clear(v)) continue; const s = score(v); if (s > bs) { bs = s; best = v; } }
    if (best && bs > -Infinity) { taken.push(best); used.push(lessonFor(best.i, used).title); return best.i; }
    return -1;
  };
  const gT = regionOf[T];
  const known4 = i => n4(i).filter(j => kAt(j) > .1).length;
  const near = (i, rad) => { const [c, r] = cr(i); for (let dc = -rad; dc <= rad; dc += 2) for (let dr = -rad; dr <= rad; dr += 2) { const j = idx(c + dc, r + dr); if (j >= 0 && kAt(j) > .1) return true; } return false; };
  const many = (k, f) => { const out = []; for (let m = 0; m < k; m++) { const i = f(); if (i < 0) break; out.push(i); } return out; };
  // What's next follows what was just learnt: the same field first, then the same domain; only
  // if the view holds nothing related does a pick fall back to whatever is near.
  const fT = fieldOf[T], dT = F[fT][2];
  const rel = i => fieldOf[i] === fT ? 2 : F[fieldOf[i]][2] === dT ? 1 : 0;
  const either = (strict, loose) => { const i = choose(strict); return i >= 0 ? i : choose(loose); };
  const nextScore = need => v => {
    const d = gridDist(v.i, T); if (d < 3 || d > 18 || known4(v.i) < 1 || rel(v.i) < need) return -Infinity;
    return rel(v.i) * 4 - d * .3 + (regionOf[v.i] === gT ? 2 : 0) + (v.y < tp.y - 20 ? 1.5 : 0) + (stage(v) ? 3 : 0);
  };
  const next = many(n, () => either(nextScore(1), nextScore(0)));
  // A gap is a mistake in what you know: a tile you'd learnt, deep in known land, that an
  // earlier game showed you'd got wrong. It is surfaced from the known, not picked from the new.
  const unknownPool = pool;
  pool = vis.filter(v => inView(v) && kAt(v.i) >= .3 && v.i !== T && known4(v.i) >= 2);
  const gapScore = need => v => {
    const d = gridDist(v.i, T); if (d < 4 || d > 26 || rel(v.i) < need) return -Infinity;
    return rel(v.i) * 3 - Math.abs(d - 9) * .2 + (stage(v) ? 2 : 0) + hash(v.i, 41);
  };
  const gap = many(n, () => either(gapScore(1), gapScore(0)));
  pool = unknownPool;
  // far out in new ground; looking straight down less of it is in view, so it may settle for nearer
  // the frontier is new ground in the same domain: a neighbouring field, not yet begun
  const far = (lo, clear, need) => v => {
    const d = gridDist(v.i, T); if (d < lo || d > 70 || near(v.i, clear) || fieldOf[v.i] === fT || rel(v.i) < need) return -Infinity;
    return -Math.abs(d - 30) * .1 + v.size * .03 + (stage(v) ? 1 : 0);
  };
  const frontier = many(n, () => { for (const [lo, cl, need] of [[14, 6, 1], [8, 3, 1], [6, 1, 1], [14, 6, 0], [6, 1, 0]]) { const i = choose(far(lo, cl, need)); if (i >= 0) return i; } return -1; });
  // any kind still without a tile takes the nearest one that fits in the clear part of the view (on a
  // phone a narrow band between the explaining and the docked card), so the card always lists all three
  {
    const band = narrow
      ? v => v.i !== T && v.y > clearTop() + 12 && v.y < Hh - DOCK_H - 24 && v.x > 20 && v.x < W - 20 && v.size > 6 && hasLesson(v.i) && !taken.some(t => t.i === v.i)
      : v => v.i !== T && v.y > 70 && v.y < Hh - 30 && v.x > clearLeft() + 30 && v.x < tb[0] - 40 && v.size > 6 && hasLesson(v.i) && !taken.some(t => t.i === v.i);
    const loose = ok => { const v = vis.filter(v => band(v) && ok(v)).sort((a, b) => gridDist(a.i, T) - gridDist(b.i, T))[0]; if (!v) return []; taken.push(v); used.push(lessonFor(v.i, used).title); return [v.i]; };
    if (!next.length) next.push(...loose(v => kAt(v.i) < .1 && known4(v.i) >= 1));
    if (!gap.length) gap.push(...loose(v => kAt(v.i) >= .3));
    if (!frontier.length) frontier.push(...loose(v => kAt(v.i) < .1 && fieldOf[v.i] !== fT));
  }
  return { 1: next, 2: gap, 3: frontier };
}

// ── The loop: Learn, Play, Grow (about 26 seconds a turn) ───────────────────────────────────
let lastTitle = '';
// Drop the tile in play and start again on a fresh one, where it suits the new view.
function restart() {
  cues = []; rush = 1; wantStage = 0;
  tween(zoom, 'v', 0, 1.1);
  if (target >= 0) { S[target * 4 + 2] = 0; dirty(target); }
  tip.classList.remove('is-in', 'is-dock'); tip.classList.add('is-out'); root.classList.remove('is-tip');
  if (xT >= 0 && xKeep) takeBack();   // the explained turn is taken back
  clearRegions(.4);
  for (const c of chips) { if (c.tile >= 0) tileTween(R, c.tile, 1, 0, .3); unmark(c); c.tile = -1; }
  target = -1; xT = -1; xStage = -1; recFrom = -1;
  if (explaining) at(.45, explainSetup);
}

// ── Explaining: one turn, played by scroll ──
// Scrolling back undoes it at once: what was still on its way (the land brightening, the marks
// filling) is dropped, and every tile it touched goes back to how it was.
function takeBack(rewind, ease) {
  xDone = false;
  tween(zoom, 'v', 0, .9);
  tweens = tweens.filter(t => t.obj !== S && t.obj !== R); jobs = [];
  uni.waveA = 0;
  clearRegions(ease ? .45 : 0); if (ease) regionMarks = [];
  // each tile the turn touched goes back to how it was: eased on a rewind, at once otherwise
  for (const [j, k] of xKeep) { S[j * 4 + 3] = 0; if (!ease) S[j * 4] = k; dirty(j); }
  if (ease) batchTo(xKeep, .55);
  for (const c of chips) { if (c.tile >= 0) { if (ease) tileTween(R, c.tile, 1, 0, .4); else { R[c.tile * 4] = 0; R[c.tile * 4 + 1] = 0; } dirty(c.tile); } unmark(c); c.tile = -1; }
  if (xT >= 0) { S[xT * 4 + 2] = rewind ? 1 : 0; dirty(xT); warmAround(Math.floor(xT / ROWS), 30 + HR, .6); }
  surfaced.clear(); recFrom = -1;
}
// Three steps down the explaining's stretch: Learn, Play, Grow. The page settles on each (snap points,
// placeSnaps); scrolling on past one finishes what it was still doing at once.
const STEPS = [1 / 4, 3 / 4];   // Learn and play, then Grow
let xT = -1, xL = null, xStage = -1, xIdea = null, xKeep = null, xDone = false;
const subOf = () => Math.min(1, Math.max(0, (scrolled - EXPLAIN) / (EXIT - EXPLAIN)));
const stageAt = () => (subOf() < 1 / 2 ? 1 : 3);   // the turn's own steps: 1 Learn (Play follows by itself), 3 Grow
// Moving on before a step has finished never cuts it short: it plays on, four times as fast, and the
// next step starts when it is done. So every change on the map and in the tooltip still eases.
let rush = 1, wantStage = 0;
const busy = () => cues.length > 0 || jobs.length > 0 || tweens.some(t => t.obj === S || t.obj === R);
// The stages, for the page's settling (index.html, window.CRUX_STAGES): the hero, Learn and play, Grow,
// and the next section. Scroll freely; let go between two and the page eases to the next one that way.
// From Grow to the next section the glide is long, so the map rises into the globe on the way.
const runwayY = v => { const range = runway.offsetHeight - root.offsetHeight, top = parseFloat(getComputedStyle(root).top) || 0; return runway.getBoundingClientRect().top + scrollY - top + v * range; };
const stopY = j => runwayY(EXPLAIN + STEPS[j] * (EXIT - EXPLAIN));
if (runway) (window.CRUX_STAGES = window.CRUX_STAGES || []).push({
  stops: () => { const next = runway.nextElementSibling, top = parseFloat(getComputedStyle(root).top) || 0;
    return [runwayY(0), stopY(0), stopY(1), next ? next.getBoundingClientRect().top + scrollY - top : runwayY(1) + root.offsetHeight]; },
  time: (i, j) => (Math.max(i, j) === 3 ? 1.9 : 1),
});
// when the steps play on into Grow by themselves, the page quietly moves to Grow's stage (the view is
// the same there), so the next scroll leaves
function settleAt(j) { if (runway) scrollTo({ top: stopY(j), behavior: 'instant' }); }
// Left alone, the steps play themselves: each one, a pause to take it in, then the next; after Grow,
// a new turn on another tile. Scrolling into a step still takes you straight there.
let scrollStage = 0, autoIdle = 0, autoNext = false;
const PAUSE = [0, 3.2, 1.6, 6];   // how long each step stays up once it has played: Learn, Play, Grow
function autoplay(dt) {
  if (!explaining || scrolled > EXIT || xT < 0 || rush > 1 || wantStage || busy()) { autoIdle = 0; return; }
  autoIdle += dt;
  // Learn, then Play, then Grow; Grow stays until the page moves on
  if (xStage < 3 && autoIdle > PAUSE[xStage]) { autoIdle = 0; if (xStage + 1 === 3 && stageAt() === 1) settleAt(1); explainTo(xStage + 1); }
}
function explainSetup() {
  const T = pickStage(visible());
  if (T < 0) { at(.5, explainSetup); return; }
  const L = lessonFor(T);
  lessonOf.clear(); gameTurn++; lastTitle = L.title;
  xT = target = T; xL = L; tipSide = 1; xDone = false;
  // what this turn changes on the land, so scrolling back can put it back
  const [tc, tr] = cr(T); xKeep = [];
  for (let dc = -13; dc <= 13; dc++) for (let dr = -13; dr <= 13; dr++) { const j = idx(tc + dc, tr + dr); if (j >= 0) xKeep.push([j, kAt(j)]); }
  xIdea = fillTip(T, L);
  tileTween(S, T, 2, 1, .5, .1);
  clearRegions(0); markRegion(T, 4, .9, .2);
  tip.classList.add('is-in'); root.classList.add('is-tip');
  xStage = 0; explainTo(autoNext ? 1 : stageAt()); autoNext = false;
}
function explainTo(n) {
  if (xT < 0 || n === xStage) return;
  if (n < xStage) {
    // back: the land eases back to how it was before the turn, then forward again to where the scroll is
    cues = []; rush = 1; wantStage = 0;
    takeBack(true, true);
    xIdea = fillTip(xT, xL);
    tip.classList.add('is-in'); S[xT * 4 + 2] = 1; dirty(xT);
    xStage = 0;
    stepTo(n);
    return;
  }
  // forward while the last step is still playing: let it finish, sped up, then go on
  if (busy()) { wantStage = n; rush = 4; return; }
  stepTo(n);
}
function stepTo(n) {
  if (xT < 0 || n <= xStage) return;
  const T = xT;
  let ran = 0;   // a game played on the way through finishes before it is checked
  for (let k = xStage + 1; k <= n; k++) {
    const last = k === n;
    if (k === 1) { if (last) at(1.3, () => press(btns[0], () => { setScreen(1); xIdea(.3); })); else { setScreen(1); xIdea(0); } }
    if (k === 2) { const go = () => { setScreen(2); tileTween(S, T, 0, .3, .9); }; if (last) press(btns[1], go); else go(); ran = game.run(last ? .6 : 0) + .3; }
    if (k === 3) {
      const t = ran;
      at(t, () => press(btns[2], () => {
        game.check();
        btns[2].classList.add('is-right'); btns[2].innerHTML = `${TICK}<span>${xL.game.k === 'estimate' ? 'Spot on' : 'Correct'}</span>`;
        burst(btns[2]);
        tileTween(S, T, 0, 1, 1.1, .2);
        S[T * 4 + 3] = 1; tileTween(S, T, 3, 0, 1.2, .05); dirty(T);
        const [tc, tr] = cr(T), wpos = sph(thetaOf(tc), phiOf(tr));
        uni.wave[0] = wpos[0]; uni.wave[1] = wpos[1]; uni.wave[2] = wpos[2]; uni.wave[3] = 0; uni.waveA = .8 * tune.wave;
        tween(uni.wave, 3, 16 * D, 2.8, 0, ease.out); tween(uni, 'waveA', 0, 2.8, 0, ease.lin);
        ripple(T);
      }));
      at(t + 1, () => press(btns[2], () => {
        rush = 1;   // Grow itself plays at its own pace
        setScreen(3);
        if (narrow) { tip.classList.add('is-dock'); tipBox = [(W - tipW) / 2, Hh - DOCK_H - 12, (W + tipW) / 2, Hh]; }
        showRecs(T, 3);
      }));
      at(t + 2.6, () => fillLand(T));
    }
    xStage = k;
  }
}
// Grow, over time: the unknown land in view is learnt, nearest the picks first, until it is all known,
// as following what's next does. Every tile it touches is kept, to be taken back on a rewind.
function fillLand(T) {
  // first the camera rises, so more of the map is in view; then all of it fills in
  tween(zoom, 'v', 1, 2.2, 0, ease.inOut);
  at(1.4, () => fillVisible(T));
}
function fillVisible(T) {
  const seeds = [T, ...chips.filter(c => c.tile >= 0).map(c => c.tile)].map(cr), kept = new Set(xKeep.map(([j]) => j));
  const todo = [];
  for (const v of visible()) {
    const k = kAt(v.i); if (k >= .3) continue;
    const [c, r] = cr(v.i), d = Math.min(...seeds.map(([sc, sr]) => Math.hypot(wrapC(c - sc), r - sr)));
    if (!kept.has(v.i)) { xKeep.push([v.i, k]); kept.add(v.i); }
    todo.push([v.i, .45 + hash(v.i, 29) * .5, d]);
  }
  // nearest the picks first, the whole near side in about three seconds
  const far = Math.max(1, ...todo.map(t => t[2]));
  for (const t of todo) t[2] = t[2] / far * 2.6 + hash(t[0], 17) * .35;
  batchTo(todo, 1.1);
  warmAround(Math.floor(T / ROWS), Math.floor(RING / 4) + HR, 4.5);
  at(4.2, () => { xDone = true; });
}
// The field of the tile learnt brightens round it, nearest first; neighbouring land warms.
function ripple(T) {
  const [tc, tr] = cr(T), gT = regionOf[T];
  for (let dc = -12; dc <= 12; dc++) for (let dr = -12; dr <= 12; dr++) {
    const j = idx(tc + dc, tr + dr), d = Math.hypot(dc, dr);
    if (j < 0 || j === T || d > 12) continue;
    const delay = .2 + d * .1, k = kAt(j);
    if (regionOf[j] === gT && d <= 9) {
      const to = Math.min(1, Math.max(k + .3, .42 - d * .02));
      tileTween(S, j, 0, to, .8, delay);
      if (d < 6) { S[j * 4 + 3] = 0; tileTween(S, j, 3, .55, .15, delay, ease.lin); tileTween(S, j, 3, 0, .9, delay + .15); }
    }
  }
  warmAround(tc, 12 + HR, 3.6);
}
// What's next is about what was just learnt: its lessons are chosen for that, whatever tile they
// are marked on. Next: more of the same field. Gap: something learnt before in the same domain.
// Frontier: a neighbouring field of that domain, not yet begun.
const fieldIx = new Map(F.map((x, f) => [x[0], f]));
function relatedLessons(T, kind, n, used) {
  const f = fieldOf[T], d = F[f][2], learnt = lessonOf.get(T) || lessonFor(T);
  const fit = kind === 1 ? l => fieldIx.get(l.f) === f
    : kind === 2 ? l => fieldIx.get(l.f) !== f && F[fieldIx.get(l.f)][2] === d
    : l => fieldIx.get(l.f) !== f && F[fieldIx.get(l.f)][2] === d;
  const pool = LESSONS.filter(l => fit(l) && l !== learnt && !used.includes(l.title));
  // gaps and frontiers take different fields of the domain; the order is fixed per tile, so a replay matches
  const o = Math.floor(hash(T, kind * 13) * Math.max(1, pool.length)), out = [], seen = new Set();
  for (let j = 0; j < pool.length && out.length < n; j++) {
    const l = pool[(o + j) % pool.length];
    if (kind !== 1 && seen.has(l.f)) continue;
    seen.add(l.f); out.push(l); used.push(l.title);
  }
  return out;
}
function showRecs(T, n = 1) {
  const recs = pickRecs(T, visible(), n), list = $('.gl-recs');
  const used = [lastTitle];
  for (const k of [1, 2, 3]) relatedLessons(T, k, recs[k].length, used).forEach((l, m) => lessonOf.set(recs[k][m], l));
  // where the related ones ran out, the tile's own lesson, never one already named here
  for (const k of [1, 2, 3]) for (const i of recs[k]) if (i >= 0 && !lessonOf.has(i)) { const l = lessonFor(i, used); if (l) used.push(l.title); }
  list.innerHTML = '';
  recFrom = -1;
  // the tiles light one after another, kinds in turn, each line drawn out from the tile learnt
  const order = [];
  for (let m = 0; m < n; m++) for (const k of [1, 2, 3]) if (recs[k][m] >= 0 && recs[k][m] !== undefined) order.push([k, m, recs[k][m]]);
  order.forEach(([k, m, i], q) => {
    const c = chips.filter(x => x.kind === k)[m];
    c.tile = i;
    const L = lessonFor(i);
    c.el.querySelector('b').textContent = n > 1 ? L.title : KINDS[k];
    c.el.classList.toggle('is-named', n > 1);
    c.w = c.el.offsetWidth; c.h = c.el.offsetHeight;
    R[i * 4] = k; dirty(i);
    const d = .25 + q * (n > 1 ? .22 : .45);
    if (k === 2) {
      // the mistake surfaces: the tile drops back toward the unknown, so the gap shows in the land
      surfaced.add(i);
      if (xKeep && xT === T) xKeep.push([i, kAt(i)]);
      at(d, () => { tileTween(S, i, 0, .12, 1.1); S[i * 4 + 3] = .8; tileTween(S, i, 3, 0, 1); warmAround(Math.floor(i / ROWS), HR + 2, 1.6); });
    }
    tileTween(R, i, 1, 1, .7, d);
    markRegion(i, k, .85, d + .15);   // and its field there lights round it
    // when explained, the tiles alone light in their colours: no tags, no lines
    if (n === 1) at(d, () => { c.el.classList.remove('is-out'); c.el.classList.add('is-in'); c.line.classList.add('is-in'); });
  });
  // the tooltip lists one row a kind: its first, and how many more are marked
  [1, 2, 3].forEach((k, q) => {
    const is = recs[k]; if (!is.length) return;
    const L = lessonFor(is[0]), more = is.length - 1;
    const row = el('div', 'gl-rec', `<span class="gl-rec__pic"></span><div><em>${KINDS[k]}${more ? ` <i>${is.length}</i>` : ''}</em><b>${esc(L.title)}</b><span>${more ? `and ${more} more on the map` : KIND_WHY[k]}</span></div>`);
    row.dataset.kind = k;
    fieldPic(row.querySelector('.gl-rec__pic'), fieldIx.get(L.f) ?? fieldOf[is[0]], 44, 44);
    list.append(row);
    at(.3 + q * .3, () => row.classList.add('is-in'));
  });
}
// ── The hero: no screens; what you know spreads over the land in view, a few squares at a time, out
// from its edges, each lighting up as it is learnt. It rests while How it works is up. ──
let growIdle = 0;
function ambient(dt) {
  if (explaining || scrolled > .06 || grow.t < GROW_END || target >= 0) return;
  if ((growIdle += dt) < .4) return;
  growIdle = 0;
  const edge = visible().filter(v => v.size > 6 && kAt(v.i) < .2 && n4(v.i).some(j => kAt(j) > .5));
  for (let n = Math.min(edge.length, 1 + Math.floor(hash(Math.floor(clock * 10), 5) * 2.4)); n > 0; n--) {
    const v = edge.splice(Math.floor(hash(Math.floor(clock * 100) + n, 11) * edge.length), 1)[0];
    if (!heroKept.has(v.i)) heroKept.set(v.i, kAt(v.i));
    tileTween(S, v.i, 0, .55 + hash(v.i, 29) * .4, 1.2, n * .12);
    S[v.i * 4 + 3] = .7; tileTween(S, v.i, 3, 0, 1.4, n * .12 + .1); dirty(v.i);
    warmAround(Math.floor(v.i / ROWS), 4 + HR, 1.6);
  }
}
// How it works demonstrates on the land as it was: what the hero filled in goes back, eased.
function unfillHero() {
  if (!heroKept.size) return;
  tweens = tweens.filter(t => !(t.obj === S && heroKept.has(Math.floor(t.key / 4))));
  const cols = new Set();
  for (const [i, k] of heroKept) { S[i * 4 + 3] = 0; tileTween(S, i, 0, k, .6); dirty(i); cols.add(Math.floor(i / ROWS)); }
  for (const c of cols) warmAround(c, HR, .9);
  heroKept.clear();
}

let lastGk = '', exitSpin = 0, lastExit = 0;
// ── Run ──────────────────────────────────────────────────────────────────────────────────────
function frame(ts) {
  raf = 0;
  if (!running) return;
  const dt = last ? Math.min((ts - last) / 1000, .05) : .016;
  last = ts;
  // leaving eases in, however fast the page was scrolled, so the globe is always seen forming
  exit.v += (exit.to - exit.v) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(exit.to - exit.v) < 1e-4) exit.v = exit.to;
  WIDE = WIDE_AT - (WIDE_AT - 1) * smooth(0, .22, globeK());   // round almost at once, so it is a sphere all the way out
  { const g = globeK().toFixed(3); if (g !== lastGk) { lastGk = g; root.style.setProperty('--gk', g); } }   // the names and the line step away on the globe
  // still while explained; turning again, faster, as the globe it leaves as
  // the globe's own turn while leaving is kept apart, and unwinds as it comes back, so Grow returns as it was left
  spin -= exitSpin;
  if (exit.to > 0) exitSpin += SPIN * dt * 9 * exit.v; else exitSpin *= exit.v / Math.max(1e-4, lastExit);
  lastExit = exit.v;
  if (!tune.paused) { clock += dt * tune.pace * rush; spin += SPIN * dt * (1 - smooth(EXPLAIN - .12, EXPLAIN, scrolled)); }
  spin += exitSpin;
  // a step that was waiting for the last to finish starts once it has (it played on, sped up)
  if (rush > 1 && !busy()) { rush = 1; if (wantStage > 0) { const n = wantStage; wantStage = 0; stepTo(n); } }
  follow(dt); autoplay(dt); ambient(dt);
  grow.t += dt * (scrolled > .02 && grow.t < GROW_END ? 6 : 1);   // scrolled on before it was made: finish making it
  for (let c = 0; c < RING; c++) { const L = lapOf(c); if (L !== colLap[c]) { colLap[c] = L; seedColumn(c, L); heatCols(c - HR, c + HR); } }
  heatZones = heatZones.filter(z => z.until > clock);
  for (const z of heatZones) heatCols(z.c - z.w, z.c + z.w);
  yaw += (Math.sin(clock * .09) * .012 * tune.sway - yaw) * .04;
  setCamera();
  stepCues(); stepTweens(); stepJobs();
  draw();
  placeUI();
  if (game && game.paint) game.paint();
  raf = requestAnimationFrame(frame);
}
function start() { if (running || reduced) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
new ResizeObserver(resize).observe(root);
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; onScreen && !document.hidden ? start() : stop(); }).observe(root);
document.addEventListener('visibilitychange', () => { !document.hidden && onScreen ? start() : stop(); });
resize();
if (reduced) {
  // One still: the map, and what's next on it.
  const vis = visible(), T = pickStage(vis);
  if (T >= 0) { S[T * 4] = 1; dirty(T); showRecs(T); clock += 5; stepCues(); stepTweens(); }
  draw(); placeUI();
} else {
  // the making starts under the middle of the land in view
  let best = 1e9;
  const vis0 = visible();
  for (const v of vis0) {
    const d = Math.hypot(v.x - W / 2, v.y - (groundTop() + (Hh - groundTop()) * .45));
    if (d < best) { best = d; grow.th = thetaOf(Math.floor(v.i / ROWS)); grow.ph = phiOf(v.i % ROWS); }
  }
  // the first turn's land is the first lesson's own field: the region where it will be played takes it on
  if (FIRST) {
    const f = F.findIndex(x => x[0] === FIRST.f), mid = groundTop() + (Hh - groundTop()) * .5;
    const at0 = vis0.filter(v => stage(v) && kAt(v.i) < .1).sort((a, b) => Math.hypot(a.x - W / 2, a.y - mid) - Math.hypot(b.x - W / 2, b.y - mid))[0];
    if (at0 && f >= 0 && fieldOf[at0.i] !== f) {
      const g = regionOf[at0.i]; regions[g].f = f;
      for (let i = 0; i < N; i++) if (regionOf[i] === g) { fieldOf[i] = f; staticAt(i); }
      gl.bindBuffer(gl.ARRAY_BUFFER, staticBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, statics);
    }
  }
  start();
}
// ?tune: a small panel to set the map's width (how drawn out the globe is) and the look down, live,
// for choosing the values to ship; the numbers it shows go back into WIDE and tune.look.
if (qs.has('tune')) {
  const pane = el('div', 'gl-tune', `<b>Globe</b><label>Width <output>${WIDE}</output><input type="range" min="1" max="4" step=".05" value="${WIDE}"></label><label>Look down <output>${tune.look}°</output><input type="range" min="40" max="90" step="1" value="${tune.look}"></label>`);
  document.body.append(pane);
  const [w, l] = pane.querySelectorAll('input'), [wo, lo] = pane.querySelectorAll('output');
  w.addEventListener('input', () => { WIDE = WIDE_AT = +w.value; wo.textContent = w.value; resize(); });
  l.addEventListener('input', () => { tune.look = +l.value; lo.textContent = l.value + '°'; resize(); });
}
addEventListener('crux-theme', () => { applyTheme(); if (!running) draw(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); if (!running) draw(); });
window.__globe = { get spin() { return spin; }, get grow() { return grow.t; }, get running() { return running; }, uni, N, RING, ROWS, tileScreen, visible, S, R };
})();
