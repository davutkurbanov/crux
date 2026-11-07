/* The app's own screens, as the 12 October landing (commit f790248) showed them: the games and the
   lessons. Its script, as it was, run in its own scope
   and only over its own sections ([data-screens]), in this page's type and colours (screens.css).
   Each phone plays a real round while it is on screen; nothing runs off screen (live()). */
(() => {
"use strict";
const ROOTS = [...document.querySelectorAll("[data-screens]")];
if (!ROOTS.length) return;
/* Wikimedia Commons thumbnails by article title: 250px for small pictures, 500px when one fills a card. */
const PIC = {"Black hole":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Black_hole_-_Messier_87_crop_max_res.jpg/500px-Black_hole_-_Messier_87_crop_max_res.jpg","Octopus":"https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Octopus2.jpg/500px-Octopus2.jpg","Great Pyramid of Giza":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg/500px-Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg","Rosetta Stone":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/500px-Rosetta_Stone.JPG","Apollo 11":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/A_Man_on_the_Moon%2C_AS11-40-5903_%28cropped%29.jpg/500px-A_Man_on_the_Moon%2C_AS11-40-5903_%28cropped%29.jpg","Saturn":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Saturn_global_view_from_Cassini%2C_rings_open_Better_Colour.png/500px-Saturn_global_view_from_Cassini%2C_rings_open_Better_Colour.png","Moon":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/500px-FullMoon2010.jpg","Mars":"https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png/500px-Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png","Jupiter":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Jupiter_OPAL_2024.png/500px-Jupiter_OPAL_2024.png","Nile":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Beautiful_nature_along_Nile_River_01.jpg/500px-Beautiful_nature_along_Nile_River_01.jpg","Mekong":"https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Mekong-River-Near-Luang-Prabang.jpg/500px-Mekong-River-Near-Luang-Prabang.jpg","Volcano":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Augustine_volcano_Jan_24_2006_-_Cyrus_Read.jpg/500px-Augustine_volcano_Jan_24_2006_-_Cyrus_Read.jpg","Aurora":"https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Aurora_borealis_over_Eielson_Air_Force_Base%2C_Alaska.jpg/500px-Aurora_borealis_over_Eielson_Air_Force_Base%2C_Alaska.jpg","Coral reef":"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Blue_Linckia_Starfish.JPG/500px-Blue_Linckia_Starfish.JPG","Honey bee":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/The_Lone_Pollinator.jpg/500px-The_Lone_Pollinator.jpg","Monarch butterfly":"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Monarch_Butterfly_Danaus_plexippus_Male_2664px.jpg/500px-Monarch_Butterfly_Danaus_plexippus_Male_2664px.jpg","Whale":"https://upload.wikimedia.org/wikipedia/commons/e/e2/Southern_right_whale.jpg","Mona Lisa":"https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Mona_Lisa.jpg/500px-Mona_Lisa.jpg","Starry Night":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg","Great Wave off Kanagawa":"https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/500px-Tsunami_by_hokusai_19th_century.jpg","Girl with a Pearl Earring":"https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/500px-1665_Girl_with_a_Pearl_Earring.jpg","Parthenon":"https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/500px-The_Parthenon_in_Athens.jpg","Colosseum":"https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/500px-Colosseo_2020.jpg","Machu Picchu":"https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg/500px-Machu_Picchu%2C_2023_%28012%29.jpg","Taj Mahal":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/500px-Taj_Mahal_%28Edited%29.jpeg","Angkor Wat":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/500px-Angkor_Wat.jpg","Petra":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Al_Deir_Petra.JPG/500px-Al_Deir_Petra.JPG","Stonehenge":"https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Stonehenge2007_07_30.jpg/500px-Stonehenge2007_07_30.jpg","Terracotta Army":"https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/51714-Terracota-Army.jpg/500px-51714-Terracota-Army.jpg","Great Wall of China":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/500px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg","Albert Einstein":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Albert_Einstein_Head_cleaned.jpg/500px-Albert_Einstein_Head_cleaned.jpg","Marie Curie":"https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/500px-Marie_Curie_c._1920s.jpg","Ada Lovelace":"https://upload.wikimedia.org/wikipedia/commons/4/4c/Ada_Lovelace_daguerreotype_by_Antoine_Claudet_1843_-_cropped.png","Isaac Newton":"https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/500px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg","Charles Darwin":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Charles_Darwin_seated_crop.jpg/500px-Charles_Darwin_seated_crop.jpg","Leonardo da Vinci":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Francesco_Melzi_-_Portrait_of_Leonardo_%28colour_correction%29.png/500px-Francesco_Melzi_-_Portrait_of_Leonardo_%28colour_correction%29.png","Cleopatra":"https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleopatra-VII.-Altes-Museum-Berlin1.jpg/500px-Kleopatra-VII.-Altes-Museum-Berlin1.jpg","Napoleon":"https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg/500px-Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg","Tea":"https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Longjing_tea_steeping_in_gaiwan.jpg/500px-Longjing_tea_steeping_in_gaiwan.jpg","Coffee":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Latte_and_dark_coffee.jpg/500px-Latte_and_dark_coffee.jpg","Chocolate":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Three_Bars_%281%29.jpg/500px-Three_Bars_%281%29.jpg","Compass":"https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/2016_Busola.JPG/500px-2016_Busola.JPG","Sextant":"https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Sextant.jpg/500px-Sextant.jpg","Printing press":"https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Gutenberg_press.png/500px-Gutenberg_press.png","Telescope":"https://upload.wikimedia.org/wikipedia/commons/a/ac/100inchHooker.jpg","Mount Everest":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg/500px-Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg","Sahara":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Sahara_real_color.jpg/500px-Sahara_real_color.jpg","Amazon rainforest":"https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Amazon17_%285641020319%29.jpg/500px-Amazon17_%285641020319%29.jpg","DNA":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/DNA_Structure%2BKey%2BLabelled.pn_NoBB.png/500px-DNA_Structure%2BKey%2BLabelled.pn_NoBB.png","Samarkand":"https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/RegistanSquare_Samarkand.jpg/500px-RegistanSquare_Samarkand.jpg","Hagia Sophia":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/500px-Hagia_Sophia_%28228968325%29.jpeg","Antikythera mechanism":"https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Antikythera_Fragment_A_%28Front%29.webp/500px-Antikythera_Fragment_A_%28Front%29.webp","Cuneiform":"https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Xerxes_Cuneiform_Van.JPG/500px-Xerxes_Cuneiform_Van.JPG","Linear B":"https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/NAMA_Linear_B_tablet_of_Pylos.jpg/500px-NAMA_Linear_B_tablet_of_Pylos.jpg","Europa (moon)":"https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Europa_-_Perijove_45_%28cropped%29.png/500px-Europa_-_Perijove_45_%28cropped%29.png","Venus":"https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Venus_from_Mariner_10.jpg/500px-Venus_from_Mariner_10.jpg","Obsidian":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Lipari-Obsidienne_%285%29.jpg/500px-Lipari-Obsidienne_%285%29.jpg","Tree":"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Usamljeni_jasen_-_panoramio_%28cropped%29.jpg/500px-Usamljeni_jasen_-_panoramio_%28cropped%29.jpg","Mycelium":"https://upload.wikimedia.org/wikipedia/commons/f/f6/Mushroom%27s_roots_%28myc%C3%A9lium%29.jpg","Dahlia":"https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Dahlia_x_hybrida.jpg/500px-Dahlia_x_hybrida.jpg","Galápagos Islands":"https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Lobo_marino_%28Zalophus_californianus_wollebaeki%29%2C_Punta_Pitt%2C_isla_de_San_Crist%C3%B3bal%2C_islas_Gal%C3%A1pagos%2C_Ecuador%2C_2015-07-24%2C_DD_11.JPG/500px-Lobo_marino_%28Zalophus_californianus_wollebaeki%29%2C_Punta_Pitt%2C_isla_de_San_Crist%C3%B3bal%2C_islas_Gal%C3%A1pagos%2C_Ecuador%2C_2015-07-24%2C_DD_11.JPG","Library of Alexandria":"https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Ancientlibraryalex.jpg/500px-Ancientlibraryalex.jpg","Lighthouse of Alexandria":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Lighthouse_-_Thiersch.png/500px-Lighthouse_-_Thiersch.png","The School of Athens":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg/500px-%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg","Plato":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Plato_Silanion_Musei_Capitolini_MC1377.png/500px-Plato_Silanion_Musei_Capitolini_MC1377.png","Frida Kahlo":"https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/500px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg","Vitruvian Man":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Da_Vinci_Vitruve_Luc_Viatour.jpg/500px-Da_Vinci_Vitruve_Luc_Viatour.jpg","Silk Road":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Silk_road_Kazakhstan.svg/500px-Silk_road_Kazakhstan.svg.png","Tectonic plate":"https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Tectonic_plates_%282022%29.svg/500px-Tectonic_plates_%282022%29.svg.png","Earthquake":"https://upload.wikimedia.org/wikipedia/commons/d/db/Quake_epicenters_1963-98.png","Egyptian hieroglyphs":"https://upload.wikimedia.org/wikipedia/commons/c/c9/Hieroglyphs_from_the_tomb_of_Seti_I.jpg","Ancient Egypt":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Ancient_Egypt_map-en.svg/500px-Ancient_Egypt_map-en.svg.png","Hokusai":"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Hokusai_as_an_old_man.jpg/500px-Hokusai_as_an_old_man.jpg","Johannes Vermeer":"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Cropped_version_of_Jan_Vermeer_van_Delft_002.jpg/500px-Cropped_version_of_Jan_Vermeer_van_Delft_002.jpg","Galileo Galilei":"https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Galileo_Galilei_%281564-1642%29_RMG_BHC2700.tiff/lossy-page1-960px-Galileo_Galilei_%281564-1642%29_RMG_BHC2700.tiff.jpg","Chess":"https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/ChessSet.jpg/500px-ChessSet.jpg","Football":"https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Youth-soccer-indiana.jpg/500px-Youth-soccer-indiana.jpg","Food":"https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/500px-Good_Food_Display_-_NCI_Visuals_Online.jpg","Markets":"https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Sao_Paulo_Stock_Exchange.jpg/500px-Sao_Paulo_Stock_Exchange.jpg","Euro":"https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Euro_coins_and_banknotes_%28cropped%29.jpg/500px-Euro_coins_and_banknotes_%28cropped%29.jpg","Brain":"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Nicolas_P._Rougier%27s_rendering_of_the_human_brain.png/500px-Nicolas_P._Rougier%27s_rendering_of_the_human_brain.png","Gold":"https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Gold-crystals.jpg/500px-Gold-crystals.jpg"};
const pic = (t, w = 250) => (PIC[t] || "").replace("/500px-", `/${w}px-`);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
// the screens live in more than one part of the page; a lookup searches them all
const $ = (s, r) => (r ? r.querySelector(s) : ROOTS.map((x) => x.querySelector(s)).find(Boolean) || null);
const $$ = (s, r) => (r ? [...r.querySelectorAll(s)] : ROOTS.flatMap((x) => [...x.querySelectorAll(s)]));
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const img = (t, w = 250, extra = 'loading="lazy"') => `<img src="${pic(t, w)}" alt="" decoding="async" ${extra}>`;
const fmt = (n) => Math.round(n).toLocaleString("en-GB");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* A loop that runs only while its element is on screen and the tab is visible; under reduced
   motion it never starts and still() draws the finished frame. */
function live(el, loop, still) {
  still?.();
  let vis = false; const wakers = new Set();
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) { wakers.forEach((w) => w()); wakers.clear(); } }, { threshold: 0.12 }).observe(el);
  const onScreen = () => { if (vis) return true; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const ctl = { async wait(ms) { await sleep(ms); while (!onScreen() || document.hidden) await new Promise((r) => { wakers.add(r); setTimeout(r, 500); }); } };
  (async () => { await ctl.wait(0); for (;;) await loop(ctl); })();
}
function countTo(el, from, to, ms, suffix = "") {
  const t0 = performance.now();
  return new Promise((res) => { const f = (t) => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e) + suffix; p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
}
const fitPhones = () => $$(".phone").forEach((p) => { const s = p.querySelector(".scr"), k = p.clientWidth / 390; s.style.transform = `scale(${k})`; s._k = k; });
new ResizeObserver(fitPhones).observe(document.body); fitPhones();
const SB = (w) => `<div class="sb${w ? " sb--w" : ""}"><span>9:41</span><span><svg viewBox="0 0 70 13" style="width:62px"><use href="#status"/></svg></span></div>`;
const GBAR = (p) => `<div class="gbar"><span class="gbar__x"><svg><use href="#x"/></svg></span><div class="gbar__l"><i data-gp style="transform:scaleX(${p})"></i></div><span class="gbar__m"><i></i><i></i><i></i></span></div>`;
/* A finger that taps inside a phone screen (coordinates in the screen's own 390 × 844 space). */
function finger(scr) {
  const f = h(`<span class="finger"></span>`); scr.append(f);
  return async (el, ctl) => { const s = scr.getBoundingClientRect(), r = el.getBoundingClientRect(), k = scr._k || 1, x = (r.left - s.left + r.width * .6) / k, y = (r.top - s.top + r.height / 2) / k;
    f.style.translate = `${x}px ${y}px`; f.style.opacity = 1; await ctl.wait(680); f.style.scale = .72; el.classList.add("tap"); ripple(scr, x, y); await ctl.wait(170); f.style.scale = 1; el.classList.remove("tap"); await ctl.wait(140); f.style.opacity = 0; };
}
/* A ring that spreads from where a finger lands, so every tap reads. */
function ripple(host, x, y) { const r = h(`<i class="ripple" style="left:${x}px;top:${y}px"></i>`); host.append(r); setTimeout(() => r.remove(), 650); }

/* ═══ Knowledge map (Crux Map Studio, light) ══════════════════════════════
   One joined field of square tiles. Each tile has a field, its own article picture and a
   knowledge value k in 0..1, in 17 steps:
     k < 0.06   unknown: a pale paper tile
     k < 0.80   learning → known: pale mint → deeper mint
     k ≥ 0.80   mastered: the tile shows its article's picture
   The view can zoom from a single field to the whole map. Seeded: the same map every visit. */
const STOPS = [[228, 238, 231], [176, 223, 199], [104, 186, 152]];
const T_LEARN = .06, T_MASTER = .8, STEPS = 5;
function tileColour(k) {
  const q = Math.round(Math.max(0, Math.min(1, (k - T_LEARN) / (T_MASTER - T_LEARN))) * (STEPS - 1)) / (STEPS - 1);
  const t = Math.pow(q, 1.15), s = t * 2, i = s < 1 ? 0 : 1, f = s - i, a = STOPS[i], b = STOPS[i + 1];
  return `rgb(${a[0] + (b[0] - a[0]) * f | 0},${a[1] + (b[1] - a[1]) * f | 0},${a[2] + (b[2] - a[2]) * f | 0})`;
}
function noise2(seed, scale) {
  const r = rng(seed), G = 64, v = Array.from({ length: G * G }, r), at = (x, y) => v[((y % G + G) % G) * G + ((x % G + G) % G)], sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => { x *= scale; y *= scale; const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi), a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
}
const IMGS = new Map();
function picImg(title, w, cb) {
  const key = title + w; let im = IMGS.get(key);
  if (!im) { im = new Image(); im.decoding = "async"; im.src = pic(title, w); IMGS.set(key, im); im._cbs = []; im.onload = () => { im._cbs.forEach((f) => f()); im._cbs = []; }; }
  if (!im.complete && cb) im._cbs.push(cb);
  return im;
}
/* The seven domains and the articles whose pictures fill their mastered tiles. */
const FIELDS = {
  h: { name: "History", pics: ["Colosseum", "Great Pyramid of Giza", "Rosetta Stone", "Terracotta Army", "Cleopatra", "Napoleon", "Great Wall of China", "Petra", "Angkor Wat", "Stonehenge", "Parthenon", "Hagia Sophia", "Samarkand", "Ancient Egypt"] },
  p: { name: "Physical Sciences", pics: ["Saturn", "Black hole", "Moon", "Mars", "Jupiter", "Venus", "Aurora", "Europa (moon)", "Telescope", "Apollo 11", "Galileo Galilei", "Albert Einstein", "Isaac Newton", "Marie Curie"] },
  a: { name: "Arts", pics: ["Mona Lisa", "Starry Night", "Great Wave off Kanagawa", "Girl with a Pearl Earring", "Frida Kahlo", "Vitruvian Man", "The School of Athens", "Hokusai", "Johannes Vermeer", "Leonardo da Vinci"] },
  g: { name: "Geography", pics: ["Mount Everest", "Sahara", "Nile", "Amazon rainforest", "Volcano", "Machu Picchu", "Galápagos Islands", "Mekong", "Tectonic plate", "Taj Mahal"] },
  l: { name: "Life Sciences", pics: ["Octopus", "Honey bee", "Whale", "Coral reef", "Monarch butterfly", "Mycelium", "Charles Darwin", "DNA", "Dahlia", "Tree", "Brain"] },
  s: { name: "Society", pics: ["Library of Alexandria", "Plato", "Printing press", "Ada Lovelace", "Cuneiform", "Linear B", "Egyptian hieroglyphs", "Silk Road", "Markets", "Euro"] },
  r: { name: "Recreation", pics: ["Coffee", "Tea", "Chocolate", "Chess", "Football", "Food", "Compass", "Sextant", "Gold"] },
};
class KMap {
  constructor(host, opt) {
    this.host = host; this.cv = host.querySelector("canvas"); this.o = opt; this.ov = opt.ov;
    const { cols, rows, seed, fields, blobs, know } = opt, n1 = noise2(seed, .14), n2 = noise2(seed + 9, .2), n3 = noise2(seed + 17, .55);
    this.cols = cols; this.rows = rows; this.cells = []; this.at = new Map();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const nx = x / cols, ny = y / rows;
      let m = 0; for (const [bx, by, sx, sy, w = 1] of blobs) m += w * Math.exp(-(((nx - bx) / sx) ** 2 + ((ny - by) / sy) ** 2));
      m += (n1(x, y) - .5) * .6;
      if (m < .6) continue;
      let f = 0, best = 1e9; fields.forEach((fd, i) => { const d = (nx - fd.x) ** 2 + ((ny - fd.y) * rows / cols) ** 2; if (d < best) { best = d; f = i; } });
      let k = 0; for (const [kx, ky, s, a] of know) k += a * Math.exp(-(((nx - kx) ** 2 + ((ny - ky) * rows / cols) ** 2) / (s * s)));
      const hf = n3(x, y);
      k = Math.max(0, Math.min(1, k + (n2(x, y) - .5) * .5 + (hf - .5) * .3));
      if (k > .45 && hf > .8) k = Math.max(k, .86);
      const c = { x, y, f, k, i: this.cells.length, n: (n3(x + 40, y + 40) - .5) * 8 }; this.cells.push(c); this.at.set(x + "," + y, c);
    }
    this.fields = fields.map((fd, i) => { const cs = this.cells.filter((c) => c.f === i), xs = cs.map((c) => c.x), ys = cs.map((c) => c.y);
      return { ...fd, ...FIELDS[fd.key], cells: cs, x0: Math.min(...xs), x1: Math.max(...xs) + 1, y0: Math.min(...ys), y1: Math.max(...ys) + 1, cx: xs.reduce((a, b) => a + b, 0) / cs.length, cy: ys.reduce((a, b) => a + b, 0) / cs.length }; });
    /* Units: small clusters of tiles inside a field (a jittered Voronoi), each with one picture
       that spans its tiles, as in the Map Studio. Tiles take most of their unit's knowledge, so
       the map reads as a patchwork of articles rather than a smooth gradient. */
    const U = opt.unit || 3, ur = rng(seed + 5);
    this.units = []; this.used = new Set();
    this.fields.forEach((fd, fi) => {
      const seeds = [];
      for (let y = fd.y0; y < fd.y1; y += U) for (let x = fd.x0; x < fd.x1; x += U) seeds.push([x + ur() * U, y + ur() * U]);
      const groups = new Map();
      fd.cells.forEach((c) => { let bi = 0, bd = 1e9; seeds.forEach((q, i) => { const d = (c.x + .5 - q[0]) ** 2 + (c.y + .5 - q[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); if (!groups.has(bi)) groups.set(bi, []); groups.get(bi).push(c); });
      /* Each picture is used once per map: a mastered unit needs a picture of its own, so once a
         field's pictures are spent its other well-known units stay deep mint. */
      const pool = fd.pics.filter((t) => !this.used.has(t) && !(opt.reserve || []).includes(t));
      const us = [...groups.values()].map((cs) => { const xs = cs.map((c) => c.x), ys = cs.map((c) => c.y), mk = cs.reduce((a, c) => a + c.k, 0) / cs.length;
        return { cells: cs, f: fi, pic: null, mk, roll: ur(), x0: Math.min(...xs), x1: Math.max(...xs) + 1, y0: Math.min(...ys), y1: Math.max(...ys) + 1 }; });
      for (const u of us) { u.cells.forEach((c) => { c.u = u; c.k = Math.max(0, Math.min(.78, u.mk)); }); this.units.push(u); }
      // Pictures go to well-known units in a shuffled order, so they scatter rather than cluster.
      for (const u of us.filter((x) => x.mk > .66 && x.cells.length >= 4).sort((a, b) => a.roll - b.roll)) {
        if (!pool.length || u.roll > .8) continue; u.pic = pool.shift(); this.used.add(u.pic); u.cells.forEach((c) => (c.k = .9)); }
    });
    this.k0 = this.cells.map((c) => c.k); this.units.forEach((u) => (u.pic0 = u.pic));
    this.view = this.full(); this.redraw = () => this.draw();
    new ResizeObserver(this.redraw).observe(host);
  }
  full() { const xs = this.cells.map((c) => c.x), ys = this.cells.map((c) => c.y); return { x0: Math.min(...xs) - 1, y0: Math.min(...ys) - 1, x1: Math.max(...xs) + 2, y1: Math.max(...ys) + 2 }; }
  fieldView(fi, pad = 1.5) { const f = this.fields[fi]; return { x0: f.x0 - pad, y0: f.y0 - pad, x1: f.x1 + pad, y1: f.y1 + pad }; }
  around(c, r) { return { x0: c.x - r, y0: c.y - r * .85, x1: c.x + r + 1, y1: c.y + r * .85 + 1 }; }
  reset() { this.cells.forEach((c, i) => (c.k = this.k0[i])); this.units.forEach((u) => (u.pic = u.pic0)); this.used = new Set(this.units.map((u) => u.pic).filter(Boolean)); this.draw(); }
  /* Give a unit a picture, taking it from any other unit that had it, so no picture shows twice. */
  claim(u, title) { for (const v of this.units) if (v !== u && v.pic === title) { v.pic = null; v.cells.forEach((c) => (c.k = Math.min(c.k, .78))); } u.pic = title; this.used.add(title); }
  reveal(cx, cy, R, soft = 4) { this.cells.forEach((c, i) => { const d = Math.hypot(c.x - cx, c.y - cy); c.k = d <= R ? this.k0[i] : d <= R + soft && this.k0[i] < T_MASTER ? this.k0[i] * (1 - (d - R) / soft) : 0; }); }
  nb(c, r = 1) { const out = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (!dx && !dy) continue; const n = this.at.get(c.x + dx + "," + (c.y + dy)); if (n) out.push(n); } return out; }
  frontier(fi) { return this.cells.filter((c) => (fi == null || c.f === fi) && c.k < .45 && this.nb(c).some((n) => n.k >= .5)); }
  geom() {
    const w = this.host.clientWidth, hh = this.host.clientHeight, pad = typeof this.o.pad === "function" ? this.o.pad() : (this.o.pad || [0, 0, 0, 0]), v = this.view;
    const aw = w * (1 - pad[1] - pad[3]), ah = hh * (1 - pad[0] - pad[2]), vw = v.x1 - v.x0, vh = v.y1 - v.y0;
    const s = Math.min(aw / vw, ah / vh) * (this.o.cover ? Math.max(aw / vw, ah / vh) / Math.min(aw / vw, ah / vh) : 1);
    return { s, ox: w * pad[3] + (aw - s * vw) / 2 - v.x0 * s, oy: hh * pad[0] + (ah - s * vh) / 2 - v.y0 * s, w, h: hh };
  }
  rect(c) { const g = this.geom(); return { x: g.ox + c.x * g.s, y: g.oy + c.y * g.s, s: g.s }; }
  async zoomTo(v, ms = 1400) {
    const a = { ...this.view }, t0 = performance.now(), e = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    await new Promise((res) => { const f = (t) => { const p = Math.min(1, (t - t0) / ms), q = e(p); this.view = { x0: a.x0 + (v.x0 - a.x0) * q, y0: a.y0 + (v.y0 - a.y0) * q, x1: a.x1 + (v.x1 - a.x1) * q, y1: a.y1 + (v.y1 - a.y1) * q }; this.draw(); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  }
  draw() {
    const g = this.geom(); if (!g.w) return;
    const dpr = Math.min(2, devicePixelRatio || 1), cv = this.cv, ctx = cv.getContext("2d");
    if (cv.width !== Math.round(g.w * dpr) || cv.height !== Math.round(g.h * dpr)) { cv.width = Math.round(g.w * dpr); cv.height = Math.round(g.h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, g.w, g.h);
    const s = g.s, gap = 0, size = 250;
    const mastered = new Map();
    for (const c of this.cells) {
      const x = g.ox + c.x * s, y = g.oy + c.y * s;
      if (x > g.w || y > g.h || x + s < 0 || y + s < 0) continue;
      const gp = s > 14 ? 1 : 0, W = s + .4 - gp;
      if (c.k >= T_MASTER) { ctx.fillStyle = tileColour(1); if (c.u.pic) { if (!mastered.has(c.u)) mastered.set(c.u, []); mastered.get(c.u).push([x, y]); } }
      else if (c.k >= T_LEARN) ctx.fillStyle = tileColour(c.k);
      else ctx.fillStyle = "#efeee8";
      ctx.fillRect(x, y, W, W);
    }
    /* A mastered unit shows its picture across the tiles you have mastered in it. */
    for (const [u, xy] of mastered) {
      const im = picImg(u.pic, s * (u.x1 - u.x0) > 120 ? 500 : 250, this.redraw); if (!im.complete || !im.naturalWidth) continue;
      const bx = g.ox + u.x0 * s, by = g.oy + u.y0 * s, bw = (u.x1 - u.x0) * s, bh = (u.y1 - u.y0) * s, sc = Math.max(bw / im.naturalWidth, bh / im.naturalHeight), dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      // One continuous picture: the clip covers whole tiles, gaps included, so no grid runs across it.
      ctx.save(); ctx.beginPath(); for (const [x, y] of xy) ctx.rect(x - .3, y - .3, s + .6, s + .6); ctx.clip();
      ctx.drawImage(im, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh); ctx.restore();
    }
    if (this.o.labels !== false && s < 14 && s >= 5) {
      ctx.font = `400 ${Math.max(12, Math.min(16, s * 1.5))}px Figtree, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(247,245,240,.9)"; ctx.fillStyle = "#14201a";
      for (const fd of this.fields) { const lx = g.ox + (fd.cx + .5) * s, ly = g.oy + (fd.cy + .5) * s; ctx.strokeText(fd.name, lx, ly); ctx.fillText(fd.name, lx, ly); }
    }
    this.o.onDraw?.();
  }
  learn(c, k, layer, soft) { c.k = Math.max(c.k, k); this.draw(); if (layer) { const r = this.rect(c), p = h(`<i class="pop${soft ? " pop--soft" : ""}" style="left:${r.x}px;top:${r.y}px;width:${r.s}px;height:${r.s}px"></i>`); layer.append(p); setTimeout(() => p.remove(), 950); } }
  /* A whole unit fills in, tile by tile, so its picture assembles. */
  async learnUnit(u, k, layer, step = 55) {
    if (layer) { const a = this.rect({ x: u.x0, y: u.y0 }), s = a.s, l = h(`<i class="uline" style="left:${a.x}px;top:${a.y}px;width:${(u.x1 - u.x0) * s}px;height:${(u.y1 - u.y0) * s}px"></i>`); layer.append(l); setTimeout(() => l.remove(), 1700); }
    const cs = [...u.cells].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const c of cs) { this.learn(c, k, layer); await sleep(step); }
  }
  frontierUnits(fi, view) {
    return this.units.filter((u) => (fi == null || u.f === fi) && u.cells.every((c) => c.k < .5) && u.cells.some((c) => this.nb(c).some((n) => n.k >= .5)) &&
      (!view || (u.x0 >= view.x0 + 1 && u.x1 <= view.x1 - 1 && u.y0 >= view.y0 + 1 && u.y1 <= view.y1 - 1)));
  }
  spread(c, r, warmth) { for (const n of this.nb(c, r)) { const d = Math.hypot(n.x - c.x, n.y - c.y); n.k = Math.max(n.k, Math.min(.74, c.k * warmth * (1 - d / (r + 1)))); } this.draw(); }
  stats() { return { known: this.cells.filter((c) => c.k >= .5).length, mastered: this.cells.filter((c) => c.k >= T_MASTER).length }; }
}
/* A pinned note on a tile that follows it through zooms. */
function pinner(map, layer) {
  const pins = new Set(), links = new Set();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;overflow:visible"); layer.prepend(svg);
  const place = (p) => { const r = map.rect(p.c); p.el.style.translate = `${r.x}px ${r.y}px`; const sq = p.el.firstElementChild; sq.style.width = sq.style.height = r.s + "px";
    // The label sits centred over its tile, but never runs off the edge of the map.
    const lab = p.el.lastElementChild, w = lab.offsetWidth, W = layer.clientWidth, c = Math.max(w / 2 + 10, Math.min(W - w / 2 - 10, r.x + r.s / 2)); lab.style.left = c - r.x + "px"; };
  const line = (l) => { const a = map.rect(l.a), b = map.rect(l.b); l.el.setAttribute("x1", a.x + a.s / 2); l.el.setAttribute("y1", a.y + a.s / 2); l.el.setAttribute("x2", b.x + b.s / 2); l.el.setAttribute("y2", b.y + b.s / 2); };
  map.o.onDraw = () => { pins.forEach(place); links.forEach(line); };
  return {
    link(a, b) { const el = document.createElementNS("http://www.w3.org/2000/svg", "line"); el.setAttribute("stroke", "#2f6b4f"); el.setAttribute("stroke-width", "2"); el.setAttribute("stroke-dasharray", "4 5"); el.style.transition = "opacity .4s"; el.style.opacity = 0; const l = { a, b, el }; svg.append(el); links.add(l); line(l); setTimeout(() => (el.style.opacity = .85), 20); },
    add(c, { kind = "", small, title, picT, below }) {
      const el = h(`<div class="pin ${kind ? "pin--" + kind : ""}${below ? " pin--below" : ""}" style="opacity:0"><span class="pin__sq"></span><span class="pin__t">${picT ? img(picT, 250, "") : ""}<span><small>${small}</small>${title ? `<b>${title}</b>` : ""}</span></span></div>`);
      layer.append(el); const p = { c, el }; pins.add(p); el.style.transition = "none"; place(p); void el.offsetWidth; el.style.transition = ""; el.style.opacity = 1; return p;
    },
    remove(p) { if (!p) return; p.el.style.opacity = 0; setTimeout(() => p.el.remove(), 400); pins.delete(p); },
    clear() { pins.forEach((p) => this.remove(p)); links.forEach((l) => { l.el.style.opacity = 0; setTimeout(() => l.el.remove(), 400); }); links.clear(); },
  };
}
const MAP7 = (seed) => ({ cols: 64, rows: 50, seed,
  blobs: [[.5, .5, .42, .42, 1.15], [.24, .36, .2, .24, .8], [.76, .38, .2, .24, .8], [.36, .76, .22, .16, .7], [.68, .74, .2, .18, .7], [.5, .18, .2, .12, .6]],
  fields: [{ key: "h", x: .26, y: .34 }, { key: "a", x: .48, y: .24 }, { key: "p", x: .74, y: .36 }, { key: "g", x: .52, y: .54 }, { key: "s", x: .3, y: .66 }, { key: "l", x: .72, y: .7 }, { key: "r", x: .5, y: .82 }],
  know: [[.25, .34, .16, .98], [.48, .25, .12, .86], [.74, .36, .12, .9], [.52, .55, .1, .66], [.3, .66, .09, .52], [.7, .7, .07, .42]] });


/* ═══ Games: the earlier landing's game frame, light, with the new games ═══ */
const WORLD = {"step":3,"top":81,"left":-180,"rows":["000000000000000000000000010011111111111111111111111111000000000011110000000000000000000000011110000000000000000000000000","000000000000000000000111101111111100011111111111111110000000000001000000000000001010000000111111110000000010000000000000","000000000000000000111110101110111110000001111111111110000000000000000000000000100001010111111111111111100001000000000000","000000111111100001010111110011111111100000111111111100000000000000011110000000001011111111111111111111111111111111110110","111001111111111111111111111111111001111000111111110000000000000001111111111111111111111111111111111111111111111111111111","001011111111111111111111111111110001111000011110000011100000000111111111111111111111111111111111111111111111111111111111","000001111111111111111111111110000011000000011100000000000000001111011111111111111111111111111111111111111111111111111110","000000111000001111111111111110000011111000000000000000000010001111001111111111111111111111111111111111111111100001000000","000000000000000011111111111111110011111100000000000000000011000111011111111111111111111111111111111111111100000011000000","000000000000000001111111111111111111111111000000000000000101111111111111111111111111111111111111111111111110000010000000","000000000000000000111111111111111111111101000000000000000011111111111111111111111111111111111111111111111111000000000000","000000000000000000111111111111111111111100000000000000000001111111111111111111111111111111111111111111111100000000000000","000000000000000000111111111111111111100000000000000000000111111111111100011111111111111111111111111111111001000000000000","000000000000000000111111111111111111000000000000000000000111100001111111111111111111111111111111111111100000000000000000","000000000000000000011111111111111110000000000000000000000111011000010111111111111111111111111111111110100010000000000000","000000000000000000001111111111111110000000000000000000000111111100000000111111111111111111111111111100111100000000000000","000000000000000000000111111111111000000000000000000000000111111111111111111111111111111111111111111110000000000000000000","000000000000000000000011111100001000000000000000000000001111111111111111111101111111111111111111111110000000000000000000","000000000000000000000010111100000000000000000000000000011111111111111111111110011111111111111111111100000000000000000000","000000000000000000000000111100000100000000000000000000111111111111111111011111110001111111111111111000000000000000000000","000000000000000000000000011101100001100000000000000000111111111111111111111111110000111110011111100000000000000000000000","000000000000000000000000000111110000000000000000000000111111111111111111101111000000111100011111000010000000000000000000","000000000000000000000000000000110000000000000000000000111111111111111111111100000000011000000111100010000000000000000000","000000000000000000000000000000011001111000000000000000011111111111111111111110000000011000000011000001000000000000000000","000000000000000000000000000000001011111110000000000000001111111111111111111110000000001000000100000001000000000000000000","000000000000000000000000000000000011111111100000000000000111001111111111111100000000000000001110001100000000000000000000","000000000000000000000000000000000111111111100000000000000000000111111111111000000000000000000110111100100000000000000000","000000000000000000000000000000000111111111111000000000000000000111111111110000000000000000000110111110001010000000000000","000000000000000000000000000000000111111111111111000000000000000011111111100000000000000000000011000000001111100000000000","000000000000000000000000000000000111111111111111100000000000000011111111100000000000000000000001100100000011100000000000","000000000000000000000000000000000011111111111111000000000000000011111111110000000000000000000000000000000000000000000000","000000000000000000000000000000000011111111111110000000000000000011111111110010000000000000000000000000011101000000000000","000000000000000000000000000000000001111111111110000000000000000011111111110110000000000000000000000001111111100000000000","000000000000000000000000000000000000111111111110000000000000000011111111001110000000000000000000000011111111110000000000","000000000000000000000000000000000000111111111100000000000000000011111111001100000000000000000000001111111111110000000000","000000000000000000000000000000000000111111110000000000000000000001111110000100000000000000000000001111111111111000000000","000000000000000000000000000000000000111111110000000000000000000001111110000000000000000000000000001111111111111000000000","000000000000000000000000000000000000111111100000000000000000000000111100000000000000000000000000001111111111111000000000","000000000000000000000000000000000000111111000000000000000000000000111000000000000000000000000000000110000111110000000000","000000000000000000000000000000000001111110000000000000000000000000000000000000000000000000000000000000000001110000000010","000000000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000000000000000000000010","000000000000000000000000000000000001111000000000000000000000000000000000000000000000000000000000000000000000100000001100","000000000000000000000000000000000001110000000000000000000000000000000000000000000000000000000000000000000000000000001000","000000000000000000000000000000000001110000000000000000000000000000000000000000000000000000000000000000000000000000000000","000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000","000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000"]};
const GF = (scr, { prompt, bar = .3, btn = "Check", lives = 3, streak = false }) => {
  scr.innerHTML = SB() + `<div class="gf"><div class="gf__top"><span class="gf__x"><svg><use href="#x"/></svg></span><div class="gf__bar"><i style="--p:${bar}"></i></div>${streak ? `<span class="gf__streak">0</span>` : `<span class="gf__lives">${"<i></i>".repeat(lives)}</span>`}</div>
    <p class="gf__prompt">${prompt}</p><div class="gf__stage"></div><div class="gf__foot"><div class="gf__verdict"></div><span class="gf__btn">${btn}</span></div><span class="tapdot"></span></div>`;
  const q = (s) => scr.querySelector(s), gf = q(".gf"), dot = q(".tapdot");
  const g = { gf, stage: q(".gf__stage"), verdict: q(".gf__verdict"), btn: q(".gf__btn"), bar: q(".gf__bar i"), lives: [...scr.querySelectorAll(".gf__lives i")], streak: q(".gf__streak"), prompt: q(".gf__prompt") };
  g.k = () => (scr.closest(".scr") || scr)._k || 1;
  g.rel = (el, base = g.stage) => { const a = el.getBoundingClientRect(), b = base.getBoundingClientRect(), k = g.k(); return { x: (a.left - b.left) / k, y: (a.top - b.top) / k, w: a.width / k, h: a.height / k }; };
  g.say = (hh, bb) => { g.verdict.classList.remove("on"); g.verdict.innerHTML = `${hh ? `<p class="gf__vh">${hh}</p>` : ""}${bb ? `<p class="gf__vb">${bb}</p>` : ""}`; void g.verdict.offsetWidth; if (hh || bb) g.verdict.classList.add("on"); };
  g.setBar = (p) => g.bar.style.setProperty("--p", p);
  g.tap = async (el, ctl) => { const r = g.rel(el, gf); dot.style.translate = `${r.x + r.w / 2}px ${r.y + r.h / 2}px`; dot.style.opacity = 1; await ctl.wait(620); dot.style.scale = .72; el.classList.add("press"); ripple(gf, r.x + r.w / 2, r.y + r.h / 2); await ctl.wait(170); dot.style.scale = 1; el.classList.remove("press"); dot.style.opacity = 0; };
  return g;
};
const gameCard = ([t, p, s, d]) => `<div class="gc"><div class="gc__img">${img(p, 250, "")}</div><div class="gc__w"><div class="gc__t">${t}</div><div class="gc__s">${s}</div>${d ? `<div class="gc__d">${d}</div>` : ""}</div></div>`;
const yr = (v) => (v < 0 ? `${Math.round(-v)} BC` : `AD ${Math.round(v)}`);
const tween = (ms, fn) => new Promise((done) => { const t0 = performance.now(), e = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); const f = (now) => { const t = Math.min(1, (now - t0) / ms); fn(e(t)); t < 1 ? requestAnimationFrame(f) : done(); }; requestAnimationFrame(f); });

{
  // Definitions: the article with its words taken out.
  const ph = $('[data-game="def"]'), scr = ph.querySelector(".scr");
  const g = GF(scr, { prompt: "Fill the gaps the article left.", bar: .55 });
  const WORDS = ["seventy", "Fuji", "Prussian", "woodblocks"], PICKS = ["seventy", "Fuji", "copper", "woodblocks"];
  g.stage.innerHTML = `<div class="dfx__art">${img("Great Wave off Kanagawa", 250, "")}<div><b>The Great Wave off Kanagawa</b><span>Woodblock print by Hokusai, about 1831</span></div></div>
    <p class="dfx__txt">Hokusai was about <span class="gap"></span> when he made it, one of thirty-six views of Mount <span class="gap"></span>. Its deep <span class="gap"></span> blue was new to Japan, printed from carved <span class="gap"></span>.</p><div class="dfx__chips"></div>`;
  const gaps = [...g.stage.querySelectorAll(".gap")], chipsEl = g.stage.querySelector(".dfx__chips");
  const reset = () => { g.say(); g.lives.forEach((l) => l.classList.remove("gone")); g.setBar(.55); g.btn.textContent = "Check"; g.btn.classList.add("off");
    gaps.forEach((x) => { x.className = "gap"; delete x.dataset.f; }); chipsEl.innerHTML = ["woodblocks", "copper", "Fuji", "seventy", "thirty", "Prussian"].map((w) => `<span class="chip">${w}</span>`).join(""); };
  reset();
  live(ph, async (ctl) => {
    reset(); await ctl.wait(1100);
    const chips = [...chipsEl.children];
    for (let i = 0; i < 4; i++) {
      const c = chips.find((x) => x.textContent === PICKS[i]), a = g.rel(c), b = g.rel(gaps[i]);
      c.classList.add("held"); await ctl.wait(200);
      c.style.translate = `${b.x + b.w / 2 - (a.x + a.w / 2)}px ${b.y + b.h / 2 - (a.y + a.h / 2)}px`; await ctl.wait(560);
      c.classList.remove("held"); c.classList.add("used"); gaps[i].dataset.f = PICKS[i]; gaps[i].classList.add("fill"); await ctl.wait(380);
    }
    g.btn.classList.remove("off"); await ctl.wait(400); await g.tap(g.btn, ctl);
    for (let i = 0; i < 4; i++) { gaps[i].classList.remove("fill"); gaps[i].classList.add(PICKS[i] === WORDS[i] ? "ok" : "bad"); await ctl.wait(240); }
    g.lives[2].classList.add("gone"); g.setBar(.8); g.say("Three of four.", "The blue was Prussian blue, a pigment just arrived from Europe.");
    await ctl.wait(1700); gaps[2].dataset.f = "Prussian"; gaps[2].className = "gap ok"; g.btn.textContent = "Continue";
    await ctl.wait(2600);
  });
}
{
  // Origin: a museum object. Where, and when, was it made?
  const ph = $('[data-game="origin"]'), scr = ph.querySelector(".scr");
  const g = GF(scr, { prompt: "Where and when was it made?", bar: .35, btn: "Guess" });
  g.stage.innerHTML = `<div class="fx__obj">${img("Terracotta Army", 500, "")}<span class="fx__score">0</span></div><div class="fx__map"><svg preserveAspectRatio="xMidYMid slice"></svg><span class="fx__dist">1,240 km away</span></div>
    <div class="fx__year"><div><span>Made around</span><b>AD 500</b></div><div class="fx__track"><i></i><s></s></div><div><span>3000 BC</span><span>AD 2000</span></div></div>`;
  const $s = (q) => g.stage.querySelector(q), map = $s(".fx__map"), svg = $s("svg"), dist = $s(".fx__dist"), track = $s(".fx__track"), yEl = $s(".fx__year b"), score = $s(".fx__score");
  const MW = 350, MH = 140, cols = WORLD.rows[0].length, rows = WORLD.rows.length;
  const LX = (lon) => ((lon - WORLD.left) / (cols * WORLD.step)) * MW, LY = (lat) => ((WORLD.top - lat) / (rows * WORLD.step)) * MH;
  let dots = ""; WORLD.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === "1") dots += `<circle cx="${((x + .5) / cols * MW).toFixed(1)}" cy="${((y + .5) / rows * MH).toFixed(1)}" r="1.05"/>`; });
  svg.innerHTML = `<g fill="#c9cdc8">${dots}</g><line stroke="#2f6b4f" stroke-width=".8" stroke-dasharray="1.6 1.6" opacity="0"/><circle r="2.4" fill="#2f6b4f" stroke="#fff" stroke-width=".8" opacity="0" data-t/><circle r="3.2" fill="#14201a" stroke="#fff" stroke-width="1.1" data-p/>`;
  const pin = svg.querySelector("[data-p]"), tru = svg.querySelector("[data-t]"), line = svg.querySelector("line");
  const TRUE = [LX(109.3), LY(34.4)], GUESS = [LX(97), LY(31)], YT = -210, Y0 = 500, YG = -420;
  const W = () => track.clientWidth, Yx = (v) => ((v + 3000) / 5000) * W();
  tru.setAttribute("cx", TRUE[0]); tru.setAttribute("cy", TRUE[1]);
  const vb = (x, y, w, h) => svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  const reset = () => { g.say(); g.btn.textContent = "Guess"; g.btn.classList.add("off"); map.classList.remove("big"); vb(0, 0, MW, MH); dist.classList.remove("on"); track.classList.remove("rev"); tru.setAttribute("opacity", 0); line.setAttribute("opacity", 0); score.classList.remove("on");
    pin.setAttribute("cx", MW / 2); pin.setAttribute("cy", MH / 2); track.style.setProperty("--x", Yx(Y0) + "px"); track.style.setProperty("--t", Yx(YT) + "px"); yEl.textContent = yr(Y0); };
  requestAnimationFrame(reset);
  live(ph, async (ctl) => {
    reset(); await ctl.wait(1400);
    await tween(1100, (e) => { pin.setAttribute("cx", MW / 2 + (GUESS[0] - MW / 2) * e); pin.setAttribute("cy", MH / 2 + (GUESS[1] - MH / 2) * e); });
    await ctl.wait(250);
    await tween(900, (e) => { const v = Y0 + (YG - Y0) * e; track.style.setProperty("--x", Yx(v) + "px"); yEl.textContent = yr(v); });
    g.btn.classList.remove("off"); await ctl.wait(400); await g.tap(g.btn, ctl);
    map.classList.add("big"); await ctl.wait(80);
    const F = [(GUESS[0] + TRUE[0]) / 2, (GUESS[1] + TRUE[1]) / 2], w1 = 60;
    await tween(1200, (e) => { const cw = map.offsetWidth, ch = map.offsetHeight, vw = MW * Math.pow(w1 / MW, e), vh = vw * (ch / cw), fx = F[0] / MW + (.5 - F[0] / MW) * e, fy = F[1] / MH + (.5 - F[1] / MH) * e; vb(F[0] - fx * vw, F[1] - fy * vh, vw, vh); });
    tru.setAttribute("opacity", 1); line.setAttribute("x1", GUESS[0]); line.setAttribute("y1", GUESS[1]); line.setAttribute("x2", TRUE[0]); line.setAttribute("y2", TRUE[1]); line.setAttribute("opacity", 1);
    dist.style.left = "50%"; dist.style.top = "30%"; dist.classList.add("on");
    track.classList.add("rev"); score.classList.add("on"); countTo(score, 0, 3840, 900);
    g.say("The Terracotta Army, Xi'an.", "Made around 210 BC. 1,240 km and two centuries off."); g.btn.textContent = "Next";
    await ctl.wait(3600);
  });
}
{
  // Timeline: put them in order.
  const ph = $('[data-game="tl"]'), scr = ph.querySelector(".scr");
  const g = GF(scr, { prompt: "Put them in the order they were first made.", bar: .6, btn: "Check order" });
  const C = [["Gutenberg's press", "Printing press", "Movable type in Mainz", "c. 1440"], ["The telescope", "Telescope", "A spyglass from the Netherlands", "1608"], ["The sextant", "Sextant", "Finding latitude at sea", "1731"], ["The Moon landing", "Apollo 11", "Footprints in the dust", "1969"]];
  const ROW = 100, TOP = 24;
  g.stage.innerHTML = `<div class="tlx__line" style="height:${4 * ROW}px"></div><span class="tlx__lab" style="top:0">Earliest</span><span class="tlx__lab" style="top:${TOP + 4 * ROW + 6}px">Latest</span>`;
  const cards = C.map((c, i) => { const el = h(`<div class="tlx__c">${gameCard(c)}</div>`); g.stage.append(el); return { el, i }; });
  let order = [];
  const lay = () => order.forEach((ci, slot) => (cards[ci].el.style.translate = `0 ${TOP + slot * ROW}px`));
  const carry = async (ci, slot, ctl) => { const from = order.indexOf(ci); if (from === slot) return; cards[ci].el.classList.add("held"); await ctl.wait(240); order.splice(from, 1); order.splice(slot, 0, ci); lay(); await ctl.wait(560); cards[ci].el.classList.remove("held"); await ctl.wait(320); };
  const reset = () => { order = [3, 1, 2, 0]; g.stage.classList.remove("done"); cards.forEach((c) => delete c.el.dataset.v); lay(); g.say(); g.btn.textContent = "Check order"; g.btn.classList.add("off"); };
  reset();
  live(ph, async (ctl) => {
    reset(); await ctl.wait(1100);
    await carry(0, 0, ctl); await carry(2, 1, ctl); await carry(1, 2, ctl);
    g.btn.classList.remove("off"); await ctl.wait(400); await g.tap(g.btn, ctl);
    order.forEach((ci, slot) => (cards[ci].el.dataset.v = ci === slot ? "right" : "wrong"));
    g.lives[2].classList.add("gone"); g.say("Two of four.", "Watch where they really go.");
    await ctl.wait(1400); order = [0, 1, 2, 3]; lay(); g.stage.classList.add("done");
    await ctl.wait(700); cards.forEach((c, k) => setTimeout(() => (c.el.dataset.v = "right"), k * 130));
    g.say("The telescope came first.", "Galileo turned one to the sky in 1609, a century before the sextant."); g.btn.textContent = "Continue";
    await ctl.wait(3600);
  });
}
{
  // Higher or lower.
  const ph = $('[data-game="hl"]'), scr = ph.querySelector(".scr");
  const R = [
    { q: "Which is taller?", a: ["The Great Pyramid", "Great Pyramid of Giza", 139, "m"], b: ["The Colosseum", "Colosseum", 48, "m"], pick: 0, fact: "The pyramid stands nearly three Colosseums tall." },
    { q: "Which is longer?", a: ["The Nile", "Nile", 6650, "km"], b: ["The Mekong", "Mekong", 4909, "km"], pick: 0, fact: "The Nile runs from Lake Victoria to the Mediterranean." },
    { q: "Which is bigger?", a: ["Jupiter", "Jupiter", 142984, "km across"], b: ["Saturn", "Saturn", 120536, "km across"], pick: 0, fact: "Jupiter is the largest planet, but Saturn is the lightest for its size." },
  ];
  const g = GF(scr, { prompt: R[0].q, bar: .5, btn: "", streak: true }); g.btn.remove();
  g.stage.style.overflow = "hidden"; g.stage.style.borderRadius = "22px";
  g.stage.innerHTML = `<span class="hlx__vs">vs</span>`;
  const card = ([n, p, v, u]) => { const el = h(`<div class="hlx__c">${img(p, 500, "")}<div class="hlx__w"><div class="hlx__n">${n}</div><div class="hlx__v"></div></div></div>`); g.stage.append(el); return { el, v, u }; };
  const count = (c) => new Promise((done) => { const vEl = c.el.querySelector(".hlx__v"), t0 = performance.now(); const f = (now) => { const t = Math.min(1, (now - t0) / 850), e = 1 - Math.pow(1 - t, 3); vEl.innerHTML = `${fmt(c.v * e)}<small>${c.u}</small>`; t < 1 ? requestAnimationFrame(f) : done(); }; requestAnimationFrame(f); });
  let i = 0, streak = 0;
  const first = [card(R[0].a), card(R[0].b)]; first[0].el.style.top = "0"; first[1].el.style.bottom = "0";
  live(ph, async (ctl) => {
    const r = R[i % R.length]; i++;
    g.stage.querySelectorAll(".hlx__c").forEach((e) => e.remove()); g.prompt.textContent = r.q; g.say();
    const top = card(r.a), bot = card(r.b); top.el.style.top = "0"; bot.el.style.bottom = "0";
    top.el.style.translate = "0 -110%"; bot.el.style.translate = "0 110%"; void top.el.offsetWidth;
    top.el.style.translate = "0 0"; bot.el.style.translate = "0 0";
    await ctl.wait(1700);
    const chosen = [top, bot][r.pick]; chosen.el.classList.add("press"); await ctl.wait(240); chosen.el.classList.remove("press");
    await Promise.all([count(top), count(bot)]); chosen.el.dataset.v = "right";
    streak++; g.streak.textContent = streak; g.streak.classList.remove("kick"); void g.streak.offsetWidth; g.streak.classList.add("kick");
    g.say("Right.", r.fact);
    await ctl.wait(2600);
    top.el.style.translate = "0 -110%"; bot.el.style.translate = "0 110%"; top.el.style.opacity = 0; bot.el.style.opacity = 0;
    await ctl.wait(600); if (streak >= 9) streak = 0;
  });
}
{
  // Sort: each card rises from the deck below and goes to one of two piles; Check says which were right.
  const ph = $('[data-game="sort"]'), scr = ph.querySelector(".scr");
  const g = GF(scr, { prompt: "Built before or after AD 1?", bar: .45 });
  const D = [["Great Pyramid", "Great Pyramid of Giza", "Giza, Egypt", 0, "c. 2560 BC"], ["Colosseum", "Colosseum", "Rome", 1, "AD 80"], ["Stonehenge", "Stonehenge", "Wiltshire, England", 0, "c. 2500 BC"], ["Parthenon", "Parthenon", "Athens", 0, "432 BC"], ["Hagia Sophia", "Hagia Sophia", "Istanbul", 1, "AD 537"]];
  const PICK = [0, 1, 0, 1, 1];
  g.stage.innerHTML = `<div class="srt__bins"><div class="srt__bin"><span>Before AD 1</span></div><div class="srt__bin"><span>After AD 1</span></div></div><div class="srt__deck"><span>Next card</span></div>`;
  const bins = [...g.stage.querySelectorAll(".srt__bin")], deck = g.stage.querySelector(".srt__deck");
  const cards = D.map(([t, p, s, , tag]) => { const el = h(`<div class="srt__c">${img(p, 250, "")}<div><b>${t}</b><small>${s}</small><em>${tag}</em></div></div>`); g.stage.append(el); return el; });
  const at = (el, x, y, instant) => { if (instant) el.style.transition = "none"; el.style.translate = `${x}px ${y}px`; if (instant) { void el.offsetWidth; el.style.transition = ""; } };
  const slot = (b, k) => { const r = g.rel(bins[b]); return [r.x + 8, r.y + 32 + k * 62]; };
  const reset = () => { g.say(); g.btn.textContent = "Check"; g.btn.classList.add("off"); g.lives.forEach((l) => l.classList.remove("gone")); g.setBar(.45);
    const H = g.stage.clientHeight; cards.forEach((c) => { c.className = "srt__c"; delete c.dataset.v; c.style.opacity = 0; at(c, 0, H + 30, true); }); };
  requestAnimationFrame(reset);
  live(ph, async (ctl) => {
    reset(); await ctl.wait(800);
    const pile = [[], []], dk = g.rel(deck);
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]; c.style.opacity = 1; at(c, 0, dk.y); await ctl.wait(1150);
      c.classList.add("held"); await ctl.wait(280);
      const b = PICK[i], [x, y] = slot(b, pile[b].length); pile[b].push(i);
      c.classList.add("mini"); at(c, x, y); await ctl.wait(600); c.classList.remove("held"); await ctl.wait(260);
    }
    g.btn.classList.remove("off"); await ctl.wait(500); await g.tap(g.btn, ctl);
    for (let b = 0; b < 2; b++) for (const i of pile[b]) { cards[i].classList.add("rev"); cards[i].dataset.v = D[i][3] === b ? "right" : "wrong"; await ctl.wait(200); }
    g.lives[2].classList.add("gone"); g.say("Four of five.", "The Parthenon was finished in 432 BC, long before AD 1.");
    await ctl.wait(2000);
    for (let b = 0; b < 2; b++) for (const i of [...pile[b]]) if (D[i][3] !== b) { pile[b].splice(pile[b].indexOf(i), 1); pile[1 - b].push(i); }
    pile.forEach((pl, b) => pl.forEach((i, k) => { const [x, y] = slot(b, k); at(cards[i], x, y); }));
    await ctl.wait(650); cards.forEach((c) => (c.dataset.v = "right")); g.setBar(.7); g.btn.textContent = "Continue";
    await ctl.wait(3000);
  });
}
{
  // Overlap: two rules at once.
  const ph = $('[data-game="overlap"]'), scr = ph.querySelector(".scr");
  const g = GF(scr, { prompt: "Built before AD 500, or in Asia?", bar: .4 });
  g.stage.innerHTML = `<div class="ovx__c ovx__c--a"></div><div class="ovx__c ovx__c--b"></div><span class="ovx__l" style="left:26px">Before AD 500</span><span class="ovx__l" style="right:40px">In Asia</span>`;
  const IT = [["Colosseum", 0, "Colosseum"], ["Great Wall of China", 1, "Great Wall"], ["Taj Mahal", 2, "Taj Mahal"], ["Stonehenge", 0, "Stonehenge"], ["Terracotta Army", 1, "Terracotta"], ["Angkor Wat", 2, "Angkor"]];
  const SPOT = [[[14, 98], [10, 154]], [[124, 122], [120, 178]], [[238, 98], [242, 154]]];
  const chips = IT.map(([p, , n]) => { const el = h(`<span class="ovx__chip">${img(p, 250, "")}${n}</span>`); g.stage.append(el); return el; });
  const reset = () => { g.say(); g.btn.textContent = "Check"; g.btn.classList.add("off"); const H = g.stage.clientHeight; chips.forEach((c, i) => { delete c.dataset.v; c.style.transition = "none"; c.style.translate = `${(i % 3) * 118 + 2}px ${H - 96 + Math.floor(i / 3) * 46}px`; void c.offsetWidth; c.style.transition = ""; }); };
  requestAnimationFrame(reset);
  live(ph, async (ctl) => {
    reset(); await ctl.wait(900);
    const used = [0, 0, 0];
    for (const [i, [, z]] of IT.entries()) { const [x, y] = SPOT[z][used[z]++]; chips[i].style.translate = `${x}px ${y}px`; await ctl.wait(700); }
    g.btn.classList.remove("off"); await ctl.wait(400); await g.tap(g.btn, ctl);
    for (const c of chips) { c.dataset.v = "right"; await ctl.wait(120); }
    g.say("All six.", "The Great Wall and the Terracotta Army sit in both."); g.btn.textContent = "Continue";
    await ctl.wait(3000);
  });
}
{
  // Who? A life, one clue at a time.
  const ph = $('[data-game="who"]'), scr = ph.querySelector(".scr");
  const g = GF(scr, { prompt: "Who am I?", bar: .2, btn: "Guess" });
  g.stage.innerHTML = `<div class="whx__pic">${img("Marie Curie", 500, "")}</div><div class="whx__cl">${["Born in Warsaw in 1867", "Won two Nobel Prizes", "Discovered polonium and radium"].map((c, i) => `<div class="whx__c"><i>CLUE ${i + 1}</i>${c}</div>`).join("")}</div>`;
  const cl = [...g.stage.querySelectorAll(".whx__c")], pic = g.stage.querySelector(".whx__pic");
  const reset = () => { g.say(); g.btn.textContent = "Guess"; cl.forEach((c, i) => c.classList.toggle("on", i === 0)); pic.classList.remove("on"); pic.style.setProperty("--b", "18px"); g.setBar(.2); };
  reset();
  live(ph, async (ctl) => {
    reset(); await ctl.wait(1300);
    for (let i = 1; i < 3; i++) { cl[i].classList.add("on"); pic.style.setProperty("--b", `${18 - i * 6}px`); g.setBar(.2 + i * .3); await ctl.wait(1300); }
    await g.tap(g.btn, ctl); pic.classList.add("on"); g.setBar(1);
    g.say("Marie Curie.", "Solved in three clues · +30"); g.btn.textContent = "Continue";
    await ctl.wait(3000);
  });
}
{
  // The row drifts past at one steady pace and never stops; phones leave left and rejoin right.
  const track = $("[data-gshelf]"); let pos = 0, last = 0;
  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 32;
  let frame = (now) => { const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now; pos += 34 * dt;
    const f = track.firstElementChild, w = f.offsetWidth + gap(); if (pos > w) { track.appendChild(f); pos -= w; }
    track.style.transform = `translate3d(${-pos}px,0,0)`; requestAnimationFrame((t) => frame(t)); };
  let seen = false; new IntersectionObserver(([e]) => { const was = seen; seen = e.isIntersecting; if (seen && !was) { last = 0; requestAnimationFrame(frame); } }, { threshold: 0 }).observe(track.parentElement);
  const frame0 = frame; frame = (now) => { if (!seen) { last = 0; return; } frame0(now); };
}

/* ═══ Lessons: an idea on a picture, then a check ════════════════════════ */
const RULER = (max, step) => Array.from({ length: max / step + 1 }, (_, i) => { const v = i * step, y = 100 - (v / max) * 100; return `<i style="top:${y}%"></i>${i % 2 ? "" : `<span style="top:${y}%">${v / 1000}k</span>`}`; }).join("");
const LESSONS = [
  { idea: { pic: "Mount Everest", h: "The roof of the world", sub: "Measured from sea level", p: "Everest's summit is 8,849 m up. Jets cruise only about 2 km higher.",
      v: `<div class="ruler">${RULER(11000, 1000)}<div class="ruler__m" data-m></div></div><div class="read" style="left:22px;bottom:22px"><span data-count="8849">0</span> m<small>Summit height</small></div><div class="tag" style="left:40%;top:30%;--d:.4s">Jets cruise · <b>10,700 m</b></div>`,
      play: (v) => { const m = v.querySelector("[data-m]"), H = v.querySelector(".ruler").clientHeight; m.style.transition = "none"; m.style.setProperty("--y", `${H}px`); void m.offsetWidth; m.style.transition = ""; setTimeout(() => m.style.setProperty("--y", `${H * (1 - 8849 / 11000)}px`), 60); countTo(v.querySelector("[data-count]"), 0, 8849, 2200); } },
    ex: () => `<p class="ex__q">How much higher do jets fly than Everest's summit?</p><div class="est" data-est><div class="est__track" style="--a:${1.85 / 5}"><i class="est__fill"></i><i class="est__ans"><span>Answer · 1.9 km</span></i><i class="est__knob"><span class="est__bub">0.8 km</span></i></div><div class="est__val"><span>0 km</span><span>5 km</span></div></div>`,
    say: ["Close: within 5%.", "Jets cruise at about 10,700 m, some 1.9 km above the summit."],
    run: async (ex, ctl) => { const e = ex.querySelector("[data-est]"), t = e.querySelector(".est__track"), k = e.querySelector(".est__knob"), b = e.querySelector(".est__bub");
      const setV = (v) => { t.style.setProperty("--v", v); b.textContent = (v * 5).toFixed(1) + " km"; };
      e.classList.remove("done"); setV(.16); await ctl.wait(700);
      k.classList.add("held"); await ctl.wait(200); await tween(1400, (q) => setV(.16 + (.4 - .16) * q)); k.classList.remove("held"); await ctl.wait(250); e.classList.add("done"); } },
  { idea: { pic: "Octopus", h: "Built differently", sub: "Three hearts, blue blood", p: "Two hearts serve the gills, one the body. The blood is blue with copper, not iron.",
      v: `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="draw" pathLength="1" d="M48 50 L27 34" stroke="#fff" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke" style="--d:.2s"/><path class="draw" pathLength="1" d="M58 60 L78 44" stroke="#fff" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke" style="--d:.7s"/><path class="draw" pathLength="1" d="M50 76 L70 88" stroke="#fff" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke" style="--d:1.2s"/></svg>
        <i class="dotp" style="left:48%;top:50%;--d:.1s"></i><i class="dotp" style="left:58%;top:60%;--d:.6s"></i><i class="dotp" style="left:50%;top:76%;--d:1.1s"></i>
        <div class="tag" style="left:26%;top:30%;--d:.7s"><b>3</b> hearts</div><div class="tag" style="left:76%;top:40%;--d:1.2s">Blue blood</div><div class="tag" style="left:70%;top:91%;--d:1.7s">Arms that taste</div>` },
    ex: () => `<p class="ex__q">Order from largest to smallest.</p><div style="position:relative;height:216px" data-ord>${[["Whale", "Blue whale", 3], ["Octopus", "Giant octopus", 2], ["Honey bee", "Honey bee", 1]].map(([p, n]) => `<div class="ord__i">${img(p, 250, "")}${n}</div>`).join("")}</div>`,
    say: ["In order.", "A blue whale can weigh as much as ten thousand giant octopuses."],
    run: async (ex, ctl) => { const it = [...ex.querySelectorAll(".ord__i")], put = (o) => o.forEach((ci, pos) => (it[ci].style.translate = `0 ${pos * 72}px`)); let o = [1, 2, 0]; it.forEach((e) => e.classList.remove("ok")); it.forEach((e) => (e.style.transition = "none")); put(o); void ex.offsetWidth; it.forEach((e) => (e.style.transition = ""));
      await ctl.wait(700); it[0].classList.add("lift"); await ctl.wait(350); o = [0, 1, 2]; put(o); await ctl.wait(700); it[0].classList.remove("lift"); for (const e of it) { e.classList.add("ok"); await ctl.wait(150); } } },
  { idea: { pic: "Great Wave off Kanagawa", h: "A mountain in the wave", sub: "Hokusai, around 1831", p: "Look past the claw of the wave and Mount Fuji sits small and still in the distance.",
      v: `<i class="lens" data-lens></i><div class="tag" data-fuji style="--d:2.4s">Mount <b>Fuji</b></div>`,
      // The lens is placed by where things are in the painting itself (Fuji's peak sits 63.6% across, 69% down), whatever the crop.
      play: (v) => { const L = v.querySelector("[data-lens]"), tg = v.querySelector("[data-fuji]"), u = pic("Great Wave off Kanagawa", 500), W = v.clientWidth, H = v.clientHeight, im = v.parentElement.querySelector("img");
        const set = (ix, iy) => { const iw = im.naturalWidth || 500, ih = im.naturalHeight || 336, Z = 2.6, sc = Math.max(W / iw, H / ih), ox = (W - iw * sc) / 2, oy = (H - ih * sc) / 2, x = ox + ix * iw * sc, y = oy + iy * ih * sc;
          L.style.left = x + "px"; L.style.top = y + "px"; L.style.backgroundImage = `url("${u}")`; L.style.backgroundSize = `${iw * sc * Z}px ${ih * sc * Z}px`; L.style.backgroundPosition = `${-((x - ox) * Z) + 60}px ${-((y - oy) * Z) + 60}px`; return [x, y]; };
        L.style.transition = "none"; set(.36, .3); void L.offsetWidth; L.style.transition = ""; setTimeout(() => { const [x, y] = set(.636, .69); tg.style.left = x + "px"; tg.style.top = y - 84 + "px"; }, 300); } },
    ex: () => `<p class="ex__q">Match each artist to their work.</p><div class="mt" data-mt><svg></svg>${[["Hokusai", "Great Wave off Kanagawa", "The Great Wave"], ["Johannes Vermeer", "Girl with a Pearl Earring", "Pearl Earring"], ["Leonardo da Vinci", "Mona Lisa", "Mona Lisa"]].map(([a, w, n], i) => `<div class="mt__i" data-l="${i}">${img(a, 250, "")}${a.split(" ").pop()}</div><div class="mt__i" data-r="${(i + 1) % 3}">${img(w, 250, "")}${n}</div>`).join("")}</div>`,
    say: ["Three for three.", "Hokusai's wave came about 165 years after Vermeer's pearl earring."],
    run: async (ex, ctl) => { const mt = ex.querySelector("[data-mt]"), svg = mt.querySelector("svg"); svg.innerHTML = ""; mt.querySelectorAll(".mt__i").forEach((e) => e.classList.remove("ok"));
      const L = [...mt.querySelectorAll("[data-l]")], Rr = [...mt.querySelectorAll("[data-r]")];
      const rightOf = { 0: Rr.find((e) => e.textContent.includes("Wave")), 1: Rr.find((e) => e.textContent.includes("Pearl")), 2: Rr.find((e) => e.textContent.includes("Mona")) };
      await ctl.wait(600);
      for (const [i, l] of L.entries()) { const r = rightOf[i], m = mt.getBoundingClientRect(), a = l.getBoundingClientRect(), b = r.getBoundingClientRect(), k = (mt.closest(".scr")._k || 1);
        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line"); ln.setAttribute("pathLength", 1);
        ln.setAttribute("x1", (a.right - m.left) / k); ln.setAttribute("y1", (a.top + a.height / 2 - m.top) / k); ln.setAttribute("x2", (b.left - m.left) / k); ln.setAttribute("y2", (b.top + b.height / 2 - m.top) / k);
        svg.append(ln); await ctl.wait(30); ln.classList.add("on"); await ctl.wait(450); l.classList.add("ok"); r.classList.add("ok"); await ctl.wait(250); } } },
];
$$("[data-lesson]").forEach((ph) => {
  const L = LESSONS[+ph.dataset.lesson], scr = ph.querySelector(".scr");
  const ideaS = h(`<div class="lsn"><div class="lsn__pic">${img(L.idea.pic, 500, "")}${SB(1)}${GBAR(.35)}<div class="lsn__v">${L.idea.v}</div></div><div class="lsn__b"><h4>${L.idea.h}</h4><h5>${L.idea.sub}</h5><p>${L.idea.p}</p></div><div class="gbtn">Continue</div></div>`);
  const exHtml = L.ex(), qm = exHtml.match(/<p class="ex__q">(.*?)<\/p>/);
  const exS = h(`<div class="lsn off"></div>`);
  const gg = GF(exS, { prompt: qm ? qm[1] : "Quick check", bar: .65, btn: "Check" }); gg.stage.classList.add("exs"); gg.stage.innerHTML = `<div class="exs__pic">${img(L.idea.pic, 500, "")}<span class="cap">${L.idea.h}</span></div><div class="exs__b">${qm ? exHtml.replace(qm[0], "") : exHtml}</div>`;
  scr.append(ideaS, exS);
  const v = ideaS.querySelector(".lsn__v");
  const showIdea = () => { exS.classList.add("off"); exS.classList.remove("on"); ideaS.classList.remove("off", "gone"); ideaS.classList.add("on"); v.classList.remove("on"); void v.offsetWidth; v.classList.add("on"); L.idea.play?.(v); };
  live(ph, async (ctl) => {
    showIdea(); await ctl.wait(4200);
    ideaS.classList.add("gone"); ideaS.classList.remove("on"); exS.classList.remove("off"); exS.classList.add("on");
    gg.say(); gg.btn.textContent = "Check"; gg.btn.classList.add("off");
    await ctl.wait(500); await L.run(exS, ctl); gg.btn.classList.remove("off"); await ctl.wait(300); await gg.tap(gg.btn, ctl); gg.say(L.say[0], L.say[1]); gg.btn.textContent = "Continue"; await ctl.wait(2800);
  }, () => { ideaS.classList.add("on"); v.classList.add("on"); v.querySelectorAll("[data-count]").forEach((n) => (n.textContent = fmt(+n.dataset.count))); });
});


})();
