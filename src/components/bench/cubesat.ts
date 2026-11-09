/**
 * Fig 03: "Scattered data → built product" (three.js).
 *
 * One scroll position (0…1) drives seven visual states, one per OpenPlan story step:
 *   1 Scattered   data tiles (part numbers, revisions, spreadsheet rows, emails) drift in a messy cloud
 *   2 Connected   accent lines draw in between related tiles; the cloud starts pulling together
 *   3 Structured  the tiles fly into a BOM tree (top assembly → 5 sub-assemblies → parts); stale copies merge
 *   4 Real parts  every part tile turns into the physical CubeSat part it stands for (the tile shrinks to a tag)
 *   5 Change      the battery board goes REV B → REV C; a pulse runs along the tree to every dependent part
 *   6 Assembled   the parts leave the tree and fly into the finished CubeSat, with dashed guide lines
 *   7 Built       the solar wings and tape antennas deploy; "BOM in sync · 0 open changes"
 *
 * Everything is a pure function of the scroll position (u = progress × 7), so scrolling back up
 * reverses it exactly. Only the drift of the scattered cloud and the sway of the finished satellite
 * use the clock. Built entirely from three.js primitives: no model files.
 *
 * Axes: y up, the CubeSat stands on the floor (y = 0) with its long axis vertical, centred on x = z = 0.
 * 1 unit = 10 cm, so the 3U body is 1.0 × 3.4 × 1.0.
 *
 * Craft rules (Anatomy skill, as for the rover before it): real parts with real detail, crisp outlines,
 * parts approach along their mounting axis with dashed guide lines, one accent colour, calm easing,
 * render only when something changes.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

type V3 = [number, number, number];
type Mat = "paint" | "alu" | "dark" | "pcb" | "chip" | "gold" | "lens" | "cellWrap" | "tape" | "cells";

/* ============================================================================================
   THE BOM: edit parts here.
   ============================================================================================
   Tree position: an item sits in its parent sub-assembly's column, in the order it is listed.
   `order` is the assembly sequence in state 6. `deps` are the items a change to this one affects
   (state 5 ripple). Each piece is built at its ASSEMBLED position `at`; it arrives along `off`
   (its mounting axis), like an exploded engineering drawing. Pieces with the same `shape` share
   one geometry. */

export interface Kit {
  /** Add a primitive in piece-local coordinates. `inner` = part of the deployable sub-group. */
  add(geo: THREE.BufferGeometry, mat: Mat, at?: V3, rot?: V3, o?: { edges?: boolean; inner?: boolean }): void;
}
export interface BomPiece {
  at: V3; // assembled position (mount point / hinge) in CubeSat coordinates
  off: V3; // approach offset: the piece flies to at + off, then slides home along it
  rot?: V3; // assembled rotation (Euler XYZ, radians)
  shape?: string; // pieces with the same shape share geometry
  deploy?: "wing+" | "wing-" | "tape"; // moves in state 7
  build: (k: Kit) => void;
}
export interface BomItem {
  id: string;
  name: string; // shown on the tile
  pn: string; // BOM tile label
  rev: string;
  revNext?: string; // the revision it changes to in state 5
  qty: number;
  parent: string; // sub-assembly id
  order: number; // assembly sequence (state 6)
  deps?: string[]; // items affected when this one changes (state 5)
  pieces: BomPiece[];
}
export interface Assembly {
  id: string;
  pn: string;
  name: string;
}
export interface NoiseTile {
  kind: "sheet" | "note" | "dup";
  canon: string; // the BOM item this stale copy merges into in state 3
  title: string;
  sub?: string;
  rev?: string;
  rows?: string[];
}

export const SAT_H = 3.4;
/** Board stack heights (board centre). */
const LEVEL = { battery: 0.35, eps: 0.8, obc: 1.25, adcs: 1.7, radio: 2.15, camboard: 2.6 };

