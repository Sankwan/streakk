// STREAK — Accra low-rise buildings in daylight.
//
// One facade atlas (drawn once on two canvases: colour + a tint/glass mask) and one MeshStandardMaterial
// whose shader picks a tile per facade cell. Walls take the building's paint colour (cream, ochre,
// terracotta, pale blue …) through the vertex colour; shop fronts, sign boards, windows and shutters keep
// their own printed colours. No emissive anything: it is a sunny afternoon.
//
// Geometry: buildBlock() emits a painted 2–6 storey concrete block (ground-floor shops with a concrete
// canopy, upper bays with windows / louvres / balconies, blank party walls, a parapet, a flat roof) into a
// BlockAcc; the city merges those per spatial chunk. Rooftop polytanks are returned as instance lists.
import * as THREE from 'three';
import { makeCanvas, mulberry32 } from './textures.js';

const A = 1024; // atlas size (px)
const T = 128; // tile size (px)
// Atlas rows (canvas y, top-down)
const ROW = { res: 0, office: 128, shopA: 256, shopB: 384, blank: 512, roof: 640 };
export const BAY_W = 3.4; // m per upper-floor bay
export const FLOOR_H = 3.2; // m per upper floor
export const SHOP_W = 6.8; // m per shop
export const SHOP_H = 4.2; // ground floor height

// mask encoding (alpha): 255 = painted wall (tinted by the building colour), 128 = glass (glossy), 0 = printed
const M_WALL = 255, M_GLASS = 128, M_PRINT = 0;

const SHOPS = [
  { name: 'AUNTIE AMA PROVISIONS', bg: '#b99a4d', fg: '#7a1010', kind: 'open' },
  { name: 'GOD IS GOOD ELECTRICALS', bg: '#85483e', fg: '#ffffff', kind: 'glass' },
  { name: 'BLESSED HANDS SALON', bg: '#655264', fg: '#ffe680', kind: 'open' },
  { name: 'STAR PHONES', bg: '#3c6177', fg: '#ffffff', kind: 'glass' },
  { name: 'OSU CHOP BAR', bg: '#42634e', fg: '#ffe14a', kind: 'open' },
  { name: 'NYAME DUA PHARMACY', bg: '#f4f4ee', fg: '#0d7a3a', kind: 'glass' },
  { name: 'KOFI & SONS HARDWARE', bg: '#ad7446', fg: '#1b1b1b', kind: 'shutter' },
  { name: 'SIKA MOBILE MONEY', bg: '#c3a84f', fg: '#1a3f8f', kind: 'shutter' },
];

// Accra paint colours (sRGB) for the walls
export const WALL_COLORS = [
 [0.76,0.72,0.63],[0.82,0.79,0.71],[0.72,0.61,0.43],
 [0.62,0.44,0.34],[0.57,0.65,0.67],[0.76,0.7,0.53],
 [0.6,0.66,0.55],[0.71,0.6,0.55],[0.68,0.65,0.58],
];