/* ---- geometry helpers ---- */
const box = (w: number, h: number, d: number, sx = 1) => new THREE.BoxGeometry(w, h, d, sx);
const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, r);
function cyl(r: number, len: number, axis: "x" | "y" | "z", seg = 32, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, len, seg);
  if (axis === "x") g.rotateZ(-Math.PI / 2);
  if (axis === "z") g.rotateX(Math.PI / 2);
  return g;
}
function rrect(w: number, h: number, r: number, path: THREE.Path = new THREE.Shape()) {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}
/** A flat square plate (lying in x–z) with a round or square hole. */
function plate(w: number, t: number, hole: { r?: number; sq?: number }) {
  const s = rrect(w, w, 0.04) as THREE.Shape;
  const h = new THREE.Path();
  if (hole.r) h.absarc(0, 0, hole.r, 0, Math.PI * 2, true);
  else if (hole.sq) rrect(hole.sq, hole.sq, 0.05, h);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 18 });
  g.translate(0, 0, -t / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A PC/104-style board: PCB, stack header on the +z edge, gold pads at the standoff holes. */
function board(k: Kit) {
  k.add(rbox(0.82, 0.018, 0.82, 0.008), "pcb");
  k.add(rbox(0.56, 0.07, 0.06, 0.008), "dark", [0, 0.044, 0.36]);
  k.add(box(0.5, 0.004, 0.03), "gold", [0, 0.081, 0.36], undefined, { edges: false });
  for (const x of [-0.33, 0.33]) for (const z of [-0.33, 0.33]) k.add(cyl(0.042, 0.004, "y", 16), "gold", [x, 0.011, z], undefined, { edges: false });
}
/** One pan-head screw, head up (+y). */
const screw = (k: Kit) => {
  k.add(cyl(0.022, 0.016, "y", 14), "alu", [0, 0, 0], undefined, { edges: false });
  k.add(cyl(0.009, 0.004, "y", 6), "dark", [0, 0.009, 0], undefined, { edges: false });
};
const chip = (k: Kit, w: number, d: number, at: [number, number], h = 0.022) => k.add(rbox(w, h, d, 0.004), "chip", [at[0], 0.009 + h / 2, at[1]]);

export const ASSEMBLIES: Assembly[] = [
  { id: "top", pn: "ASM-0001", name: "CubeSat 3U" },
  { id: "structure", pn: "SA-100", name: "Structure" },
  { id: "power", pn: "SA-200", name: "Power" },
  { id: "avionics", pn: "SA-300", name: "Avionics" },
  { id: "payload", pn: "SA-400", name: "Payload" },
  { id: "comms", pn: "SA-500", name: "Comms" },
];

export const BOM: BomItem[] = [
  /* ---- SA-100 Structure ---- */
  {
    id: "rails", name: "Corner rail", pn: "PN-1042", rev: "REV B", qty: 4, parent: "structure", order: 1,
    pieces: [1, -1].flatMap((sx) => [1, -1].map((sz): BomPiece => ({
      at: [sx * 0.4575, SAT_H / 2, sz * 0.4575], off: [sx * 0.75, 0.35, sz * 0.75], shape: "rail",
      build: (k) => {
        k.add(rbox(0.085, SAT_H, 0.085, 0.012), "alu");
        for (const y of [-1, 1]) k.add(cyl(0.034, 0.04, "y", 20), "dark", [0, y * (SAT_H / 2 - 0.018), 0]);
        for (const y of [-1.1, 0, 1.1]) k.add(box(0.087, 0.05, 0.087), "dark", [0, y, 0], undefined, { edges: false });
      },
    }))),
  },
  {
    id: "plateBottom", name: "End plate, bottom", pn: "PN-1043", rev: "REV A", qty: 1, parent: "structure", order: 0,
    pieces: [{ at: [0, 0.0175, 0], off: [0, 1.0, 0], build: (k) => k.add(plate(0.99, 0.035, { sq: 0.62 }), "alu") }],
  },
  {
    id: "plateTop", name: "End plate, top", pn: "PN-1044", rev: "REV A", qty: 1, parent: "structure", order: 11,
    pieces: [{
      at: [0, SAT_H - 0.0175, 0], off: [0, 1.1, 0],
      build: (k) => {
        k.add(plate(0.99, 0.035, { r: 0.205 }), "alu");
        for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) k.add(cyl(0.03, 0.006, "y", 16), "dark", [x, 0.02, z], undefined, { edges: false });
      },
    }],
  },
  {
    id: "screws", name: "M2.5 screw", pn: "PN-1090", rev: "REV A", qty: 16, parent: "structure", order: 15,
    pieces: [
      // 8 into the top frame ring, 4 at the corners of each side solar panel; one shared screw geometry
      ...[1, -1].flatMap((sx) => [1, -1].flatMap((sz) => ([[0.4575, 0.3], [0.3, 0.4575]] as [number, number][]).map(([a, b]): BomPiece => ({
        at: [sx * a, SAT_H + 0.008, sz * b], off: [0, 0.6, 0], shape: "screw", build: screw,
      })))),
      ...[1, -1].flatMap((sz) => [-0.43, 0.43].flatMap((x) => [-1.6, 1.6].map((y): BomPiece => ({
        at: [x, SAT_H / 2 + y, sz * 0.544], off: [0, 0, sz * 0.6], rot: [(sz * Math.PI) / 2, 0, 0], shape: "screw", build: screw,
      })))),
    ],
  },
  /* ---- SA-200 Power ---- */
  {
    id: "battery", name: "Battery pack board", pn: "PN-2104", rev: "REV B", revNext: "REV C", qty: 1, parent: "power", order: 3,
    deps: ["eps", "panels", "wings", "rails"],
    pieces: [{
      at: [0, LEVEL.battery, 0], off: [0, 1.6, 0],
      build: (k) => {
        board(k);
        for (const x of [-0.3, -0.1, 0.1, 0.3]) {
          k.add(cyl(0.088, 0.53, "z", 28), "cellWrap", [x, 0.105, -0.02]);
          for (const z of [-0.27, 0.23]) k.add(cyl(0.062, 0.012, "z", 24), "alu", [x, 0.105, z], undefined, { edges: false });
        }
        for (const z of [-0.2, 0.16]) k.add(rbox(0.8, 0.04, 0.05, 0.01), "dark", [0, 0.2, z]);
        k.add(rbox(0.12, 0.03, 0.06, 0.006), "paint", [0.3, 0.03, 0.36]);
      },
    }],
  },
  {
    id: "eps", name: "Power board (EPS)", pn: "PN-2102", rev: "REV A", qty: 1, parent: "power", order: 4,
    pieces: [{
      at: [0, LEVEL.eps, 0], off: [0, 1.6, 0],
      build: (k) => {
        board(k);
        chip(k, 0.16, 0.16, [-0.16, -0.1]);
        chip(k, 0.1, 0.1, [0.08, -0.16]);
        for (const [x, z] of [[0.2, -0.04], [0.2, 0.12], [0.06, 0.12], [-0.08, 0.12]] as [number, number][]) {
          k.add(cyl(0.045, 0.05, "y", 20), "dark", [x, 0.034, z]);
          k.add(cyl(0.03, 0.004, "y", 16), "alu", [x, 0.061, z], undefined, { edges: false });
        }
        for (let i = 0; i < 5; i++) k.add(cyl(0.018, 0.05, "y", 12), "alu", [-0.3 + i * 0.05, 0.034, 0.16]);
        k.add(rbox(0.1, 0.04, 0.08, 0.006), "gold", [0.3, 0.03, -0.26]);
      },
    }],
  },
  {
    id: "panels", name: "Side solar panel", pn: "PN-2210", rev: "REV A", qty: 2, parent: "power", order: 14,
    pieces: [1, -1].map((sz): BomPiece => ({
      at: [0, SAT_H / 2, sz * 0.52], off: [0, 0, sz * 1.1], rot: [0, sz > 0 ? 0 : Math.PI, 0], shape: "panel",
      build: (k) => {
        k.add(rbox(0.94, 3.3, 0.02, 0.006), "pcb");
        k.add(box(0.88, 3.2, 0.004), "cells", [0, 0, 0.012], undefined, { edges: false });
      },
    })),
  },
  {
    id: "wings", name: "Deployable wing", pn: "PN-2211", rev: "REV A", qty: 2, parent: "power", order: 16,
    pieces: [1, -1].map((sx): BomPiece => ({
      at: [sx * 0.53, SAT_H / 2, 0.53], off: [sx * 1.2, 0, 0], deploy: sx > 0 ? "wing+" : "wing-",
      build: (k) => {
        for (const y of [-1.25, 0, 1.25]) k.add(cyl(0.02, 0.24, "y", 14), "alu", [0, y, 0]);
        k.add(rbox(0.02, 3.3, 0.94, 0.006), "pcb", [sx * 0.012, 0, -0.49], undefined, { inner: true });
        k.add(box(0.004, 3.2, 0.88), "cells", [sx * 0.024, 0, -0.49], undefined, { edges: false, inner: true });
      },
    })),
  },
  /* ---- SA-300 Avionics ---- */
  {
    id: "obc", name: "Flight computer", pn: "PN-3301", rev: "REV A", qty: 1, parent: "avionics", order: 5,
    pieces: [{
      at: [0, LEVEL.obc, 0], off: [0, 1.6, 0],
      build: (k) => {
        board(k);
        chip(k, 0.2, 0.2, [-0.1, -0.08], 0.02);
        k.add(box(0.2, 0.012, 0.2), "alu", [-0.1, 0.035, -0.08]);
        for (let i = 0; i < 7; i++) k.add(box(0.2, 0.07, 0.008), "alu", [-0.1, 0.075, -0.17 + i * 0.03], undefined, { edges: i === 0 || i === 6 });
        chip(k, 0.12, 0.07, [0.2, -0.16]);
        chip(k, 0.12, 0.07, [0.2, -0.04]);
        k.add(rbox(0.05, 0.02, 0.03, 0.005), "alu", [0.2, 0.02, 0.12]);
      },
    }],
  },
  {
    id: "adcs", name: "Attitude control board", pn: "PN-3305", rev: "REV B", qty: 1, parent: "avionics", order: 6,
    pieces: [{
      at: [0, LEVEL.adcs, 0], off: [0, 1.6, 0],
      build: (k) => {
        board(k);
        // three reaction wheels, one per axis
        k.add(cyl(0.08, 0.05, "x", 28), "alu", [-0.2, 0.1, -0.13]);
        k.add(cyl(0.08, 0.05, "z", 28), "alu", [0.0, 0.1, -0.13]);
        k.add(cyl(0.08, 0.05, "y", 28), "alu", [0.19, 0.04, -0.13]);
        for (const at of [[-0.2, 0.1, -0.13], [0.0, 0.1, -0.13], [0.19, 0.04, -0.13]] as V3[]) k.add(rbox(0.12, 0.02, 0.12, 0.004), "dark", [at[0], 0.018, at[2]], undefined, { edges: false });
        // magnetorquer rods
        k.add(cyl(0.024, 0.46, "x", 16), "gold", [-0.02, 0.04, 0.15]);
        k.add(cyl(0.024, 0.34, "z", 16), "gold", [0.28, 0.04, 0.02]);
      },
    }],
  },
  {
    id: "radio", name: "UHF radio board", pn: "PN-3410", rev: "REV A", qty: 1, parent: "avionics", order: 7,
    pieces: [{
      at: [0, LEVEL.radio, 0], off: [0, 1.6, 0],
      build: (k) => {
        board(k);
        k.add(rbox(0.42, 0.06, 0.3, 0.008), "alu", [-0.06, 0.039, -0.1]);
        k.add(cyl(0.026, 0.09, "x", 16), "gold", [0.38, 0.03, -0.22]);
        chip(k, 0.1, 0.1, [0.22, 0.08]);
      },
    }],
  },
  {
    id: "standoffs", name: "Hex standoff", pn: "PN-3090", rev: "REV A", qty: 24, parent: "avionics", order: 2,
    pieces: [{
      at: [0, 1.32, 0], off: [0, 1.6, 0],
      build: (k) => {
        const lv = [0.035, LEVEL.battery, LEVEL.eps, LEVEL.obc, LEVEL.adcs, LEVEL.radio, LEVEL.camboard];
        for (const x of [-0.33, 0.33]) for (const z of [-0.33, 0.33]) for (let i = 0; i < lv.length - 1; i++) {
          const a = lv[i] + (i ? 0.009 : 0);
          const b = lv[i + 1] - 0.009;
          k.add(cyl(0.022, b - a, "y", 6), "alu", [x, (a + b) / 2 - 1.32, z], undefined, { edges: i === 0 });
          k.add(cyl(0.034, 0.022, "y", 6), "dark", [x, lv[i + 1] + 0.02 - 1.32, z], undefined, { edges: false });
        }
      },
    }],
  },
  {
    id: "harness", name: "Ribbon cable", pn: "PN-3120", rev: "REV A", qty: 1, parent: "avionics", order: 9,
    pieces: [{
      at: [-0.12, 1.98, 0.4], off: [0, 0, 1.2],
      build: (k) => {
        const pts = [[1.33, 0.36], [1.37, 0.43], [1.5, 0.458], [2.45, 0.458], [2.58, 0.43], [2.68, 0.36]].map(([y, z]) => new THREE.Vector3(0, y - 1.98, z - 0.4));
        const curve = new THREE.CatmullRomCurve3(pts);
        const N = 26;
        for (let i = 0; i < N; i++) {
          const a = curve.getPoint(i / N);
          const b = curve.getPoint((i + 1) / N);
          const len = a.distanceTo(b);
          const ang = Math.atan2(b.z - a.z, b.y - a.y);
          k.add(box(0.2, len + 0.004, 0.006), "paint", [0, (a.y + b.y) / 2, (a.z + b.z) / 2], [-ang, 0, 0], { edges: false });
        }
        for (const p of [pts[0], pts[pts.length - 1]]) k.add(rbox(0.24, 0.05, 0.05, 0.008), "dark", [0, p.y, p.z]);
      },
    }],
  },
  /* ---- SA-400 Payload ---- */
  {
    id: "camboard", name: "Camera board", pn: "PN-4102", rev: "REV A", qty: 1, parent: "payload", order: 8,
    pieces: [{
      at: [0, LEVEL.camboard, 0], off: [0, 1.6, 0],
      build: (k) => {
        board(k);
        k.add(cyl(0.2, 0.024, "y", 40), "dark", [0, 0.021, 0]);
        chip(k, 0.13, 0.13, [0, 0], 0.03);
        chip(k, 0.08, 0.08, [0.28, -0.24]);
        chip(k, 0.08, 0.05, [-0.28, -0.24]);
      },
    }],
  },
  {
    id: "lens", name: "Lens assembly", pn: "PN-4110", rev: "REV A", qty: 1, parent: "payload", order: 10,
    pieces: [{
      at: [0, 3.06, 0], off: [0, 1.4, 0],
      build: (k) => {
        k.add(cyl(0.21, 0.03, "y", 40), "alu", [0, -0.41, 0]);
        k.add(cyl(0.16, 0.86, "y", 40), "dark");
        for (const y of [-0.28, 0.02, 0.3]) k.add(cyl(0.172, 0.03, "y", 40), "alu", [0, y, 0]);
        k.add(cyl(0.125, 0.012, "y", 40), "lens", [0, 0.432, 0], undefined, { edges: false });
        k.add(new THREE.TorusGeometry(0.14, 0.02, 10, 40), "alu", [0, 0.43, 0], [Math.PI / 2, 0, 0], { edges: false });
      },
    }],
  },
  /* ---- SA-500 Comms ---- */
  {
    id: "deployer", name: "Antenna deployer", pn: "PN-5101", rev: "REV A", qty: 1, parent: "comms", order: 12,
    pieces: [{
      at: [0, SAT_H + 0.0125, 0], off: [0, 1.4, 0],
      build: (k) => {
        k.add(plate(0.86, 0.025, { r: 0.205 }), "paint");
        for (const [x, z] of [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36]]) k.add(rbox(0.05, 0.03, 0.05, 0.008), "dark", [x, 0.025, z]);
        k.add(rbox(0.1, 0.02, 0.06, 0.005), "chip", [0.24, 0.022, 0.24]);
      },
    }],
  },
  {
    id: "antenna", name: "Tape antenna", pn: "PN-5102", rev: "REV A", qty: 4, parent: "comms", order: 13,
    pieces: ([[0, 0.41, 0], [Math.PI / 2, 0, -0.41], [Math.PI, -0.41, 0], [-Math.PI / 2, 0, 0.41]] as [number, number, number][]).map(
      ([ry, x, z]): BomPiece => ({
        at: [x, SAT_H + 0.035, z], rot: [0, ry, 0], off: [0, 1.6, 0], shape: "tape", deploy: "tape",
        build: (k) => {
          const L = 1.4;
          const g = box(L, 0.006, 0.04, 24);
          g.translate(L / 2, 0, 0);
          const pos = g.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            const t = pos.getX(i) / L;
            pos.setY(i, pos.getY(i) - 0.07 * t * t + 0.012 * Math.abs(pos.getZ(i)) / 0.02);
          }
          g.computeVertexNormals();
          k.add(cyl(0.02, 0.03, "y", 12), "dark");
          k.add(g, "tape", [0, 0.012, 0], undefined, { inner: true });
        },
      }),
    ),
  },
];

/** Stale copies, spreadsheets and messages in the scattered cloud. Each merges into its `canon` item. */
export const NOISE: NoiseTile[] = [
  { kind: "dup", canon: "rails", title: "PN-1042", sub: "Corner rail (copy)", rev: "REV A" },
  { kind: "sheet", canon: "battery", title: "BOM_v3_FINAL.xlsx", rows: ["PN-2104 | Battery | B", "PN-2102 | EPS | A", "PN-2210 | Panel | ?"] },
  { kind: "note", canon: "battery", title: "RE: battery rev?", sub: "Email · 6 replies" },
  { kind: "sheet", canon: "obc", title: "avionics_parts.csv", rows: ["PN-3301 | OBC | A", "PN-3305 | ADCS | B", "PN-3410 | Radio | ?"] },
  { kind: "dup", canon: "eps", title: "PN-2102", sub: "Power board (old)", rev: "REV A" },
  { kind: "note", canon: "panels", title: "Panels still REV A?", sub: "Chat · unread" },
  { kind: "sheet", canon: "lens", title: "payload_bom_old.xlsx", rows: ["PN-4110 | Lens | A", "PN-4102 | Cam | ?", "PN-4111 | Hood | –"] },
  { kind: "dup", canon: "antenna", title: "PN-5102", sub: "Tape antenna (copy)", rev: "REV ?" },
  { kind: "note", canon: "radio", title: "Radio change draft", sub: "Email · attachment" },
  { kind: "sheet", canon: "screws", title: "fasteners.xlsx", rows: ["M2.5x6 | 16 | ?", "M2.5x8 | 8 | –", "M3 nut | 24 | ?"] },
  { kind: "dup", canon: "wings", title: "PN-2211", sub: "Wing panel (old)", rev: "REV A" },
  { kind: "note", canon: "standoffs", title: "Standoff length?", sub: "Chat · 2 days ago" },
  { kind: "sheet", canon: "adcs", title: "adcs_v2 (copy).xlsx", rows: ["PN-3305 | ADCS | A", "RW-01 | Wheel | 3", "MTQ-2 | Rod | 2"] },
  { kind: "dup", canon: "camboard", title: "PN-4102", sub: "Camera board (copy)", rev: "REV ?" },
];