function drawAtlas() {
  const cc = makeCanvas(A, A), mc = makeCanvas(A, A);
  const c = cc.getContext('2d'), m = mc.getContext('2d');
  const rnd = mulberry32(5150);
  const mval = (v) => `rgb(${v},${v},${v})`;
  const rect = (x, y, w, h, col, mask) => {
    c.fillStyle = col; c.fillRect(x, y, w, h);
    m.fillStyle = mval(mask); m.fillRect(x, y, w, h);
  };
  // plaster: light, slightly mottled, rain-streaked from sills (tinted later)
  const plaster = (x, y, w, h) => {
    rect(x, y, w, h, '#ececea', M_WALL);
    for (let i = 0; i < (w * h) / 60; i++) {
      const v = 216 + Math.floor(rnd() * 34);
      c.fillStyle = `rgb(${v},${v},${v - 4})`;
      c.fillRect(x + rnd() * w, y + rnd() * h, 2 + rnd() * 4, 2 + rnd() * 4);
    }
  };
  const grime = (x, y, w, h, a = 0.18) => {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(70,60,50,${a})`);
    g.addColorStop(1, 'rgba(70,60,50,0)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
  };
  // a window opening with frame, glass, sill and rain streak
  const windowAt = (x, y, w, h, { glass = '#3c4c5a', frame = '#f2f2ee', bars = false, louvre = null } = {}) => {
    rect(x - 3, y - 3, w + 6, h + 6, frame, M_PRINT);
    if (louvre) {
      rect(x, y, w, h, louvre, M_PRINT);
      c.fillStyle = 'rgba(0,0,0,0.28)';
      for (let k = y + 3; k < y + h; k += 5) c.fillRect(x, k, w, 1.5);
      c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x + w / 2 - 1, y, 2, h);
    } else {
      rect(x, y, w, h, glass, M_GLASS);
      // sky reflection gradient on the glass
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(160,190,215,0.45)'); g.addColorStop(0.6, 'rgba(160,190,215,0.05)');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.fillStyle = frame; c.fillRect(x + w / 2 - 1.5, y, 3, h); c.fillRect(x, y + h * 0.35, w, 3);
      m.fillStyle = mval(M_PRINT); m.fillRect(x + w / 2 - 1.5, y, 3, h); m.fillRect(x, y + h * 0.35, w, 3);
    }
    if (bars) {
      c.fillStyle = '#2a2a2a';
      for (let k = x + 5; k < x + w; k += 7) c.fillRect(k, y, 1.6, h);
      c.fillRect(x, y + h * 0.7, w, 1.6);
    }
    rect(x - 5, y + h + 2, w + 10, 4, '#d9d6cf', M_WALL); // sill
    grime(x, y + h + 6, w, 22, 0.16);
  };
  // ---- row: residential upper bays (8 variants)
  for (let k = 0; k < 8; k++) {
    const x = k * T, y = ROW.res;
    plaster(x, y, T, T);
    rect(x, y + T - 6, T, 6, '#d8d4cc', M_WALL); // floor slab line
    const louvreCols = ['#3f7a4a', '#7a5a34', '#3b6a8f', '#a33a2a'];
    if (k === 0) windowAt(x + 28, y + 26, 72, 62);
    else if (k === 1) windowAt(x + 28, y + 26, 72, 62, { louvre: louvreCols[0] });
    else if (k === 2) windowAt(x + 28, y + 26, 72, 62, { bars: true });
    else if (k === 3) {
      // balcony: door + railing slab
      windowAt(x + 34, y + 14, 60, 86, { glass: '#2f3a44' });
      rect(x + 10, y + 92, T - 20, 8, '#e6e2da', M_WALL);
      c.fillStyle = '#2b2b2b';
      for (let q = x + 12; q < x + T - 12; q += 6) c.fillRect(q, y + 70, 2, 22);
      c.fillRect(x + 10, y + 68, T - 20, 3);
      grime(x + 10, y + 100, T - 20, 20, 0.2);
    } else if (k === 4) {
      windowAt(x + 18, y + 26, 60, 62);
      rect(x + 86, y + 46, 30, 22, '#e8e8e6', M_PRINT); // AC unit
      c.fillStyle = '#9a9a98'; for (let q = 0; q < 5; q++) c.fillRect(x + 89, y + 49 + q * 4, 24, 1.5);
      grime(x + 90, y + 68, 22, 30, 0.22);
    } else if (k === 5) windowAt(x + 28, y + 26, 72, 62, { louvre: louvreCols[2] });
    else if (k === 6) {
      // breeze-block vent wall (decorative concrete blocks) + small window
      windowAt(x + 14, y + 30, 44, 56, { bars: true });
      for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) {
        const bx = x + 72 + q * 16, by = y + 28 + r * 16;
        rect(bx, by, 14, 14, '#d4d0c8', M_WALL);
        c.fillStyle = '#3a3630'; c.beginPath(); c.arc(bx + 7, by + 7, 4.5, 0, Math.PI * 2); c.fill();
        m.fillStyle = mval(M_PRINT); m.beginPath(); m.arc(bx + 7, by + 7, 4.5, 0, Math.PI * 2); m.fill();
      }
    } else windowAt(x + 28, y + 26, 72, 62, { louvre: louvreCols[3] });
  }
  // ---- row: office / commercial bays (blue glass bands, brise-soleil)
  for (let k = 0; k < 8; k++) {
    const x = k * T, y = ROW.office;
    plaster(x, y, T, T);
    if (k < 3) {
      rect(x, y + 22, T, 66, ['#2d4a66', '#3a5568', '#28404f'][k], M_GLASS);
      const g = c.createLinearGradient(x, y + 22, x, y + 88);
      g.addColorStop(0, 'rgba(170,200,225,0.5)'); g.addColorStop(1, 'rgba(170,200,225,0.08)');
      c.fillStyle = g; c.fillRect(x, y + 22, T, 66);
      for (let q = 0; q < 4; q++) rect(x + q * 32, y + 22, 3, 66, '#c9ccd0', M_PRINT);
      rect(x, y + 88, T, 6, '#c9ccd0', M_PRINT);
    } else if (k < 6) {
      windowAt(x + 14, y + 24, 100, 60, { glass: '#35506a', frame: '#bfc3c7' });
      // vertical sun fins
      for (let q = 0; q < 3; q++) rect(x + 8 + q * 52, y + 10, 8, 100, '#f0eee8', M_WALL);
    } else {
      windowAt(x + 22, y + 28, 84, 56, { glass: '#3a4a58' });
      rect(x, y + 14, T, 8, '#f0eee8', M_WALL); // shade ledge
      grime(x, y + 22, T, 10, 0.3);
    }
  }
  // ---- rows: shops (2 rows × 4 shops, each 2 tiles wide)
  SHOPS.forEach((sh, i) => {
    const x = (i % 4) * 2 * T, y = i < 4 ? ROW.shopA : ROW.shopB, W = 2 * T;
    plaster(x, y, W, T);
    // sign board across the top
    rect(x + 6, y + 6, W - 12, 32, sh.bg, M_PRINT);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.strokeRect(x + 7, y + 7, W - 14, 30);
    c.fillStyle = sh.fg;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 20;
    c.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    while (c.measureText(sh.name).width > W - 26 && size > 9) { size--; c.font = `900 ${size}px "Arial Black", Arial, sans-serif`; }
    c.fillText(sh.name, x + W / 2, y + 23);
    // the opening between two painted pillars
    const ox = x + 14, oy = y + 44, ow = W - 28, oh = T - 50;
    if (sh.kind === 'shutter') {
      rect(ox, oy, ow, oh, '#8d949a', M_PRINT);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      for (let q = oy + 2; q < oy + oh; q += 4) c.fillRect(ox, q, ow, 1.4);
      rect(ox + ow * 0.62, oy, ow * 0.38, oh, '#2a2420', M_PRINT); // half open
      for (let q = 0; q < 10; q++) { c.fillStyle = ['#d23', '#fc2', '#3a7', '#26c', '#eee'][q % 5]; c.fillRect(ox + ow * 0.64 + (q % 5) * 12, oy + 14 + Math.floor(q / 5) * 22, 9, 12); }
    } else if (sh.kind === 'glass') {
      rect(ox, oy, ow, oh, '#2c3842', M_GLASS);
      const g = c.createLinearGradient(ox, oy, ox + ow, oy + oh);
      g.addColorStop(0, 'rgba(180,205,225,0.5)'); g.addColorStop(0.7, 'rgba(180,205,225,0.05)');
      c.fillStyle = g; c.fillRect(ox, oy, ow, oh);
      for (let q = 0; q < 4; q++) rect(ox + (q * ow) / 3 - 1, oy, 3, oh, '#b8bcc0', M_PRINT);
      // goods / posters behind the glass
      for (let q = 0; q < 6; q++) { c.fillStyle = ['#e33', '#fd3', '#3c6', '#39f', '#fff', '#f80'][q]; c.fillRect(ox + 8 + q * 36, oy + oh - 26, 22, 18); }
    } else {
      rect(ox, oy, ow, oh, '#2e2620', M_PRINT);
      // shelves of colourful goods / chairs, a striped awning flap
      for (let r = 0; r < 3; r++) for (let q = 0; q < 12; q++) {
        if (rnd() < 0.25) continue;
        c.fillStyle = ['#d8342c', '#f5c518', '#2f9e4a', '#2a6fd6', '#f2f2f2', '#e6762a'][Math.floor(rnd() * 6)];
        c.fillRect(ox + 6 + q * 18, oy + 8 + r * 22, 12, 14);
      }
      for (let q = 0; q < 8; q++) rect(ox + (q * ow) / 8, oy, ow / 16, 8, q % 2 ? '#ffffff' : sh.bg, M_PRINT);
    }
    rect(x, y + T - 6, W, 6, '#9a948a', M_PRINT); // step
  });
  // ---- row: blank party walls (plain, downpipe, painted wall ads, breeze blocks, patched)
  const WALL_ADS = [['SIKA TELECOM', '#c3a84f', '#123a8f'], ['FRESH KOKO', '#42634e', '#ffffff'], ['GOLDEN TREE COCOA', '#7a3b12', '#ffd36a']];
  for (let k = 0; k < 8; k++) {
    const x = k * T, y = ROW.blank;
    plaster(x, y, T, T);
    if (k === 1) { rect(x + 60, y, 6, T, '#7d7a74', M_PRINT); grime(x + 54, y + 60, 18, 68, 0.2); }
    else if (k >= 2 && k <= 4) {
      const [t, bg, fg] = WALL_ADS[k - 2];
      rect(x + 4, y + 30, T - 8, 60, bg, M_PRINT);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      let size = 20; c.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
      while (c.measureText(t).width > T - 16 && size > 8) { size--; c.font = `900 ${size}px "Arial Black", Arial, sans-serif`; }
      c.fillText(t, x + T / 2, y + 60);
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x + 4, y + 30, T - 8, 8);
    } else if (k === 5) {
      for (let r = 0; r < 2; r++) for (let q = 0; q < 6; q++) {
        const bx = x + 8 + q * 19, by = y + 40 + r * 19;
        rect(bx, by, 16, 16, '#d4d0c8', M_WALL);
        c.fillStyle = '#3a3630'; c.fillRect(bx + 4, by + 4, 8, 8); m.fillStyle = mval(M_PRINT); m.fillRect(bx + 4, by + 4, 8, 8);
      }
    } else if (k === 6) { grime(x, y, T, T, 0.12); grime(x + 20, y + 40, 40, 80, 0.15); }
    rect(x, y + T - 4, T, 4, '#cfcac0', M_WALL);
  }
  // ---- roof concrete
  rect(0, ROW.roof, T, T, '#b9b4ab', M_WALL);
  for (let i = 0; i < 300; i++) {
    const v = 150 + Math.floor(rnd() * 60);
    c.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
    c.fillRect(rnd() * T, ROW.roof + rnd() * T, 3 + rnd() * 8, 3 + rnd() * 8);
  }
  // compose RGBA (row 0 of the texture = bottom: flip)
  const cd = c.getImageData(0, 0, A, A).data, md = m.getImageData(0, 0, A, A).data;
  const out = new Uint8Array(A * A * 4);
  for (let yy = 0; yy < A; yy++) {
    const src = yy * A * 4, dst = (A - 1 - yy) * A * 4;
    for (let xx = 0; xx < A * 4; xx += 4) {
      out[dst + xx] = cd[src + xx];
      out[dst + xx + 1] = cd[src + xx + 1];
      out[dst + xx + 2] = cd[src + xx + 2];
      out[dst + xx + 3] = md[src + xx];
    }
  }
  const tex = new THREE.DataTexture(out, A, A);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** aTile for a row: atlas origin (u0, v0) of variant 0 and the size of one variant (du, dv) in UV. */
function rowTile(rowY, tilesWide = 1, tilesHigh = 1) {
  return [0, 1 - (rowY + T * tilesHigh) / A, (T * tilesWide) / A, (T * tilesHigh) / A];
}
export const TILES = {
  res: { tile: rowTile(ROW.res), count: 8 },
  office: { tile: rowTile(ROW.office), count: 8 },
  shopA: { tile: rowTile(ROW.shopA, 2), count: 4 },
  shopB: { tile: rowTile(ROW.shopB, 2), count: 4 },
  blank: { tile: rowTile(ROW.blank), count: 8 },
  plain: { tile: rowTile(ROW.blank), count: 1 }, // variant 0: plain plaster
  roof: { tile: rowTile(ROW.roof), count: 1 },
};

export function createAccraBuildingMaterial() {
  const atlas = drawAtlas();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  mat.name = 'accraBuildings';
  mat.userData.ownedTextures = [atlas];
  mat.customProgramCacheKey = () => 'streak-accra-buildings-v1';
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uAtlas = { value: atlas };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aTile;
attribute vec3 aVar; // variant count, seed, column mode (0 = per column, 1 = per cell)
attribute vec2 aCell;
varying vec4 vTile;
varying vec3 vVar;
varying vec2 vCell;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
vTile = aTile; vVar = aVar; vCell = aCell;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uAtlas;
varying vec4 vTile;
varying vec3 vVar;
varying vec2 vCell;
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float glassM = 0.0;`)
      .replace('#include <color_fragment>', `
{
  vec2 cell = floor(vCell);
  vec2 f = fract(vCell);
  vec2 key = vVar.z > 0.5 ? cell : vec2(cell.x, 0.0);
  float k = min(floor(bHash(key + vVar.y * 0.137) * vVar.x), vVar.x - 1.0);
  // keep a 1.5 px gutter inside the tile so mips never bleed in the neighbour
  vec2 g = vec2(1.5 / ${A}.0) / max(vTile.zw, vec2(1e-4));
  f = clamp(f, g, 1.0 - g);
  vec2 auv = vTile.xy + vec2((k + f.x) * vTile.z, f.y * vTile.w);
  vec4 tx = textureGrad(uAtlas, auv, dFdx(vCell) * vTile.zw, dFdy(vCell) * vTile.zw);
  float tint = step(0.75, tx.a);
  glassM = step(0.25, tx.a) * (1.0 - tint);
  vec3 c = mix(tx.rgb, tx.rgb * vColor.rgb, tint);
  diffuseColor.rgb = c;
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.12, glassM);`);
  };
  return { material: mat, atlas };
}

// ---------------------------------------------------------------------------------------------
// Geometry accumulator
// ---------------------------------------------------------------------------------------------

export class BlockAcc {
  constructor() { this.p = []; this.n = []; this.c = []; this.cell = []; this.tile = []; this.var = []; this.i = []; this.v = 0; }
  /** quad a,b,c,d (CCW seen from n), cells at a,b,c,d */
  quad(a, b, c, d, n, cells, color, t, seed, perCell = 0) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    let P = [a, b, c, d], C = cells;
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { P = [d, c, b, a]; C = [cells[3], cells[2], cells[1], cells[0]]; }
    for (let k = 0; k < 4; k++) {
      this.p.push(...P[k]); this.n.push(...n); this.c.push(...color); this.cell.push(...C[k]);
      this.tile.push(...t.tile); this.var.push(t.count, seed, perCell);
    }
    const v = this.v;
    this.i.push(v, v + 1, v + 2, v, v + 2, v + 3);
    this.v += 4;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aCell', new THREE.Float32BufferAttribute(this.cell, 2));
    g.setAttribute('aTile', new THREE.Float32BufferAttribute(this.tile, 4));
    g.setAttribute('aVar', new THREE.Float32BufferAttribute(this.var, 3));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

const _col = new THREE.Color();
export function linearColor(srgb, k = 1) {
  _col.setRGB(srgb[0] * k, srgb[1] * k, srgb[2] * k, THREE.SRGBColorSpace);
  return [_col.r, _col.g, _col.b];
}

/**
 * Oriented box faces. Frame: centre (cx, cz), unit axis A = (ax, az), B = (−az, ax).
 * faceTile(sideIndex, width) → { t, cellsU, y0, y1, v0, v1 } bands; sides: 0 +A, 1 −A, 2 +B, 3 −B.
 */
export function emitFaces(acc, cx, cz, ax, az, hw, hd, bands, color, seed, roof) {
  const bx = -az, bz = ax;
  const corner = (sa, sb, y) => [cx + ax * hw * sa + bx * hd * sb, y, cz + az * hw * sa + bz * hd * sb];
  const sides = [
    { n: [ax, 0, az], l: [1, 1], r: [1, -1], w: hd * 2 },
    { n: [-ax, 0, -az], l: [-1, -1], r: [-1, 1], w: hd * 2 },
    { n: [bx, 0, bz], l: [-1, 1], r: [1, 1], w: hw * 2 },
    { n: [-bx, 0, -bz], l: [1, -1], r: [-1, -1], w: hw * 2 },
  ];
  sides.forEach((s, si) => {
    for (const b of bands(si, s.w)) {
      if (!b) continue;
      const L = (y) => corner(s.l[0], s.l[1], y), R = (y) => corner(s.r[0], s.r[1], y);
      const u1 = b.cellsU;
      acc.quad(L(b.y0), R(b.y0), R(b.y1), L(b.y1), s.n, [[0, b.v0], [u1, b.v0], [u1, b.v1], [0, b.v1]], b.color || color, b.t, seed + si * 13 + (b.seedOff || 0), b.perCell || 0);
    }
  });
  if (roof) {
    const y = roof.y;
    const a = corner(-1, -1, y), b = corner(-1, 1, y), c = corner(1, 1, y), d = corner(1, -1, y);
    const ru = (p) => [p[0] / 8, p[2] / 8];
    acc.quad(a, b, c, d, [0, 1, 0], [ru(a), ru(b), ru(c), ru(d)], roof.color, TILES.roof, seed);
  }
}

/**
 * A painted Accra block. b: { cx, cz, ax, az, hw, hd, floors, store, streetSide (2|3|-1), seed, wall (sRGB), office }
 * The street-facing side (−B for frontage) gets shops; the ±A sides are party walls.
 */
export function buildBlock(acc, b, rnd, tanks) {
  const wall = linearColor(b.wall);
  const roofCol = linearColor([0.78, 0.76, 0.72]);
  const H = SHOP_H + b.floors * FLOOR_H;
  const upper = b.office ? TILES.office : TILES.res;
  const shopRow = rnd() < 0.5 ? TILES.shopA : TILES.shopB;
  const party = (si) => b.front && si < 2; // ±A sides of frontage blocks touch the neighbours
  emitFaces(acc, b.cx, b.cz, b.ax, b.az, b.hw, b.hd, (si, w) => {
    const bays = Math.max(1, Math.round(w / BAY_W));
    const out = [];
    const shopSide = b.store && (b.streetSide < 0 ? si >= 2 : si === b.streetSide);
    if (party(si)) {
      out.push({ t: TILES.blank, cellsU: Math.max(1, Math.round(w / 5)), y0: 0, y1: H, v0: 0, v1: H / 5, perCell: 1, seedOff: 3 });
      return out;
    }
    if (shopSide) out.push({ t: shopRow, cellsU: Math.max(1, Math.round(w / SHOP_W)), y0: 0, y1: SHOP_H, v0: 0, v1: 1, perCell: 1 });
    else out.push({ t: TILES.res, cellsU: bays, y0: 0, y1: SHOP_H, v0: 0, v1: 1, seedOff: 7 });
    if (b.floors > 0) out.push({ t: upper, cellsU: bays, y0: SHOP_H, y1: H, v0: 0, v1: b.floors });
    return out;
  }, wall, b.seed, null);
  // parapet (slightly proud) + flat roof
  emitFaces(acc, b.cx, b.cz, b.ax, b.az, b.hw + 0.12, b.hd + 0.12, (si, w) => [{ t: TILES.plain, cellsU: w / 4, y0: H, y1: H + 0.9, v0: 0, v1: 0.22 }], linearColor(b.wall, 0.96), b.seed, { y: H + 0.9, color: roofCol });
  // concrete canopy over the shops (casts a strong afternoon shadow on the shop fronts)
  if (b.store) {
    const sides = b.streetSide < 0 ? [2, 3] : [b.streetSide];
    for (const si of sides) {
      const sgn = si === 2 ? 1 : -1;
      const bx = -b.az, bz = b.ax;
      const ccx = b.cx + bx * sgn * (b.hd + 0.7), ccz = b.cz + bz * sgn * (b.hd + 0.7);
      emitFaces(acc, ccx, ccz, b.ax, b.az, b.hw, 0.7, (s, w) => [{ t: TILES.plain, cellsU: w / 4, y0: SHOP_H - 0.05, y1: SHOP_H + 0.3, v0: 0, v1: 0.1 }], linearColor(b.wall, 0.9), b.seed, { y: SHOP_H + 0.3, color: roofCol });
    }
  }
  // rooftop: stair house + polytanks (black / blue / sand) on a little stand
  const bx = -b.az, bz = b.ax;
  if (rnd() < 0.45 && b.hw > 4 && b.hd > 4) {
    const ox = (rnd() - 0.5) * (b.hw - 3), oz = (rnd() - 0.5) * (b.hd - 3);
    emitFaces(acc, b.cx + b.ax * ox + bx * oz, b.cz + b.az * ox + bz * oz, b.ax, b.az, 1.6, 2.2, (si, w) => [{ t: TILES.plain, cellsU: w / 4, y0: H, y1: H + 2.6, v0: 0, v1: 0.6 }], wall, b.seed + 1, { y: H + 2.6, color: roofCol });
  }
  const nT = rnd() < 0.8 ? 1 + Math.floor(rnd() * 2.6) : 0;
  for (let i = 0; i < nT; i++) {
    const ox = (rnd() - 0.5) * Math.max(0, b.hw * 2 - 3), oz = (rnd() - 0.5) * Math.max(0, b.hd * 2 - 3);
    const r = rnd();
    tanks.push({ x: b.cx + b.ax * ox + bx * oz, y: H + 0.9, z: b.cz + b.az * ox + bz * oz, s: 0.8 + rnd() * 0.5, color: r < 0.55 ? 0x1b1b1d : r < 0.85 ? 0x2a5fb0 : 0xcfc2a0 });
  }
  return H;
}

/** Instanced rooftop polytanks (ribbed cylinders with a dome lid) on steel stands. */
export function buildTanks(list) {
  const group = new THREE.Group();
  group.userData.tag = 'building';
  if (!list.length) return group;
  const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 14, 1).translate(0, 1.55, 0);
  const lid = new THREE.SphereGeometry(0.7, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1).translate(0, 2.3, 0);
  const tankMesh = new THREE.InstancedMesh(mergeTwo(tankGeo, lid), new THREE.MeshStandardMaterial({ roughness: 0.55 }), list.length);
  tankMesh.userData.tag = 'building';
  const standGeo = new THREE.BoxGeometry(1.5, 0.8, 1.5).translate(0, 0.4, 0);
  const stand = new THREE.InstancedMesh(standGeo, new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.9 }), list.length);
  stand.userData.tag = 'building';
  const m = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach((t, i) => {
    m.makeScale(t.s, t.s, t.s).setPosition(t.x, t.y, t.z);
    tankMesh.setMatrixAt(i, m);
    stand.setMatrixAt(i, m);
    tankMesh.setColorAt(i, col.set(t.color));
  });
  tankMesh.castShadow = stand.castShadow = true;
  tankMesh.name = 'polytanks';
  group.add(tankMesh, stand);
  return group;
}

function mergeTwo(a, b) {
  const ga = a.toNonIndexed(), gb = b.toNonIndexed();
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const A1 = ga.getAttribute(name).array, B1 = gb.getAttribute(name).array;
    const arr = new Float32Array(A1.length + B1.length);
    arr.set(A1); arr.set(B1, A1.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return g;
}