/** The finished-state label (state 7). */
export const BUILT_LABEL = "BOM in sync · 0 open changes";

/* ============================================================================================
   Easing
   ============================================================================================ */
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
const backOut = (t: number) => {
  t = clamp01(t);
  const c1 = 1.4;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================================================
   Materials and textures
   ============================================================================================ */
function materials() {
  const std = (color: number, metalness: number, roughness: number) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  return {
    paint: std(0xf1efeb, 0.0, 0.72), // matte white
    alu: std(0xc4c0b9, 0.8, 0.32), // anodised aluminium frame
    dark: std(0x2f2d2c, 0.5, 0.45), // graphite
    pcb: std(0x26332d, 0.1, 0.62), // dark PCB
    chip: std(0x161417, 0.3, 0.4),
    gold: std(0xc8a15a, 0.85, 0.32),
    lens: std(0x141218, 0.6, 0.12),
    cellWrap: std(0x4a4744, 0.2, 0.5), // battery cells
    tape: std(0xd9d4ca, 0.7, 0.35), // steel tape antenna
    cells: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.28, map: cellTexture(2, 7), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  } satisfies Record<Mat, THREE.MeshStandardMaterial>;
}

/** Solar cells: deep indigo cells with silver bus bars (the rover's texture, as a 2 × 7 3U panel). */
function cellTexture(cols: number, rows: number) {
  const W = 256;
  const H = Math.round((W * rows) / cols / 1.05);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c9c6c1";
  g.fillRect(0, 0, W, H);
  const gap = 6;
  const w = (W - gap * (cols + 1)) / cols;
  const h = (H - gap * (rows + 1)) / rows;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const x = gap + i * (w + gap);
      const y = gap + j * (h + gap);
      const grad = g.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, "#1f3f8c");
      grad.addColorStop(1, "#102459");
      g.fillStyle = grad;
      g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(210,212,235,0.55)";
      g.lineWidth = 1.2;
      for (let k = 1; k < 4; k++) {
        g.beginPath();
        g.moveTo(x + (w * k) / 4, y + 2);
        g.lineTo(x + (w * k) / 4, y + h - 2);
        g.stroke();
      }
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A soft round glow (halo behind highlighted parts, pulse heads). */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---- data tiles: one canvas atlas, one cell per tile ---- */
type TileKind = "top" | "asm" | "item" | "sheet" | "note" | "dup";
interface TileSpec {
  id: string;
  kind: TileKind;
  title: string;
  sub?: string;
  rev?: string;
  revLit?: boolean; // the changed revision pill (accent fill)
  foot?: string[];
  rows?: string[];
  canon?: string;
}
const TILE_W = 1.0;
const TILE_H = 0.44;
const CW = 300;
const CH = 132;
const COLS = 4;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function drawTile(g: CanvasRenderingContext2D, x0: number, y0: number, s: TileSpec, k: number) {
  g.save();
  g.translate(x0, y0);
  g.scale(k, k); // drawn in 300 × 132 units, rasterised at k× for crisp text
  g.beginPath();
  g.rect(0, 0, CW, CH);
  g.clip();
  g.fillStyle = s.kind === "dup" ? "#f2f0ec" : "#fbfaf7";
  g.fillRect(0, 0, CW, CH);
  const ink = "#1c1917";
  const muted = "#44403c";
  const faint = "#a8a29e";
  const rule = "#e2dfda";
  const accent = "#4f46e5";
  g.textBaseline = "alphabetic";
  const pill = (text: string, right: number, y: number, lit: boolean, grey: boolean) => {
    g.font = `600 17px ${MONO}`;
    const w = g.measureText(text).width + 18;
    const x = right - w;
    g.beginPath();
    g.roundRect(x, y, w, 26, 13);
    g.fillStyle = lit ? accent : grey ? "#ecebe8" : "#eef0fe";
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = lit ? accent : grey ? "#d6d3d1" : "#c7cbfb";
    g.stroke();
    g.fillStyle = lit ? "#ffffff" : grey ? "#78716c" : accent;
    g.fillText(text, x + 9, y + 19);
  };
  if (s.kind === "top" || s.kind === "asm") {
    g.fillStyle = ink;
    g.fillRect(0, 0, CW, 32);
    g.fillStyle = "#fafaf9";
    g.font = `600 14px ${MONO}`;
    g.fillText(s.kind === "top" ? "TOP ASSEMBLY" : "SUB-ASSEMBLY", 16, 21);
    if (s.sub) {
      g.textAlign = "right";
      g.fillStyle = "#d6d3d1";
      g.fillText(s.sub, CW - 16, 21);
      g.textAlign = "left";
    }
    g.fillStyle = ink;
    g.font = `700 30px ${MONO}`;
    g.fillText(s.title, 16, 72);
    g.fillStyle = muted;
    g.font = `600 24px ${SANS}`;
    g.fillText(s.foot?.[0] ?? "", 16, 109);
  } else if (s.kind === "item" || s.kind === "dup") {
    const grey = s.kind === "dup";
    g.fillStyle = grey ? "#78716c" : ink;
    g.font = `700 34px ${MONO}`;
    g.fillText(s.title, 14, 46);
    if (s.rev) pill(s.rev, CW - 14, 20, !!s.revLit, grey);
    g.fillStyle = grey ? faint : muted;
    g.font = `600 22px ${SANS}`;
    g.fillText(s.sub ?? "", 15, 79);
    g.strokeStyle = rule;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(10, 92);
    g.lineTo(CW - 10, 92);
    for (const x of [100, 200]) {
      g.moveTo(x, 92);
      g.lineTo(x, CH - 8);
    }
    g.stroke();
    g.fillStyle = grey ? faint : "#78716c";
    g.font = `500 15px ${MONO}`;
    (s.foot ?? []).forEach((t, i) => g.fillText(t, 16 + i * 100, 117));
    if (grey) {
      g.strokeStyle = "#d6d3d1";
      g.setLineDash([7, 6]);
      g.lineWidth = 2;
      g.strokeRect(4, 4, CW - 8, CH - 8);
      g.setLineDash([]);
    }
  } else if (s.kind === "sheet") {
    g.fillStyle = "#e7e5e4";
    g.fillRect(0, 0, CW, 30);
    g.fillStyle = "#44403c";
    g.font = `600 15px ${MONO}`;
    g.fillText(s.title, 12, 20);
    g.strokeStyle = rule;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let r = 1; r <= 3; r++) {
      g.moveTo(0, 30 + r * 33);
      g.lineTo(CW, 30 + r * 33);
    }
    for (const x of [126, 226]) {
      g.moveTo(x, 30);
      g.lineTo(x, CH);
    }
    g.stroke();
    g.font = `500 15px ${MONO}`;
    (s.rows ?? []).forEach((row, r) =>
      row.split("|").forEach((cell, i) => {
        g.fillStyle = cell.includes("?") ? "#b45309" : "#57534e";
        g.fillText(cell.trim(), [10, 136, 236][i] ?? 10, 54 + r * 33);
      }),
    );
  } else {
    // note: an email / chat message
    g.strokeStyle = "#78716c";
    g.lineWidth = 2;
    g.strokeRect(16, 18, 30, 22);
    g.beginPath();
    g.moveTo(16, 18);
    g.lineTo(31, 31);
    g.lineTo(46, 18);
    g.stroke();
    g.fillStyle = "#292524";
    g.font = `600 21px ${SANS}`;
    g.fillText(s.title, 58, 37);
    g.fillStyle = "#e2dfda";
    for (const [y, w] of [[60, 250], [80, 190]] as [number, number][]) {
      g.beginPath();
      g.roundRect(16, y, w, 9, 4.5);
      g.fill();
    }
    g.fillStyle = faint;
    g.font = `500 15px ${MONO}`;
    g.fillText(s.sub ?? "", 16, 118);
  }
  // the card outline is printed on the face (one draw call for every tile instead of an outline each)
  g.strokeStyle = s.kind === "dup" ? "#c9c4bd" : "#b3ada5";
  g.lineWidth = 2.5;
  g.beginPath();
  g.roundRect(1.25, 1.25, CW - 2.5, CH - 2.5, 17);
  g.stroke();
  g.restore();
}

/* ============================================================================================
   The scene
   ============================================================================================ */
export interface SceneHandle {
  set(progress: number): void;
  theme(dark: boolean): void;
  /** Shift the framing right by px (screen space), to leave room for the information panel. */
  shift(px: number): void;
  dispose(): void;
}

interface Built {
  meshes: { geo: THREE.BufferGeometry; mat: Mat; inner: boolean }[];
  edges: { geo: THREE.BufferGeometry; inner: boolean }[];
}

/** Build a piece's primitives and merge them per material: a handful of draw calls per piece. */
function buildShape(build: (k: Kit) => void): Built {
  const buckets = new Map<string, THREE.BufferGeometry[]>();
  const edgeB: Record<"0" | "1", THREE.BufferGeometry[]> = { "0": [], "1": [] };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const clean = (geo: THREE.BufferGeometry) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    g.morphAttributes = {};
    return g;
  };
  build({
    add(geo, mat, at = [0, 0, 0], rot, o = {}) {
      m4.compose(v.set(...at), q.setFromEuler(e.set(...(rot ?? ([0, 0, 0] as V3)))), one);
      const inner = o.inner ? "1" : "0";
      if (o.edges !== false) edgeB[inner].push(new THREE.EdgesGeometry(geo, 30).applyMatrix4(m4));
      const key = `${inner}|${mat}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(clean(geo).applyMatrix4(m4));
      geo.dispose();
    },
  });
  const merge = (list: THREE.BufferGeometry[]) => {
    if (list.length === 1) return list[0];
    const m = mergeGeometries(list, false) ?? list[0];
    if (m !== list[0]) list.forEach((g) => g.dispose());
    return m;
  };
  const out: Built = { meshes: [], edges: [] };
  for (const [key, list] of buckets) {
    const [inner, mat] = key.split("|");
    out.meshes.push({ geo: merge(list), mat: mat as Mat, inner: inner === "1" });
  }
  for (const inner of ["0", "1"] as const) if (edgeB[inner].length) out.edges.push({ geo: merge(edgeB[inner]), inner: inner === "1" });
  return out;
}

interface ItemRT {
  spec: BomItem;
  pieces: PieceRT[];
  edges: THREE.LineBasicMaterial;
  tile: TileRT;
  halo: THREE.Sprite;
  center: THREE.Vector3; // assembled bbox centre
  treeQ: THREE.Quaternion; // display rotation in the tree
  treeS: number; // display scale in the tree
  hit: number; // 0…1 pop when the change pulse reaches this item
  slot: number; // assembly slot index
  glow: number;
  morph: number; // 0…1 tile → part (state 4)
  fly: number; // 0…1 tree → assembled (state 6), the item's main window
}
interface PieceRT {
  spec: BomPiece;
  item: ItemRT;
  obj: THREE.Group;
  inner: THREE.Group;
  home: THREE.Vector3;
  homeQ: THREE.Quaternion;
  off: THREE.Vector3;
  centre: THREE.Vector3; // this piece's own assembled bbox centre
  grid: THREE.Vector3; // its offset in the item's tree cell (multi-quantity items are laid out side by side)
  guide: THREE.Line;
  guideMat: THREE.LineDashedMaterial;
}
interface TileRT {
  spec: TileSpec;
  index: number; // instance index (tiles are drawn as two instanced meshes)
  group: THREE.Object3D; // transform holder only (not in the scene)
  visible: boolean;
  scatter: THREE.Vector3;
  scatterE: THREE.Euler;
  treePos: THREE.Vector3;
  treeScale: number;
  delay: number;
  phase: number[];
  tt: number; // tree-flight progress (state 3)
  item?: ItemRT;
  canon?: TileRT;
  parent?: TileRT;
  pts: THREE.Vector3[]; // the relation line to its parent (4 points), recomputed every update
  draw: number; // the state-2 draw-in delay
}

export function mountCubesat(host: HTMLElement, { dark }: { dark: boolean }): SceneHandle {
  const M = materials();
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  // phones and tablets: no real-time shadow pass, two lights fewer, ambient motion at 30 fps
  const lite = small || window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd = lite && ((nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4);

  /* ---- the tree plane: faces the camera's horizontal direction (R right, U up, N toward the viewer) ---- */
  const viewDir = new THREE.Vector3(1.0, 0.55, 1.12).normalize();
  const U = new THREE.Vector3(0, 1, 0);
  const N = new THREE.Vector3(viewDir.x, 0, viewDir.z).normalize();
  const R = new THREE.Vector3().crossVectors(U, N).normalize();
  const plane = (x: number, y: number, z: number, out = new THREE.Vector3()) => out.set(0, 0, 0).addScaledVector(R, x).addScaledVector(U, y).addScaledVector(N, z);
  const faceQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(R, U, N));

  /* ---- tree layout (plane coordinates) ---- */
  const COLW = 1.5;
  const Y_TOP = 6.55;
  const Y_SA = 5.3;
  const Y_LEAF = 4.35;
  const ROW = 0.92;
  const LEAF_S = 0.82;
  const SA_IDS = ASSEMBLIES.slice(1).map((a) => a.id);
  const saX = (id: string) => (SA_IDS.indexOf(id) - (SA_IDS.length - 1) / 2) * COLW;

  /* ---- tiles: specs and atlas ---- */
  const asmCount = (id: string) => BOM.filter((b) => b.parent === id).length;
  const specs: TileSpec[] = [
    ...ASSEMBLIES.map((a, i): TileSpec => ({
      id: a.id,
      kind: i === 0 ? "top" : "asm",
      title: a.pn,
      sub: i === 0 ? `${SA_IDS.length} SUB-ASSY` : `${asmCount(a.id)} ITEMS`,
      foot: [a.name],
    })),
    ...BOM.map((b): TileSpec => ({
      id: b.id,
      kind: "item",
      title: b.pn,
      sub: b.name,
      rev: b.rev,
      foot: [`QTY ${b.qty}`, ASSEMBLIES.find((a) => a.id === b.parent)!.pn, "EA"],
    })),
    ...NOISE.map((n, i): TileSpec => ({ id: `noise-${i}`, kind: n.kind, title: n.title, sub: n.sub, rev: n.rev, rows: n.rows, canon: n.canon })),
  ];
  const changed = BOM.find((b) => b.revNext)!;
  const changedSpec: TileSpec = { ...specs.find((s) => s.id === changed.id)!, rev: changed.revNext, revLit: true };
  const cells = [...specs, changedSpec];
  const atlasRows = Math.ceil(cells.length / COLS);
  const K = small ? 1.2 : 1.7; // atlas resolution: crisp text on large screens, lighter on phones
  const cw = Math.round(CW * K);
  const ch = Math.round(CH * K);
  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = cw * COLS;
  atlasCanvas.height = ch * atlasRows;
  const ag = atlasCanvas.getContext("2d")!;
  cells.forEach((sp, i) => drawTile(ag, (i % COLS) * cw, Math.floor(i / COLS) * ch, sp, K));
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  const PAD = 2;
  const cellUV = (i: number, out: Float32Array, at: number) => {
    out[at] = ((i % COLS) * cw + PAD) / (cw * COLS);
    out[at + 1] = 1 - (Math.floor(i / COLS) * ch + ch - PAD) / (ch * atlasRows);
  };

  /* ---- tiles: a thin rounded card body and a printed face, each ONE instanced mesh for all 37 tiles ---- */
  const tileShape = rrect(TILE_W, TILE_H, 0.06) as THREE.Shape;
  const tileBody = new THREE.ExtrudeGeometry(tileShape, { depth: 0.03, bevelEnabled: false, curveSegments: 6 });
  tileBody.translate(0, 0, -0.015);
  const tileFace = new THREE.ShapeGeometry(tileShape, 6);
  {
    const uv = tileFace.attributes.uv as THREE.BufferAttribute;
    const pos = tileFace.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / TILE_W + 0.5, pos.getY(i) / TILE_H + 0.5);
  }
  tileFace.translate(0, 0, 0.0158);
  const NT = specs.length;
  const cellArr = new Float32Array(NT * 2);
  specs.forEach((_, i) => cellUV(i, cellArr, i * 2));
  const cellAttr = new THREE.InstancedBufferAttribute(cellArr, 2);
  tileFace.setAttribute("aCell", cellAttr);
  const tileBodyMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  // the printed face is unlit and not tone-mapped: the atlas colours land on screen exactly (crisp, not greyed)
  const tileFaceMat = new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false });
  const cellSize = new THREE.Vector2((cw - PAD * 2) / (cw * COLS), (ch - PAD * 2) / (ch * atlasRows));
  tileFaceMat.onBeforeCompile = (shader) => {
    shader.uniforms.uCell = { value: cellSize };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aCell;\nuniform vec2 uCell;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv = uv * uCell + aCell;");
  };
  tileFaceMat.customProgramCacheKey = () => "sat-tile-face";
  const bodyMesh = new THREE.InstancedMesh(tileBody, tileBodyMat, NT);
  const faceMesh = new THREE.InstancedMesh(tileFace, tileFaceMat, NT);
  bodyMesh.castShadow = true;
  for (const m of [bodyMesh, faceMesh]) {
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(m);
  }
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < NT; i++) faceMesh.setColorAt(i, white);

  const rand = rng(20261107);
  const tiles: TileRT[] = specs.map((sp, i) => ({
    spec: sp,
    index: i,
    group: new THREE.Object3D(),
    visible: true,
    scatter: new THREE.Vector3(),
    scatterE: new THREE.Euler((rand() - 0.5) * 0.9, (rand() - 0.5) * 1.2, (rand() - 0.5) * 0.7),
    treePos: new THREE.Vector3(),
    treeScale: 1,
    delay: 0,
    phase: [0, 1, 2, 3].map(() => rand() * Math.PI * 2),
    tt: 0,
    pts: [0, 1, 2, 3].map(() => new THREE.Vector3()),
    draw: rand() * 0.55,
  }));
  const tileById = new Map(tiles.map((t) => [t.spec.id, t]));
  const changedIndex = tileById.get(changed.id)!.index;
  let changedShowsNext = false;

  // tree positions and parents
  tiles.forEach((t) => {
    const s = t.spec;
    if (s.kind === "top") {
      plane(0, Y_TOP, -0.3, t.treePos);
      t.treeScale = 1.05;
    } else if (s.kind === "asm") {
      plane(saX(s.id), Y_SA, -0.15, t.treePos);
      t.treeScale = 0.95;
      t.parent = tileById.get("top");
    } else if (s.kind === "item") {
      const b = BOM.find((x) => x.id === s.id)!;
      const row = BOM.filter((x) => x.parent === b.parent).indexOf(b);
      plane(saX(b.parent) + 0.18, Y_LEAF - row * ROW, 0, t.treePos);
      t.treeScale = LEAF_S;
      t.parent = tileById.get(b.parent);
      t.delay = 0.05 + rand() * 0.25;
    }
  });
  tiles.forEach((t) => {
    if (t.spec.canon) {
      t.canon = tileById.get(t.spec.canon)!;
      t.parent = t.canon;
      t.treePos.copy(t.canon.treePos).addScaledVector(N, -0.05);
      t.treeScale = t.canon.treeScale;
      t.delay = 0.12 + rand() * 0.18;
    } else if (t.spec.kind !== "item") t.delay = rand() * 0.15;
  });
  // the scattered cloud: items anywhere; half the stale copies land on top of their item (overlaps)
  tiles.forEach((t) => {
    if (t.canon) return;
    plane((rand() - 0.5) * 6.8, 1.5 + rand() * 4.6, (rand() - 0.5) * 2.6, t.scatter);
  });
  tiles.forEach((t, i) => {
    if (!t.canon) return;
    if (i % 2 === 0) t.scatter.copy(t.canon.scatter).add(plane((rand() - 0.5) * 0.7, (rand() - 0.5) * 0.35, 0.12 + rand() * 0.2));
    else plane((rand() - 0.5) * 6.8, 1.5 + rand() * 4.6, (rand() - 0.5) * 2.6, t.scatter);
  });

  /* ---- parts ---- */
  const glowTex = glowTexture();
  const shapeCache = new Map<string, Built>();
  const items: ItemRT[] = [];
  const pieces: PieceRT[] = [];
  const slots = [...BOM].sort((a, b) => a.order - b.order).map((b) => b.id);
  BOM.forEach((spec) => {
    const edges = new THREE.LineBasicMaterial({ color: 0x57534e, transparent: true, opacity: 0.5 });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4f46e5, transparent: true, depthWrite: false, opacity: 0 }));
    halo.visible = false;
    root.add(halo);
    const item: ItemRT = {
      spec,
      pieces: [],
      edges,
      tile: tileById.get(spec.id)!,
      halo,
      center: new THREE.Vector3(),
      treeQ: new THREE.Quaternion(),
      treeS: 1,
      slot: slots.indexOf(spec.id),
      glow: 0,
      hit: 0,
      morph: 0,
      fly: 0,
    };
    item.tile.item = item;
    spec.pieces.forEach((ps, j) => {
      const key = ps.shape ?? `${spec.id}:${j}`;
      let built = shapeCache.get(key);
      if (!built) {
        built = buildShape(ps.build);
        shapeCache.set(key, built);
      }
      const obj = new THREE.Group();
      const inner = new THREE.Group();
      obj.add(inner);
      for (const m of built.meshes) {
        const mesh = new THREE.Mesh(m.geo, M[m.mat]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        (m.inner ? inner : obj).add(mesh);
      }
      for (const e of built.edges) (e.inner ? inner : obj).add(new THREE.LineSegments(e.geo, edges));
      root.add(obj);
      // deployables start stowed
      if (ps.deploy === "tape") {
        inner.rotation.y = Math.PI / 2;
        inner.scale.x = 0.3;
      }
      const guideMat = new THREE.LineDashedMaterial({ color: 0x78716c, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0 });
      const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), guideMat);
      guide.visible = false;
      guide.frustumCulled = false;
      root.add(guide);
      const p: PieceRT = {
        spec: ps,
        item,
        obj,
        inner,
        home: new THREE.Vector3(...ps.at),
        homeQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(...(ps.rot ?? ([0, 0, 0] as V3)))),
        off: new THREE.Vector3(...ps.off),
        centre: new THREE.Vector3(),
        grid: new THREE.Vector3(),
        guide,
        guideMat,
      };
      item.pieces.push(p);
      pieces.push(p);
    });
    items.push(item);
  });
  const itemById = new Map(items.map((i) => [i.spec.id, i]));

  /* ---- the finished body, baked: once every part has landed, the static pieces are drawn as ONE merged mesh per
     material (about a dozen draw calls instead of ~110), so the hovering satellite stays light on phones. The
     deploying wings and tape antennas stay separate pieces. ---- */
  const baked = new THREE.Group();
  baked.visible = false;
  root.add(baked);
  const bakedEdgeMat = new THREE.LineBasicMaterial({ color: 0x57534e, transparent: true, opacity: 0.5 });
  const staticPieces = pieces.filter((pc) => !pc.spec.deploy);
  {
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const lines: THREE.BufferGeometry[] = [];
    const mtx = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    for (const pc of staticPieces) {
      mtx.compose(pc.home, pc.homeQ, one); // the piece's meshes sit at identity inside its group
      pc.obj.traverse((o) => {
        if (o === pc.obj || o === pc.inner) return;
        const geo = (o as THREE.Mesh).geometry;
        if (!geo) return;
        const g = geo.clone().applyMatrix4(mtx);
        if ((o as THREE.LineSegments).isLineSegments) lines.push(g);
        else {
          const mat = (o as THREE.Mesh).material as THREE.Material;
          if (!byMat.has(mat)) byMat.set(mat, []);
          byMat.get(mat)!.push(g);
        }
      });
    }
    for (const [mat, list] of byMat) {
      const g = mergeGeometries(list, false);
      list.forEach((x) => x.dispose());
      if (!g) continue;
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      baked.add(mesh);
    }
    const eg = mergeGeometries(lines, false);
    lines.forEach((x) => x.dispose());
    if (eg) baked.add(new THREE.LineSegments(eg, bakedEdgeMat));
  }

  // each item's tree display: tilted toward the viewer, scaled to fit its cell; several pieces sit side by side
  {
    const box3 = new THREE.Box3();
    const one = new THREE.Box3();
    const corner = new THREE.Vector3();
    for (const it of items) {
      box3.makeEmpty();
      const ext: [number, number][] = [];
      for (const p of it.pieces) {
        p.obj.position.copy(p.home);
        p.obj.quaternion.copy(p.homeQ);
        p.obj.updateMatrixWorld(true);
        one.setFromObject(p.obj);
        one.getCenter(p.centre);
        box3.union(one);
      }
      box3.getCenter(it.center);
      const size = box3.getSize(new THREE.Vector3());
      const tall = size.y > Math.max(size.x, size.z) * 1.3;
      it.treeQ
        .setFromAxisAngle(R, tall ? 0.18 : 0.62)
        .multiply(new THREE.Quaternion().setFromAxisAngle(U, tall ? -0.45 : -0.55));
      for (const p of it.pieces) {
        one.setFromObject(p.obj);
        let ex = 0;
        let ey = 0;
        for (let c = 0; c < 8; c++) {
          corner.set(c & 1 ? one.max.x : one.min.x, c & 2 ? one.max.y : one.min.y, c & 4 ? one.max.z : one.min.z).sub(p.centre).applyQuaternion(it.treeQ);
          ex = Math.max(ex, Math.abs(corner.dot(R)));
          ey = Math.max(ey, Math.abs(corner.y));
        }
        ext.push([ex, ey]);
      }
      const n = it.pieces.length;
      const cols = n <= 4 ? n : 4;
      const rows = Math.ceil(n / cols);
      const ex = Math.max(...ext.map((e) => e[0]));
      const ey = Math.max(...ext.map((e) => e[1]));
      const gx = n > 1 ? ex * 0.7 + 0.01 : 0;
      const gy = n > 1 ? ey * 0.7 + 0.01 : 0;
      const W = cols * 2 * ex + (cols - 1) * gx;
      const H = rows * 2 * ey + (rows - 1) * gy;
      it.treeS = Math.min(0.62 / W, 0.5 / H);
      it.pieces.forEach((p, j) => {
        const col = j % cols;
        const row = Math.floor(j / cols);
        p.grid
          .set(0, 0, 0)
          .addScaledVector(R, (col - (cols - 1) / 2) * (2 * ex + gx) * it.treeS)
          .addScaledVector(U, ((rows - 1) / 2 - row) * (2 * ey + gy) * it.treeS);
      });
    }
  }

  /* ---- relation lines (one buffer: 3 segments per tile that has a parent) ---- */
  const related = tiles.filter((t) => t.parent);
  const relPos = new Float32Array(related.length * 6 * 3);
  const relCol = new Float32Array(related.length * 6 * 4);
  const relGeo = new THREE.BufferGeometry();
  relGeo.setAttribute("position", new THREE.BufferAttribute(relPos, 3).setUsage(THREE.DynamicDrawUsage));
  relGeo.setAttribute("color", new THREE.BufferAttribute(relCol, 4).setUsage(THREE.DynamicDrawUsage));
  const relLines = new THREE.LineSegments(relGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  relLines.frustumCulled = false;
  root.add(relLines);

  /* ---- the change pulse: lit path (fat line) + a glowing head per dependent ---- */
  const deps = (changed.deps ?? []).map((id) => itemById.get(id)!);
  // one fixed-size buffer, updated in place: three.js caches an instanced geometry's maximum instance
  // count on first draw, so re-calling setPositions() with more segments would still draw only the first few
  const LIT_MAX = 96;
  const litArr = new Float32Array(LIT_MAX * 6);
  const litGeo = new LineSegmentsGeometry().setPositions(litArr);
  const litBuf = (litGeo.attributes.instanceStart as THREE.InterleavedBufferAttribute).data;
  const litMat = new LineMaterial({ color: 0x4f46e5, linewidth: 3.2, transparent: true, opacity: 1, depthWrite: false });
  const lit = new LineSegments2(litGeo, litMat);
  lit.frustumCulled = false;
  lit.renderOrder = 5;
  lit.visible = false;
  root.add(lit);
  const heads = deps.map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4f46e5, transparent: true, depthWrite: false, depthTest: false }));
    s.renderOrder = 6;
    s.scale.setScalar(0.34);
    s.visible = false;
    root.add(s);
    return s;
  });

  /* ---- state 7, "in orbit": a dashed orbit ring with a travelling dot, and a blinking status light ---- */
  const PIVOT = new THREE.Vector3(0, SAT_H / 2, 0);
  const LIFT = 0.55; // how far the finished satellite rises off the floor
  const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, -0.17)); // a slight bank, as if in flight
  const qRig = new THREE.Quaternion();
  const qOne = new THREE.Quaternion();
  const ORBIT_R = 2.2;
  const ORBIT_N = 160;
  const orbit = new THREE.Group();
  orbit.rotation.set(0.1, 0, 0.07); // close to level: reads as an orbit seen from slightly above
  orbit.visible = false;
  root.add(orbit);
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: ORBIT_N + 1 }, (_, i) => {
      const a = (i / ORBIT_N) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R);
    }),
  );
  const orbitMat = new THREE.LineDashedMaterial({ color: 0x4f46e5, dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0, depthWrite: false });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  orbitLine.computeLineDistances();
  orbitLine.frustumCulled = false;
  orbit.add(orbitLine);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x4f46e5, toneMapped: false, transparent: true, opacity: 0 });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), dotMat);
  const dotHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4f46e5, transparent: true, depthWrite: false, opacity: 0 }));
  dotHalo.scale.setScalar(0.45);
  dot.add(dotHalo);
  orbit.add(dot);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x4f46e5, toneMapped: false, transparent: true, opacity: 0 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), ledMat);
  const ledHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4f46e5, transparent: true, depthWrite: false, opacity: 0 }));
  ledHalo.scale.setScalar(0.3);
  led.add(ledHalo);
  led.visible = false;
  root.add(led);
  const LED_AT = new THREE.Vector3(-0.3, SAT_H + 0.05, 0.3);

  /* ---- studio: lights, a shadow-catching floor, reflections ---- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8178, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(4, 9, 5);
  key.castShadow = !lite;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e8, 0.55);
  fill.position.set(-5, 3, 6);
  if (!lite) scene.add(fill);
  const rim = new THREE.DirectionalLight(0xdfe3ff, 0.9);
  rim.position.set(-6, 5, -6);
  if (!lite) scene.add(rim);
  // the invisible floor: draws nothing but the soft shadow, so the satellite (and the cloud) sit on the page
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.16, depthWrite: false });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.visible = !lite;
  root.add(floor);
  // phones: a soft contact-shadow blob under the satellite instead of a shadow map (one cheap draw, no extra pass)
  const blobTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.45, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.003;
  blob.visible = false;
  root.add(blob);

  if (process.env.NODE_ENV !== "production") (window as unknown as { __satScene?: THREE.Scene }).__satScene = scene;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : lite ? 1.5 : 1.75));
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = small ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "pan-y"; // vertical swipes still scroll the page
  canvas.style.cursor = "grab";
  canvas.style.transition = "opacity 170ms ease";
  host.appendChild(canvas);
  atlas.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.6;

  // the finished-state label: plain HTML pinned above the satellite (crisp text, site tokens)
  const label = document.createElement("div");
  label.className = "sat-label";
  label.setAttribute("aria-hidden", "true");
  label.innerHTML = `<span class="sat-label-dot"></span>${BUILT_LABEL}`;
  host.appendChild(label);
  // the change callout (state 5): which part changed, and how many parts the change reaches
  const callout = document.createElement("div");
  callout.className = "sat-label sat-callout";
  callout.setAttribute("aria-hidden", "true");
  callout.innerHTML = `<span class="sat-label-dot"></span><b>${changed.pn}</b>&nbsp;${changed.rev} → <em>${changed.revNext}</em><span></span>`;
  const calloutCount = callout.lastElementChild as HTMLSpanElement;
  host.appendChild(callout);

  /* ---- camera: one viewing direction; the model turns, the camera only dollies ---- */
  const camera = new THREE.PerspectiveCamera(24, 4 / 3, 0.1, 200);
  const target = new THREE.Vector3(0, 2, 0);
  const camRight = new THREE.Vector3().crossVectors(U, viewDir).normalize().negate();
  const camUp = new THREE.Vector3().crossVectors(viewDir, camRight).normalize();
  const fitBox = new THREE.Box3();
  const qv = new THREE.Vector3();
  // corner pool (x, y, z triples), reused every fit: no per-frame allocations while scrolling
  let cornerBuf = new Float32Array(3 * 8 * 128);
  let nc = 0;
  const push = (x: number, y: number, z: number) => {
    if ((nc + 1) * 3 > cornerBuf.length) {
      const bigger = new Float32Array(cornerBuf.length * 2);
      bigger.set(cornerBuf);
      cornerBuf = bigger;
    }
    cornerBuf[nc * 3] = x;
    cornerBuf[nc * 3 + 1] = y;
    cornerBuf[nc * 3 + 2] = z;
    nc++;
  };
  /**
   * Fit the camera to what is on screen: the boxes of every visible tile and part (at yaw 0),
   * turned through the yaws the model sweeps, projected on the camera axes; the distance is
   * solved so they fill `fill` of the usable viewport.
   */
  const fitNow = (fill: number) => {
    const keep = root.rotation.y;
    root.rotation.y = 0;
    root.updateMatrixWorld(true);
    nc = 0;
    const take = (o: THREE.Object3D) => {
      fitBox.setFromObject(o);
      if (fitBox.isEmpty()) return;
      for (let c = 0; c < 8; c++) push(c & 1 ? fitBox.max.x : fitBox.min.x, c & 2 ? fitBox.max.y : fitBox.min.y, c & 4 ? fitBox.max.z : fitBox.min.z);
    };
    // a tile is a flat card: its four corners from its transform
    for (const t of tiles) {
      if (!t.visible) continue;
      const sc = t.group.scale.x;
      for (const [dx, dy] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) {
        qv.set(dx * sc, dy * sc, 0).applyQuaternion(t.group.quaternion).add(t.group.position);
        push(qv.x, qv.y, qv.z);
      }
    }
    for (const p of pieces) if (p.obj.visible) take(p.obj);
    if (baked.visible) take(baked);
    if (orbit.visible) take(orbitLine);
    root.rotation.y = keep;
    root.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const yaws = [-0.3, 0, 0.3];
    for (const yawAt of yaws)
      for (let i = 0; i < nc; i++) {
        qv.set(cornerBuf[i * 3], cornerBuf[i * 3 + 1], cornerBuf[i * 3 + 2]).applyAxisAngle(U, yawAt);
        const x = qv.dot(camRight);
        const y = qv.dot(camUp);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    if (!nc) return { centre: new THREE.Vector3(0, 2, 0), dist: 20 };
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const tanV = Math.tan((camera.fov * Math.PI) / 360) * fill;
    const tanH = tanV * fitAspect;
    let dist = 0;
    for (const yawAt of yaws)
      for (let i = 0; i < nc; i++) {
        qv.set(cornerBuf[i * 3], cornerBuf[i * 3 + 1], cornerBuf[i * 3 + 2]).applyAxisAngle(U, yawAt);
        const z = qv.dot(viewDir);
        dist = Math.max(dist, z + Math.abs(qv.dot(camRight) - cx) / tanH, z + Math.abs(qv.dot(camUp) - cy) / tanV);
      }
    return { centre: new THREE.Vector3().addScaledVector(camRight, cx).addScaledVector(camUp, cy), dist };
  };
  let F = { centre: new THREE.Vector3(0, 2, 0), dist: 20 };
  type Fit = typeof F;
  /**
   * Steps 6–7 use two fixed framings instead of fitting the moving parts every frame (that made the camera pump:
   * it zoomed right in when the last parts landed and the tree folded away, then out again for the wings and the
   * orbit ring). `tree` = the finished tree of step 5, `fin` = the deployed satellite in orbit (step 7).
   * Recomputed on resize / panel shift.
   */
  let keyFits: { tree: Fit; fin: Fit } | null = null;
  const fillAt = (at: number) => (w < 640 ? 0.94 : 0.9) - 0.04 * smooth((at - 5) / 2);
  const placeCamera = () => {
    target.copy(F.centre).applyAxisAngle(U, root.rotation.y);
    camera.position.copy(target).addScaledVector(viewDir, F.dist);
    camera.lookAt(target);
  };

  /* ---- state ---- */
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Ambient motion (cloud drift, hover bob, sway, orbit dot, blinking light) is optional polish. Low-end phones
  // skip it from the start; any other phone drops it for the visit if it can't hold ~22 fps while it runs.
  // Everything scroll-driven still plays in full.
  let ambientOff = lowEnd;
  const calm = () => still.matches || ambientOff;
  let progress = -1;
  let u = 0; // progress × 7: which state, and how far into it
  let isDark = dark;
  let shiftPx = 0;
  let fitAspect = 4 / 3;
  let w = 1;
  let h = 1;
  let yaw = -0.28;
  let dragYaw = 0;
  let dirty = true;
  let visible = true;
  let raf = 0;
  let last = 0;
  let labelAlpha = 0;
  let labelRise = 0;
  let calloutAlpha = 0;
  let shownAffected = -1;
  const accent = new THREE.Color();
  const edgeIdle = new THREE.Color();
  const lineIdle = new THREE.Color();
  const tmpC = new THREE.Color();
  const faceBase = new THREE.Color(0xffffff);
  const faceGlow = new THREE.Color();

  const S = (k: number, a: number, b: number) => clamp01((u - k - a) / (b - a));
  /** The yaw the model should have: still while the tree reads, a slow turn while it assembles. */
  const yawTarget = (now: number) => {
    const scroll = u < 3 ? -0.28 * (1 - ease(u / 3)) : u < 5 ? 0 : 0.42 * ease(clamp01((u - 5) / 1.6));
    const sway = u >= 6.72 && !calm() ? 0.24 * Math.sin(now / 3200) : 0;
    return scroll + dragYaw + sway;
  };

  /* ---- the update: every position, colour and line from u (and the clock, for the drift) ---- */
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const eTmp = new THREE.Euler();
  const deployAxis = new THREE.Vector3(0, 1, 0);

  /* state 7: the finished satellite lifts off, banks slightly and hovers; an orbit ring draws around it.
     `movers` = the pieces to carry with it (all of them during a full update; only the deployables while hovering). */
  const stage7 = (now: number, bl: number, movers: PieceRT[]) => {
    const lift = ease(clamp01((bl - 0.05) / 0.7));
    const bob = calm() ? 0 : Math.sin(now / 1500) * 0.055 * lift;
    const rise = LIFT * lift + bob;
    if (lift <= 0) qRig.identity();
    if (lift > 0) {
      qRig.slerpQuaternions(qOne, tiltQ, lift);
      if (!calm()) qRig.multiply(qb.setFromAxisAngle(R, Math.sin(now / 2100) * 0.025 * lift));
      for (const p of movers) {
        p.obj.position.sub(PIVOT).applyQuaternion(qRig).add(PIVOT);
        p.obj.position.y += rise;
        p.obj.quaternion.premultiply(qRig);
      }
    }
    baked.quaternion.copy(qRig);
    baked.position.copy(PIVOT).sub(v1.copy(PIVOT).applyQuaternion(qRig));
    baked.position.y += lift > 0 ? rise : 0;
    led.visible = lift > 0.3;
    if (led.visible) {
      led.position.copy(LED_AT).sub(PIVOT).applyQuaternion(qRig).add(PIVOT);
      led.position.y += rise;
      const blink = calm() ? 1 : 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(now / 420)), 6);
      ledMat.opacity = smooth((lift - 0.3) / 0.3) * blink;
      (ledHalo.material as THREE.SpriteMaterial).opacity = ledMat.opacity * 0.8;
    }
    const ring = ease(clamp01((bl - 0.2) / 0.6));
    orbit.visible = ring > 0.001;
    if (orbit.visible) {
      orbit.position.copy(PIVOT);
      orbit.position.y += LIFT * lift - 0.15;
      orbit.scale.setScalar(0.55 + 0.45 * ring);
      orbitGeo.setDrawRange(0, Math.max(2, Math.ceil((ORBIT_N + 1) * ring)));
      orbitMat.opacity = 0.6 * ring;
      const at = calm() ? 0.9 : now / 2600;
      dot.position.set(Math.cos(at) * ORBIT_R, 0, Math.sin(at) * ORBIT_R);
      dotMat.opacity = smooth((ring - 0.7) / 0.3);
      (dotHalo.material as THREE.SpriteMaterial).opacity = dotMat.opacity * 0.7;
    }
    return lift;
  };
  const deployables = pieces.filter((pc) => pc.spec.deploy);
  /** Hover frames once built: only the satellite, its light and the orbit dot move; nothing else is recomputed. */
  const hover = (now: number) => {
    for (const pc of deployables) {
      pc.obj.position.copy(pc.home);
      pc.obj.quaternion.copy(pc.homeQ);
    }
    stage7(now, 1, deployables);
    dirty = true;
  };
  const asmGlow = new Map<string, number>();
  const update = (now: number, refit: boolean) => {
    if (refit && u > 5 && !keyFits) {
      const keep = u;
      u = 4.999;
      update(now, false);
      const tree = fitNow(fillAt(u));
      u = 7;
      update(now, false);
      const fin = fitNow(fillAt(u));
      u = keep;
      keyFits = { tree, fin };
    }
    const c = S(1, 0, 0.6); // connected
    const t = S(2, 0, 0.7); // structured
    const m = S(3, 0, 0.6); // real parts
    const r = S(4, 0, 0.9); // change impact
    const a = S(5, 0, 0.88); // assembled
    const bl = S(6, 0, 0.72); // built
    const drift = calm() ? 0 : 1 - smooth(t * 1.4);
    const pull = 0.22 * smooth(c);
    const lineFade = 1 - smooth(a * 1.8);
    const SPAN = 0.36; // each part's flight overlaps its neighbours: a steady, readable build

    // per-item timings
    for (const it of items) {
      const row = BOM.filter((x) => x.parent === it.spec.parent).indexOf(it.spec);
      it.morph = ease(clamp01((m - row * 0.06 - SA_IDS.indexOf(it.spec.parent) * 0.035) / 0.62));
      const start = (it.slot / (slots.length - 1)) * (1 - SPAN);
      it.fly = clamp01((a - start) / SPAN);
    }

    /* tiles */
    for (const tile of tiles) {
      const s = tile.spec;
      const P = tile.group.position;
      // scattered + drift
      plane(Math.sin(now * 0.00045 + tile.phase[0]) * 0.08, Math.sin(now * 0.0006 + tile.phase[1]) * 0.1, Math.sin(now * 0.0005 + tile.phase[2]) * 0.06, v1).multiplyScalar(drift);
      v2.copy(tile.scatter).add(v1);
      v2.lerp(tile.treePos, pull);
      // fly into the tree (arcing toward the viewer)
      tile.tt = clamp01((t - tile.delay) / 0.62);
      const e = ease(tile.tt);
      P.copy(v2).lerp(tile.treePos, e).addScaledVector(N, Math.sin(Math.PI * e) * 0.45);
      eTmp.set(tile.scatterE.x, tile.scatterE.y, tile.scatterE.z + Math.sin(now * 0.0004 + tile.phase[3]) * 0.06 * drift);
      qa.copy(faceQ).multiply(qb.setFromEuler(eTmp));
      tile.group.quaternion.slerpQuaternions(qa, faceQ, e);
      let scale = 1 + (tile.treeScale - 1) * e;
      if (tile.canon) scale *= 1 - smooth((tile.tt - 0.55) / 0.45); // stale copies merge into their item
      if (tile.item) {
        const it = tile.item;
        // state 4: the tile slides under its part and becomes a small tag
        if (it.morph > 0) {
          P.addScaledVector(U, -0.28 * it.morph);
          scale += (0.5 - scale) * it.morph;
        }
        // state 6: the tag folds away as its part leaves
        scale *= 1 - smooth(it.fly / 0.22);
      }
      if (s.kind === "asm") scale *= 1 - smooth((a - 0.38) / 0.24);
      if (s.kind === "top") scale *= 1 - smooth((a - 0.46) / 0.24);
      // state 5: the changed revision pops in
      if (s.id === changed.id) {
        scale *= 1 + 0.22 * Math.sin(Math.PI * clamp01((r - 0.03) / 0.14));
        const next = r >= 0.1;
        if (next !== changedShowsNext) {
          changedShowsNext = next;
          cellUV(next ? cells.length - 1 : changedIndex, cellArr, changedIndex * 2);
          cellAttr.needsUpdate = true;
        }
      }
      tile.visible = scale > 0.003;
      tile.group.scale.setScalar(tile.visible ? scale : 0);
      tile.group.updateMatrix();
      bodyMesh.setMatrixAt(tile.index, tile.group.matrix);
      faceMesh.setMatrixAt(tile.index, tile.group.matrix);
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    faceMesh.instanceMatrix.needsUpdate = true;

    /* parts */
    for (const it of items) {
      const grow = backOut(it.morph) * (1 + 0.2 * it.hit);
      const cell = v3.copy(it.tile.treePos).addScaledVector(U, 0.1);
      const fly = it.fly;
      it.pieces.forEach((p, j) => {
        const n = it.pieces.length;
        const st = n > 1 ? Math.min(0.03, 0.3 / n) : 0; // small stagger between pieces of one item (16 screws, 4 rails…)
        const k = ease(clamp01((fly - j * st) / (1 - (n - 1) * st)));
        // tree pose: cell + grid slot + treeQ · (treeS · (home − piece centre))
        v1.copy(p.home).sub(p.centre).applyQuaternion(it.treeQ).multiplyScalar(it.treeS * grow).add(cell).addScaledVector(p.grid, grow);
        qa.copy(it.treeQ).multiply(p.homeQ);
        // assembled pose, approached along the mounting axis: quadratic Bézier tree → home+off·1.6 → home
        v2.copy(p.home).addScaledVector(p.off, 1.6);
        const o = p.obj.position;
        const k1 = 1 - k;
        o.set(0, 0, 0).addScaledVector(v1, k1 * k1).addScaledVector(v2, 2 * k1 * k).addScaledVector(p.home, k * k);
        p.obj.quaternion.slerpQuaternions(qa, p.homeQ, k);
        p.obj.scale.setScalar(Math.max(1e-4, it.treeS * grow + (1 - it.treeS * grow) * k));
        p.obj.visible = grow > 0.002 || k > 0;
        // state 7: wings swing open, tape antennas spring out
        const d = p.spec.deploy;
        // a little past flat (105°): the wings open into a shallow V toward the viewer
        if (d === "wing+" || d === "wing-") p.inner.quaternion.setFromAxisAngle(deployAxis, (d === "wing+" ? -1 : 1) * (Math.PI / 2 + 0.26) * ease(clamp01(bl / 0.6)));
        else if (d === "tape") {
          const e = ease(clamp01((bl - 0.22) / 0.6));
          p.inner.rotation.y = (Math.PI / 2) * (1 - e);
          p.inner.scale.x = 0.3 + 0.7 * e;
        }
        // dashed guide line along the approach, from the mount to the piece, fading as it seats
        const showGuide = k > 0 && k < 1;
        p.guide.visible = showGuide;
        if (showGuide) {
          const pos = p.guide.geometry.attributes.position as THREE.BufferAttribute;
          pos.setXYZ(0, p.home.x, p.home.y, p.home.z);
          pos.setXYZ(1, o.x, o.y, o.z);
          pos.needsUpdate = true;
          p.guide.computeLineDistances();
          p.guideMat.opacity = 0.6 * Math.min(1, (1 - k) * 3) * Math.min(1, k * 6);
        }
      });
    }

    // every part has landed: draw the static body as the baked mesh
    const seated = items.every((it) => it.fly >= 1);
    baked.visible = seated;
    if (seated)
      for (const pc of staticPieces) {
        pc.obj.visible = false;
        pc.guide.visible = false;
      }

    const lift = stage7(now, bl, pieces);

    /* relation lines: straight in the cloud, elbowed in the tree */
    let vi = 0;
    tmpC.copy(accent).lerp(lineIdle, smooth(t * 1.3));
    for (const tile of related) {
      const par = tile.parent!;
      const it = tile.item;
      const cP = v1.copy(tile.group.position);
      if (it && it.morph > 0) cP.lerp(v3.copy(it.tile.treePos).addScaledVector(U, 0.1), it.morph);
      const pP = v2.copy(par.group.position);
      const pts = tile.pts;
      const blend = smooth(Math.min(tile.tt, par.tt));
      // elbow route in plane coordinates
      const cx = cP.dot(R), cy = cP.y, cz = cP.dot(N);
      const px = pP.dot(R), py = pP.y, pz = pP.dot(N);
      const el: [number, number, number][] =
        tile.spec.kind === "item"
          ? (() => {
              const hw = 0.41 + (0.31 - 0.41) * (it?.morph ?? 0);
              const sx = px - 0.36;
              return [[cx - hw, cy, cz], [sx, cy, cz], [sx, py - 0.19, pz], [sx, py - 0.19, pz]];
            })()
          : tile.spec.kind === "asm"
            ? (() => {
                const bus = (cy + 0.2 + py - 0.23) / 2;
                return [[cx, cy + 0.2, cz], [cx, bus, cz], [px, bus, pz], [px, py - 0.23, pz]];
              })()
            : [[cx, cy, cz], [px, py, pz], [px, py, pz], [px, py, pz]];
      for (let k = 0; k < 4; k++) {
        const straight = v3.copy(cP).lerp(pP, k / 3);
        pts[k].copy(straight).lerp(plane(...el[k], qv), blend);
      }
      // state 2: draw in from the child toward the parent
      const f = clamp01((c - tile.draw) / 0.45);
      let len = 0;
      for (let k = 0; k < 3; k++) len += pts[k].distanceTo(pts[k + 1]);
      let left = len * f;
      let alpha = (0.55 + 0.35 * (1 - smooth(t))) * (f > 0 ? 1 : 0) * lineFade;
      if (tile.canon) alpha *= 1 - smooth((tile.tt - 0.4) / 0.5);
      if (tile.spec.kind === "item" && tile.item) alpha *= 1 - smooth(tile.item.fly * 5);
      for (let k = 0; k < 3; k++) {
        const segLen = pts[k].distanceTo(pts[k + 1]);
        const take = Math.max(0, Math.min(segLen, left));
        left -= take;
        v3.copy(pts[k]).lerp(pts[k + 1], segLen > 0 ? take / segLen : 0);
        relPos.set([pts[k].x, pts[k].y, pts[k].z, v3.x, v3.y, v3.z], vi * 3);
        const al = take > 0 ? alpha : 0;
        relCol.set([tmpC.r, tmpC.g, tmpC.b, al, tmpC.r, tmpC.g, tmpC.b, al], vi * 4);
        vi += 2;
      }
    }
    relGeo.attributes.position.needsUpdate = true;
    relGeo.attributes.color.needsUpdate = true;

    /* state 5: the change ripple */
    const battery = tileById.get(changed.id)!;
    const paths = deps.map((d) => {
      const B = battery.pts;
      const D = d.tile.pts;
      if (d.spec.parent === changed.parent) return { pts: [B[0], B[1], D[1], D[0]], via: [] as [string, number][] };
      const sa = tileById.get(changed.parent)!.pts;
      const sd = tileById.get(d.spec.parent)!.pts;
      return {
        pts: [B[0], B[1], B[2], sa[0], sa[1], sd[1], sd[0], D[2], D[1], D[0]],
        via: [[changed.parent, 3], [d.spec.parent, 6]] as [string, number][],
      };
    });
    const lens = paths.map((p) => {
      const acc = [0];
      for (let k = 1; k < p.pts.length; k++) acc.push(acc[k - 1] + p.pts[k - 1].distanceTo(p.pts[k]));
      return acc;
    });
    const Lmax = Math.max(...lens.map((l) => l[l.length - 1]));
    const P0 = 0.16;
    const PD = 0.58;
    const head = clamp01((r - P0) / PD) * Lmax;
    const fadeAll = 1 - smooth(a * 3.5);
    // the changed part: lights up as its revision flips
    itemById.get(changed.id)!.glow = smooth(r / 0.12) * fadeAll;
    asmGlow.clear();
    const segs: number[] = [];
    let affected = 0;
    const changedIt = itemById.get(changed.id)!;
    changedIt.hit = Math.sin(Math.PI * clamp01((r - 0.06) / 0.12)) * fadeAll;
    deps.forEach((d, i) => {
      const L = lens[i][lens[i].length - 1];
      const hitR = P0 + (PD * L) / Lmax;
      const up = smooth((r - hitR) / 0.03);
      const decay = 1 - 0.68 * smooth((r - hitR - 0.03) / 0.22);
      d.glow = up * decay * fadeAll;
      d.hit = Math.sin(Math.PI * clamp01((r - hitR) / 0.1)) * fadeAll;
      if (r >= hitR) affected++;
      // assemblies on the way flash as the pulse passes through them
      for (const [id, idx] of paths[i].via) {
        const g = Math.max(0, 1 - Math.abs(head - lens[i][idx]) / 0.6) * fadeAll * (r > 0 && r < 1 ? 1 : 0);
        asmGlow.set(id, Math.max(asmGlow.get(id) ?? 0, g));
      }
      // lit path up to the head
      const pts = paths[i].pts;
      const reach = Math.min(head, L);
      for (let k = 0; k < pts.length - 1 && lens[i][k] < reach; k++) {
        const segEnd = Math.min(reach, lens[i][k + 1]);
        const f = (segEnd - lens[i][k]) / Math.max(1e-6, lens[i][k + 1] - lens[i][k]);
        v1.copy(pts[k]).lerp(pts[k + 1], f);
        segs.push(pts[k].x, pts[k].y, pts[k].z, v1.x, v1.y, v1.z);
      }
      const hs = heads[i];
      const hv = r > P0 && head < L + 0.4 ? (1 - smooth((head - L) / 0.4)) * fadeAll : 0;
      hs.visible = hv > 0.01;
      if (hs.visible) {
        // head position along the path
        let k = 0;
        while (k < pts.length - 2 && lens[i][k + 1] < reach) k++;
        const f = (reach - lens[i][k]) / Math.max(1e-6, lens[i][k + 1] - lens[i][k]);
        hs.position.copy(pts[k]).lerp(pts[k + 1], clamp01(f)).addScaledVector(N, 0.05);
        (hs.material as THREE.SpriteMaterial).opacity = hv;
      }
    });
    lit.visible = segs.length > 0 && fadeAll > 0.01;
    if (lit.visible) {
      const n = Math.min(LIT_MAX, segs.length / 6);
      litArr.set(segs.length > LIT_MAX * 6 ? segs.slice(0, LIT_MAX * 6) : segs);
      litBuf.needsUpdate = true;
      litGeo.instanceCount = n;
      litMat.opacity = (1 - 0.35 * smooth((r - 0.85) / 0.15)) * fadeAll;
    }

    /* colours last, once this update's glows are known */
    for (const tile of tiles) {
      const glow = tile.item ? tile.item.glow : (asmGlow.get(tile.spec.id) ?? 0);
      const moving = tile.tt > 0 && tile.tt < 1 ? Math.sin(Math.PI * tile.tt) * 0.12 : 0;
      tmpC.copy(faceBase).lerp(faceGlow, Math.max(glow * 0.55, moving));
      faceMesh.setColorAt(tile.index, tmpC);
    }
    faceMesh.instanceColor!.needsUpdate = true;
    for (const it of items) {
      const moving = it.fly > 0 && it.fly < 1 ? Math.sin(Math.PI * it.fly) : 0;
      const hl = Math.max(it.glow, moving);
      it.edges.color.copy(edgeIdle).lerp(accent, hl);
      it.edges.opacity = (isDark ? 0.42 : 0.5) + hl * 0.45;
      // a soft halo behind a highlighted part in the tree
      const halo = it.glow * (1 - smooth(it.fly * 4)) * Math.min(1, it.morph * 2);
      it.halo.visible = halo > 0.01;
      if (it.halo.visible) {
        it.halo.position.copy(it.tile.treePos).addScaledVector(U, 0.1).addScaledVector(N, -0.35);
        it.halo.scale.setScalar(1.25);
        (it.halo.material as THREE.SpriteMaterial).opacity = halo * (isDark ? 0.5 : 0.38);
      }
    }

    // the change callout: shown through state 5, folds away as assembly starts
    calloutAlpha = smooth((r - 0.04) / 0.08) * (1 - smooth(a * 4));
    if (affected !== shownAffected) {
      shownAffected = affected;
      calloutCount.textContent = affected ? ` · ${affected} ${affected === 1 ? "part" : "parts"} affected` : "";
      labelSize.delete(callout);
    }

    labelAlpha = smooth((bl - 0.45) / 0.4);
    const shade = 0.75 + (0.12 - 0.75) * smooth(t) + (1 - 0.12) * smooth(a * 1.5);
    // higher off the floor = a fainter shadow
    floorMat.opacity = (isDark ? 0.34 : 0.16) * Math.min(1, shade) * (1 - 0.45 * lift);
    if (lite) {
      const bo = (isDark ? 0.5 : 0.22) * smooth(a * 1.4) * (1 - 0.4 * lift);
      blob.visible = bo > 0.005;
      blobMat.opacity = bo;
      blob.scale.set(2.3 + 1.2 * lift, 2.0 + 0.6 * lift, 1);
    }
    labelRise = LIFT * lift;

    if (refit) {
      if (u <= 5 || !keyFits) F = fitNow(fillAt(u));
      else {
        // hold the tree framing while its cards fold away, then one smooth glide to the finished satellite
        // (the last parts land during the glide); step 7 holds it
        const k = smooth((u - 5.4) / 0.55);
        F = {
          centre: keyFits.tree.centre.clone().lerp(keyFits.fin.centre, k),
          dist: keyFits.tree.dist + (keyFits.fin.dist - keyFits.tree.dist) * k,
        };
      }
      camera.updateProjectionMatrix();
    }
    dirty = true;
  };
  // label sizes, measured once per text change / resize (not every frame)
  const labelSize = new WeakMap<HTMLElement, [number, number]>();
  const sizeOf = (el: HTMLElement) => {
    let s = labelSize.get(el);
    if (!s) {
      s = [el.offsetWidth, el.offsetHeight];
      labelSize.set(el, s);
    }
    return s;
  };
  /** Pin a label above a scene point, kept fully inside the stage (short or narrow screens). */
  const pin = (el: HTMLElement, alpha: number) => {
    const [lw, lh] = sizeOf(el);
    let x = ((v1.x + 1) / 2) * w;
    let y = ((1 - v1.y) / 2) * h;
    x = Math.min(Math.max(x, lw / 2 + 6), w - lw / 2 - 6);
    y = Math.max(y, lh + 6);
    el.style.opacity = alpha.toFixed(3);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) translateY(${((1 - alpha) * 6).toFixed(1)}px)`;
  };
  const placeAt = (el: HTMLElement, alpha: number, at: THREE.Vector3) => {
    if (alpha <= 0.001) {
      el.style.opacity = "0";
      return;
    }
    v1.copy(at);
    root.localToWorld(v1);
    v1.project(camera);
    pin(el, alpha);
  };
  const calloutAt = plane(0, Y_TOP + 0.34, -0.3);
  const placeLabel = () => {
    placeAt(callout, calloutAlpha, calloutAt);
    if (labelAlpha <= 0.001) {
      label.style.opacity = "0";
      return;
    }
    v1.set(0, SAT_H + 0.72 + labelRise, 0);
    root.localToWorld(v1);
    v1.project(camera);
    pin(label, labelAlpha);
  };

  const drifting = () => !calm() && u < 2.75;
  const showcase = () => !calm() && u >= 6.72;
  const loop = (now: number) => {
    raf = 0;
    const ambient = drifting() || showcase();
    // watch the real frame rate while ambient motion runs on a phone; too slow → switch it off for the visit
    if (lite && ambient && lastFrameAt) {
      const gap = now - lastFrameAt;
      if (gap < 250) {
        frameEma = frameEma ? frameEma * 0.92 + gap * 0.08 : gap;
        if (++ambientFrames > 45 && frameEma > 45) {
          ambientOff = true;
          update(now, false);
        }
      }
    }
    lastFrameAt = now;
    // phones: ambient motion (cloud drift, hover, orbit dot) at ~30 fps; scroll and drag stay at full rate
    if (lite && ambient && !dirty && now - lastAmbient < 30) {
      if (visible) raf = requestAnimationFrame(loop);
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    if (ambient) {
      lastAmbient = now;
      if (showcase()) hover(now);
      else update(now, false);
    }
    const want = yawTarget(now);
    const next = still.matches ? want : yaw + (want - yaw) * (1 - Math.exp(-dt / 0.35));
    const turning = Math.abs(next - yaw) > 1e-5;
    yaw = Math.abs(want - next) < 1e-4 ? want : next;
    if (turning || dirty) {
      dirty = false;
      root.rotation.y = yaw;
      placeCamera();
      renderer.render(scene, camera);
      placeLabel();
    }
    if (visible && (showcase() || drifting() || Math.abs(want - yaw) > 1e-4 || dirty)) raf = requestAnimationFrame(loop);
    else {
      last = 0;
      lastFrameAt = 0;
    }
  };
  let lastAmbient = 0;
  let lastFrameAt = 0;
  let frameEma = 0;
  let ambientFrames = 0;
  const request = () => {
    dirty = true;
    if (!raf && visible) raf = requestAnimationFrame(loop);
  };

  const applyTheme = () => {
    accent.set(isDark ? 0x818cf8 : 0x4f46e5);
    edgeIdle.set(isDark ? 0xa8a29e : 0x57534e);
    lineIdle.set(isDark ? 0x78716c : 0x8a8480);
    litMat.color.copy(accent);
    heads.forEach((s) => (s.material as THREE.SpriteMaterial).color.copy(accent));
    items.forEach((it) => (it.halo.material as THREE.SpriteMaterial).color.copy(accent));
    faceBase.set(isDark ? 0xdedbd6 : 0xffffff);
    faceGlow.copy(faceBase).lerp(accent, 0.45);
    orbitMat.color.copy(accent);
    dotMat.color.copy(accent);
    ledMat.color.copy(accent);
    (dotHalo.material as THREE.SpriteMaterial).color.copy(accent);
    (ledHalo.material as THREE.SpriteMaterial).color.copy(accent);
    tileBodyMat.color.set(isDark ? 0xc9c5bf : 0xf4f2ee);
    bakedEdgeMat.color.copy(edgeIdle);
    bakedEdgeMat.opacity = isDark ? 0.42 : 0.5;
    pieces.forEach((p) => p.guideMat.color.set(isDark ? 0x8a8480 : 0x78716c));
    hemi.intensity = (isDark ? 0.75 : 0.95) + (lite ? 0.25 : 0); // makes up for the two lights phones skip
    update(performance.now(), false);
    request();
  };

  /* ---- reduced motion: no flying; each state appears with a short fade ---- */
  let shownState = -1;
  let fadeTimer = 0;
  const go = () => {
    if (still.matches) {
      const k = Math.min(6, Math.floor(progress * 7));
      if (k === shownState) return;
      const show = () => {
        const kk = Math.min(6, Math.floor(progress * 7));
        shownState = kk;
        u = kk + 0.99;
        update(performance.now(), true);
        request();
        canvas.style.opacity = "1";
        label.style.visibility = "";
        callout.style.visibility = "";
      };
      if (shownState < 0) return show();
      canvas.style.opacity = "0";
      label.style.visibility = "hidden";
      callout.style.visibility = "hidden";
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(show, 170);
      return;
    }
    shownState = -1;
    u = progress * 7;
    update(performance.now(), true);
    request();
  };

  /* ---- limited drag-to-rotate (horizontal only; never blocks page scrolling) ---- */
  let dragFrom: number | null = null;
  let dragStart = 0;
  const onDown = (e: PointerEvent) => {
    dragFrom = e.clientX;
    dragStart = dragYaw;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    if (dragFrom === null) return;
    dragYaw = Math.max(-1.05, Math.min(1.05, dragStart + (e.clientX - dragFrom) * 0.006));
    request();
  };
  const onUp = (e: PointerEvent) => {
    dragFrom = null;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const resize = () => {
    w = host.clientWidth;
    h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    litMat.resolution.set(w, h);
    labelSize.delete(label);
    labelSize.delete(callout);
    camera.aspect = w / h;
    fitAspect = Math.max(0.6, (w - shiftPx * 2) / h);
    keyFits = null;
    if (shiftPx > 0) camera.setViewOffset(w, h, -shiftPx, 0, w, h);
    else camera.clearViewOffset();
    update(performance.now(), true);
    request();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  // several entries can arrive in one batch after a fast jump: the last one is the current state
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) request();
  });
  io.observe(host);
  applyTheme();
  resize();

  // development only: drive the scene from the console / headless checks
  if (process.env.NODE_ENV !== "production") (window as unknown as { __sat?: unknown }).__sat = { set: (p: number) => { progress = p; go(); }, items, tiles, renderer, scene, state: () => ({ progress, u, visible, raf, dist: F.dist, ambientOff, lowEnd, lite }), frame: () => { update(performance.now(), true); renderer.render(scene, camera); return { lost: renderer.getContext().isContextLost(), calls: renderer.info.render.calls }; } };

  return {
    set(p: number) {
      const next = Math.min(1, Math.max(0, p));
      if (Math.abs(next - progress) < 1e-5) return;
      progress = next;
      go();
    },
    theme(d: boolean) {
      if (d === isDark) return;
      isDark = d;
      applyTheme();
    },
    shift(px: number) {
      const next = Math.max(0, Math.round(px));
      if (next === shiftPx) return;
      shiftPx = next;
      resize();
    },
    dispose() {
      ro.disconnect();
      io.disconnect();
      window.clearTimeout(fadeTimer);
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      atlas.dispose();
      glowTex.dispose();
      Object.values(M).forEach((m) => {
        m.dispose();
        m.map?.dispose();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
      label.remove();
      callout.remove();
    },
  };
}
