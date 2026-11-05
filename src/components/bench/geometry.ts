/**
 * Change Bench geometry. Every static path is built once, at module load, with the Anatomy kit
 * (./iso-kit, MIT, github.com/wheresryan22/anatomy). The live component moves pre-built groups
 * and rebuilds only the few paths whose shape changes (probe rod, stamp rod, paper tape, rev wheel).
 *
 * World units are about 1 px of the real thing: x runs left → right along the bench, y runs
 * back → front, z is up. The plate's top face is z = 0.
 */
import * as k from "./iso-kit";
import type { Plan, Plane, Point3, Projection } from "./iso-kit";
import { ASSEMBLIES, PARTS } from "./model";

export const WIDTH = 960;
export const HEIGHT = 390;

/* --------------------------------------------------------------------------------------------
   Layout
   -------------------------------------------------------------------------------------------- */

const PLATE: Plan = { x: -268, y: -74, w: 528, d: 142, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

/** Part stands: one row along x, centred on y = 0. */
export const STAND_X = PARTS.map((_, i) => -226 + 34 * i);
const STAND_TOP = 5;
const JACK_Y = -21;

/** Cable tray along the back edge. */
const TRAY: Plan = { x: -252, y: -68, w: 265, d: 17, r: 1.5 };
const LANE = (i: number) => -64.4 + 1.7 * i;
const RISER_X = 8;
const RISER_TOP = 36;

/** Gantry: two posts, a rail, a carriage with a probe arm. */
const RAIL_Z = 46;
const RAIL: Plan = { x: -262, y: -43, w: 266, d: 9, r: 1.2 };
export const PROBE_Y = 0;
export const PROBE_HEAD_Z = 43; // underside of the probe head
export const PROBE_REST = 38; // rod tip at rest

/** Rack: a base and five modules. */
const RACK: Plan = { x: 16, y: -44, w: 228, d: 80, r: 3 };
const RACK_TOP = 4;
export const MOD_X = [0, 1, 2, 3, 4].map((i) => 24 + 44 * i);
const MOD_W = 36;
const MOD_Y = -36;
const MOD_D = 62;
const MOD_TOP = 30;
const MOD_FRONT = MOD_Y + MOD_D; // 26
const JACK1_X = MOD_X[0] + 10;
const JACK1_Y = (i: number) => -27 + 6.2 * i;

/** Change-order stamp (module 4). */
const STAMP_X = MOD_X[3] + 18;
const STAMP_Y = -4;
export const STAMP_REST = 44; // underside of the stamp head at rest
export const STAMP_DOWN = 31.4; // on the ink pad
const GLAND_Z = 53;

/** Printer (module 5). */
const PRINTER: Plan = { x: MOD_X[4] + 6, y: -32, w: 24, d: 18, r: 2 };
const PRINTER_TOP = MOD_TOP + 8;
const TAPE_X0 = PRINTER.x + 3.5;
const TAPE_W = 17;
const TAPE_Y = PRINTER.y + 9;

/** Revision wheel (module 3). */
const WHEEL: Plane = [MOD_X[2] + 18, -9];
const WHEEL_R = 9;
const WHEEL_TOP = MOD_TOP + 3;

/** Assembly pins (module 2). */
const PIN_Y = [-24, -10, 4];
const PIN_X = MOD_X[1] + 12;
export const PIN_LIFT = 4;

/** How high each part's probe point is (the probe touches there, at y = PROBE_Y). */
export const PROBE_AT = [19, 13, 11.6, 15, 30, 7.2, 8.6];
export const PART_LIFT = 7;

/* --------------------------------------------------------------------------------------------
   Projection
   -------------------------------------------------------------------------------------------- */

export const P: Projection = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [RAIL.x, RAIL.y, RAIL_Z + 9],
    [RAIL.x + RAIL.w, RAIL.y, RAIL_Z + 9],
    [STAMP_X, STAMP_Y, 64],
    [TAPE_X0, TAPE_Y, PRINTER_TOP + 24],
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 67, elevation: 31 },
);

const at = (p: Point3) => k.iso(p, P);
const S = k.solidSvg;
const L = k.lineSvg;
const D = k.dotsSvg;
const byDepth = <T extends Plane>(points: T[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x: number, y: number, r: number, z: number, h: number, steps = 24, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const screws = (points: Plane[], z: number, ringR = 1.4) =>
  L(points.map(([x, y]) => k.ring(x, y, ringR, z, P, 14)).join(""), { tone: "lo" }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.45 });

/** A closed outline in the plane y = const (front faces). */
const frontRect = (x0: number, x1: number, z0: number, z1: number, y: number) =>
  k.pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);
/** A closed outline in the plane x = const (right faces). */
const sideRect = (y0: number, y1: number, z0: number, z1: number, x: number) =>
  k.pathOf([at([x, y0, z0]), at([x, y1, z0]), at([x, y1, z1]), at([x, y0, z1])], true);

/** A 3D polyline with every corner rounded by a short quadratic bend. */
function rounded(points: Point3[], radius = 3, per = 6): Point3[] {
  const out: Point3[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const lab = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const lbc = Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]);
    const r = Math.min(radius, lab * 0.48, lbc * 0.48);
    const p0 = b.map((v, j) => v + ((a[j] - v) * r) / lab) as Point3;
    const p1 = b.map((v, j) => v + ((c[j] - v) * r) / lbc) as Point3;
    for (let s = 0; s <= per; s++) {
      const t = s / per;
      out.push(p0.map((v, j) => (1 - t) * (1 - t) * v + 2 * (1 - t) * t * b[j] + t * t * p1[j]) as Point3);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** A cable: a line along a 3D route, a matching pulse overlay, and terminal dots. */
function cable(route: Point3[], pulse: string, { ends = "both", tone = "lo" as "lo" | "mid", radius = 3 } = {}) {
  const pts = rounded(route, radius).map(at);
  const d = k.pathOf(pts);
  const dot = (p: [number, number]) => `<circle class="iso-wire-end" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.1"/>`;
  return (
    `<g class="iso-wire" data-tone="${tone}">${L(d, { tone })}` +
    `<path class="bench-pulse" data-pulse="${pulse}" d="${d}"/>` +
    (ends === "both" || ends === "from" ? dot(pts[0]) : "") +
    (ends === "both" || ends === "to" ? dot(pts[pts.length - 1]) : "") +
    `</g>`
  );
}

/** Text on a module's front face, centred, clipped to its display window. */
function display(index: number, id: string, text: string) {
  const x0 = MOD_X[index] + 5;
  const x1 = MOD_X[index] + MOD_W - 5;
  const z0 = 12;
  const z1 = 21;
  const y = MOD_FRONT;
  const win = frontRect(x0, x1, z0, z1, y);
  const clip = `bench-clip-${id}`;
  const bezel = frontRect(x0 - 1.2, x1 + 1.2, z0 - 1.2, z1 + 1.2, y);
  return (
    `<path class="iso-line" data-tone="lo" d="${bezel}"/>` +
    `<clipPath id="${clip}"><path d="${win}"/></clipPath>` +
    `<path class="bench-screen" d="${win}"/>` +
    `<g clip-path="url(#${clip})"><text class="bench-screen-text" data-display="${id}" transform="${k.sideMatrix([(x0 + x1) / 2, y], 14.2, P, "left")}" font-size="5.4" text-anchor="middle">${text}</text></g>` +
    `<path class="iso-line" data-tone="mid" d="${win}"/>`
  );
}

/* --------------------------------------------------------------------------------------------
   Base: plate, feet, groove, screws, ruler, label plate
   -------------------------------------------------------------------------------------------- */

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  const feet: Plane[] = [...k.corners(PLATE, 26), [PLATE.x + PLATE.w / 2, PLATE.y + 26], [PLATE.x + PLATE.w / 2, PLATE.y + PLATE.d - 26]];
  for (const [x, y] of byDepth(feet)) {
    out.push(S(cyl(x, y, 8, -PLATE_H - FOOT_H, 1.6, 28), { tone: "lo" }));
    out.push(S(cyl(x, y, 6.2, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), { tone: "mid" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -PLATE_H + 4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  out.push(screws(k.corners(PLATE, 11), 0, 2.4));
  // ruler strip along the front edge, under the parts
  const strip: Plan = { x: -250, y: 56, w: 252, d: 8, r: 1 };
  out.push(S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.9, 0.6, [2.2, 4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 1.6, strip.y + 4, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 4, 0.6])], { size: 0.45 }));
  // label plate, front right, with the one engraved label
  const label: Plan = { x: 150, y: 46, w: 92, d: 17, r: 1.5 };
  out.push(S(slab(label, 0, 0.9, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.8), 0.9, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 6, label.y + 7.4], 0.9, P, "x"), "OPENPLAN · CHANGE BENCH", { size: 3.4, tone: "lo" }));
  out.push(
    L(
      [
        k.lineOnTop([label.x + 6, label.y + 10.6], [label.x + 56, label.y + 10.6], 0.9, P),
        k.lineOnTop([label.x + 6, label.y + 13], [label.x + 38, label.y + 13], 0.9, P),
      ].join(""),
      { tone: "faint", free: true },
    ),
  );
  out.push(D([at([label.x + label.w - 4, label.y + 4, 0.9]), at([label.x + label.w - 4, label.y + label.d - 4, 0.9])], { size: 0.45 }));
  return out.join("");
}

/* --------------------------------------------------------------------------------------------
   Tray, jacks and part cables (drawn before anything that stands in front of them)
   -------------------------------------------------------------------------------------------- */

function tray() {
  const out: string[] = [];
  out.push(S(slab(TRAY, 0, 1, 3), { tone: "lo" }));
  out.push(S(slab({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 1.8, r: 0.6 }, 1, 5.5, 2), { tone: "mid" }));
  out.push(S(slab({ x: TRAY.x, y: TRAY.y, w: 1.8, d: TRAY.d, r: 0.6 }, 1, 4, 2), { tone: "mid" }));
  out.push(D(byDepth([-230, -170, -110, -50, 0].map((x) => [x, TRAY.y + 0.9] as Plane)).map(([x, y]) => at([x, y, 6.5])), { size: 0.4 }));
  return out.join("");
}

function jacks() {
  return STAND_X.map((x) =>
    [
      S(cyl(x, JACK_Y, 3.4, 0, 1, 20), { tone: "lo" }),
      S(cyl(x, JACK_Y, 2.4, 1, 3.4, 20), { tone: "mid" }),
      L(k.knurl(x, JACK_Y, 2.4, 1.4, 4, 12, P), { tone: "faint" }),
    ].join(""),
  ).join("");
}

/** Part cable i: jack → tray lane → riser behind the rack. */
export const partRoute = (i: number): Point3[] => {
  const x = STAND_X[i];
  const lane = LANE(i);
  return [
    [x, JACK_Y, 4.4],
    [x, JACK_Y - 5, 4.4],
    [x, JACK_Y - 10, 0.9],
    [x, TRAY.y + TRAY.d, 1.6],
    [x, lane, 1.6],
    [RISER_X, lane, 1.6],
    [RISER_X, lane, RISER_TOP],
  ];
};

function partCables() {
  return PARTS.map((_, i) => cable(partRoute(i), `part-a-${i}`, { ends: "from", radius: 3.5 })).join("");
}

function trayFront() {
  const out: string[] = [];
  // end wall where the cables rise, and cable clips over the lanes
  out.push(S(slab({ x: RISER_X + 2.4, y: TRAY.y, w: 1.8, d: TRAY.d, r: 0.6 }, 1, 4, 2), { tone: "mid" }));
  for (const x of [-196, -128, -60]) {
    const clip: Plan = { x, y: TRAY.y + 1.8, w: 2.6, d: TRAY.d - 3.2, r: 0.6 };
    out.push(S(slab(clip, 2.6, 0.9, 2), { tone: "mid", crease: "none" }));
    out.push(D([at([x + 1.3, clip.y + 1.4, 3.5]), at([x + 1.3, clip.y + clip.d - 1.4, 3.5])], { size: 0.35, tone: "lo" }));
  }
  return out.join("");
}

/* --------------------------------------------------------------------------------------------
   Gantry (static half: posts and rail)
   -------------------------------------------------------------------------------------------- */

function gantry() {
  const out: string[] = [];
  for (const x of [RAIL.x + 4, RAIL.x + RAIL.w - 4]) {
    const foot: Plan = { x: x - 7, y: RAIL.y - 3, w: 14, d: 14, r: 1.5 };
    out.push(S(slab(foot, 0, 2, 3, 0.4), { tone: "mid" }));
    out.push(D(k.corners(foot, 2).map(([px, py]) => at([px, py, 2])), { size: 0.4 }));
    out.push(S(slab({ x: x - 3.5, y: RAIL.y + 1, w: 7, d: 7, r: 1 }, 2, RAIL_Z - 2, 3), { tone: "mid", inner: L(k.sideSeam({ x: x - 3.5, y: RAIL.y + 1, w: 7, d: 7, r: 1 }, 12, P, 3), { tone: "faint" }) }));
  }
  out.push(S(slab(RAIL, RAIL_Z, 7, 3, 0.5), { tone: "mid" }));
  const guide: Plan = { x: RAIL.x + 8, y: RAIL.y + 2.5, w: RAIL.w - 16, d: 4, r: 0.6 };
  out.push(S(slab(guide, RAIL_Z + 7, 1.4, 2), { tone: "lo", crease: "none" }));
  const holes: Plane[] = [];
  for (let x = guide.x + 6; x < guide.x + guide.w - 2; x += 16) holes.push([x, guide.y + 2]);
  out.push(D(holes.map(([x, y]) => at([x, y, RAIL_Z + 8.4])), { size: 0.35, tone: "lo" }));
  for (const x of [guide.x - 4, guide.x + guide.w]) out.push(S(slab({ x, y: RAIL.y + 1.5, w: 4, d: 6, r: 0.8 }, RAIL_Z + 7, 3.2, 2), { tone: "mid" }));
  // ruler on the rail's front face, ticks hanging from its top edge
  const ticks = k.sideTicks(RAIL.x + 10, RAIL.x + RAIL.w - 10, 4, 5, RAIL.y + RAIL.d, RAIL_Z + 7, [1.4, 2.6], P);
  out.push(L(ticks.minor, { tone: "faint" }), L(ticks.major, { tone: "lo" }));
  return out.join("");
}

/** The moving half of the gantry, built at x = 0 (the live code translates it along x). */
function carriage() {
  const out: string[] = [];
  const block: Plan = { x: -9, y: RAIL.y - 2, w: 18, d: 13, r: 1.6 };
  out.push(S(slab(block, RAIL_Z - 2, 13, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, RAIL_Z + 5, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(block, 2.2).map(([x, y]) => at([x, y, RAIL_Z + 11])), { size: 0.4 }));
  out.push(S(cyl(0, block.y + 5, 3.2, RAIL_Z + 11, 3, 24), { tone: "mid" }));
  out.push(L(k.knurl(0, block.y + 5, 3.2, RAIL_Z + 11.4, RAIL_Z + 14, 20, P), { tone: "lo" }));
  const arm: Plan = { x: -3, y: block.y + block.d, w: 6, d: PROBE_Y + 4 - (block.y + block.d), r: 1 };
  out.push(S(slab(arm, RAIL_Z + 4, 4, 2, 0.4), { tone: "mid" }));
  out.push(D([at([0, arm.y + 4, RAIL_Z + 8]), at([0, arm.y + arm.d - 3, RAIL_Z + 8])], { size: 0.4 }));
  return out.join("");
}

function probeHead() {
  return (
    S(cyl(0, PROBE_Y, 3.4, PROBE_HEAD_Z, RAIL_Z + 4 - PROBE_HEAD_Z, 28), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, PROBE_Y, 3.4, PROBE_HEAD_Z + 3, P, 16), { tone: "faint" }) }) +
    S(cyl(0, PROBE_Y, 2, PROBE_HEAD_Z - 1.4, 1.4, 20), { tone: "mid" })
  );
}

/** The probe rod (rebuilt per frame): from the head down to its tip at z = tip. */
export function probeRod(tip: number) {
  const top = PROBE_HEAD_Z - 1.4;
  return S(cyl(0, PROBE_Y, 0.9, tip + 1.2, top - tip - 1.2, 14), { tone: "hi", crease: "none" }) + S(cyl(0, PROBE_Y, 0.45, tip, 1.2, 10), { tone: "hi", crease: "none" });
}

/* --------------------------------------------------------------------------------------------
   The product: seven parts on stands, each with a tag plate
   -------------------------------------------------------------------------------------------- */

function stand(x: number) {
  const base: Plan = { x: x - 13, y: -13, w: 26, d: 26, r: 2 };
  const top = k.insetPlan(base, 2);
  return (
    S(slab(base, 0, 2, 4, 0.4), { tone: "mid" }) +
    S(slab(top, 2, STAND_TOP - 2, 4, 0.4), { tone: "mid" }) +
    D(k.corners(top, 1.8).map(([px, py]) => at([px, py, STAND_TOP])), { size: 0.4, tone: "lo" })
  );
}

function tag(x: number) {
  const plan: Plan = { x: x - 10, y: 19, w: 20, d: 9, r: 1 };
  return (
    S(slab(plan, 0, 0.8, 3), { tone: "lo", crease: "none" }) +
    L(k.planOutline(k.insetPlan(plan, 1.3), 0.8, P, 3), { tone: "faint" }) +
    L(
      [k.lineOnTop([x - 7, 22.2], [x + 4, 22.2], 0.8, P), k.lineOnTop([x - 7, 24.6], [x + 1, 24.6], 0.8, P)].join(""),
      { tone: "lo", free: true },
    ) +
    D([at([x + 7, 21.6, 0.8]), at([x + 7, 25.4, 0.8])], { size: 0.38 })
  );
}

const Z0 = STAND_TOP;

function enclosure(x: number) {
  const body: Plan = { x: x - 11, y: -11, w: 22, d: 22, r: 3 };
  const h = 14;
  const out = [S(slab(body, Z0, h, 6, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(body, Z0 + 4, P, 6), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(body, 2.2), Z0 + h, P, 6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(body, 3.4), Z0 + h, P, 6), { tone: "faint" }));
  out.push(D(k.corners(body, 1.1).map(([px, py]) => at([px, py, Z0 + h])), { size: 0.4 }));
  // vents: closed slots on the front face
  out.push(L([-6, -3, 0, 3, 6].map((dx) => frontRect(x + dx - 0.7, x + dx + 0.7, Z0 + 6.5, Z0 + 11.5, 11)).join(""), { tone: "lo" }));
  // cable gland on the right face
  out.push(L(k.sideRing([x + 11, 0, Z0 + 8], 2.2, "x", P, 18) + k.sideRing([x + 11, 0, Z0 + 8], 1.1, "x", P, 14), { tone: "lo" }));
  return out.join("");
}

function lid(x: number) {
  const holder: Plan = { x: x - 8, y: -8, w: 16, d: 16, r: 1.5 };
  const plan: Plan = { x: x - 11, y: -11, w: 22, d: 22, r: 3 };
  const z = Z0 + 4;
  return [
    S(slab(holder, Z0, 4, 3), { tone: "mid" }),
    S(slab(plan, z, 2.5, 6, 0.5), { tone: "hi", crease: "lo" }),
    L(k.planOutline(k.insetPlan(plan, 1.6), z + 2.5, P, 6), { tone: "faint" }),
    screws(k.corners(plan, 3), z + 2.5, 1.1),
    S(cyl(x, 0, 4.2, z + 2.5, 1.5, 32, 0.3), { tone: "hi", crease: "lo" }),
    L(k.ring(x, 0, 2.6, z + 4, P, 28), { tone: "faint" }),
  ].join("");
}

function pcb(x: number) {
  const board: Plan = { x: x - 11, y: -9, w: 22, d: 18, r: 1 };
  const z = Z0 + 4;
  const out: string[] = [];
  for (const [px, py] of byDepth(k.corners(board, 2.4))) out.push(S(cyl(px, py, 1.3, Z0, 4, 14), { tone: "mid" }));
  out.push(S(slab(board, z, 1.2, 3), { tone: "hi", crease: "lo" }));
  const top = z + 1.2;
  out.push(L(k.corners(board, 2.4).map(([px, py]) => k.ring(px, py, 1.3, top, P, 12)).join(""), { tone: "lo" }));
  // traces from the MCU to the connector and chips (each ends on a part)
  out.push(
    L(
      [
        k.onTop([[x - 4, 2.5], [x - 6.5, 2.5], [x - 6.5, 4]], top, P),
        k.onTop([[x + 4, -2], [x + 5, -2]], top, P),
        k.onTop([[x + 4, 2], [x + 5, 2]], top, P),
      ].join(""),
      { tone: "lo" },
    ),
  );
  out.push(S(slab({ x: x - 4, y: -4, w: 8, d: 8, r: 0.4 }, top, 1.4, 2), { tone: "mid" }));
  out.push(L(k.planOutline({ x: x - 3, y: -3, w: 6, d: 6, r: 0.3 }, top + 1.4, P, 2), { tone: "faint" }));
  out.push(S(slab({ x: x + 5, y: -3.5, w: 4, d: 3, r: 0.3 }, top, 1, 2), { tone: "mid" }));
  out.push(S(slab({ x: x + 5, y: 1, w: 4, d: 3, r: 0.3 }, top, 1, 2), { tone: "mid" }));
  out.push(S(slab({ x: x - 9.5, y: 4, w: 6, d: 4, r: 0.4 }, top, 2.4, 2), { tone: "mid" }));
  out.push(D(k.dotGrid(x - 7.5, -7, 6, 1, 2, top, P), { size: 0.4, tone: "hi" }));
  for (const [px, py] of byDepth([[x + 7.5, 6], [x + 4.5, 6.5]] as Plane[])) out.push(S(cyl(px, py, 1.1, top, 2.6, 14), { tone: "hi", crease: "lo" }));
  return out.join("");
}

function battery(x: number) {
  const body: Plan = { x: x - 10, y: -7, w: 20, d: 14, r: 2.5 };
  const h = 10;
  const top = Z0 + h;
  return [
    S(slab(body, Z0, h, 6, 0.6), {
      tone: "hi",
      crease: "lo",
      inner: L(k.sideSeam(body, Z0 + 2.6, P, 6) + k.sideSeam(body, Z0 + 7.4, P, 6), { tone: "faint" }),
    }),
    L(k.lineOnTop([x - 6, 3.5], [x + 2, 3.5], top, P), { tone: "faint", free: true }),
    S(cyl(x - 5, -2, 1.5, top, 1.4, 16), { tone: "mid" }),
    S(cyl(x + 5, -2, 1.5, top, 1.4, 16), { tone: "mid" }),
    L(k.lineOnTop([x + 4.2, -2], [x + 5.8, -2], top + 1.4, P) + k.lineOnTop([x + 5, -2.8], [x + 5, -1.2], top + 1.4, P) + k.lineOnTop([x - 5.8, -2], [x - 4.2, -2], top + 1.4, P), { tone: "hi" }),
  ].join("");
}

function motor(x: number) {
  const flange: Plan = { x: x - 10, y: -10, w: 20, d: 20, r: 3 };
  const out = [S(slab(flange, Z0, 2, 6, 0.5), { tone: "mid" }), screws(k.corners(flange, 2.6), Z0 + 2, 1)];
  const z = Z0 + 2;
  out.push(
    S(cyl(x, 0, 8.4, z, 14, 56, 0.5), {
      tone: "hi",
      crease: "lo",
      inner: L(k.knurl(x, 0, 8.4, z + 2.5, z + 11.5, 30, P, 0.6) + k.sideArc(x, 0, 8.4, z + 2.5, P, 30) + k.sideArc(x, 0, 8.4, z + 11.5, P, 30), { tone: "faint" }),
    }),
  );
  out.push(S(cyl(x, 0, 6, z + 14, 2, 40, 0.3), { tone: "mid" }));
  out.push(D(k.circleRing(x, 0, 4.4, 6).map(([px, py]) => at([px, py, z + 16])), { size: 0.35 }));
  out.push(S(cyl(x, 0, 1.3, z + 16, 7, 14), { tone: "hi", crease: "none", inner: L(k.rise([x + 0.4, 0.4], z + 19, z + 23, P), { tone: "faint" }) }));
  // terminal tabs on the front of the can
  for (const dx of [-2.6, 2.6]) out.push(S(slab({ x: x + dx - 0.8, y: 8, w: 1.6, d: 1.8, r: 0.3 }, z + 12, 3, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function bracket(x: number) {
  const base: Plan = { x: x - 11, y: -11, w: 22, d: 21, r: 1 };
  const upright: Plan = { x: x - 11, y: -11, w: 22, d: 2.6, r: 0.5 };
  const out = [S(slab(base, Z0, 2.2, 3, 0.4), { tone: "hi", crease: "lo" })];
  const top = Z0 + 2.2;
  out.push(L(k.ring(x - 6, 4, 2, top, P, 18) + k.ring(x + 6, 4, 2, top, P, 18), { tone: "lo" }));
  out.push(L(k.ring(x - 6, 4, 1.1, top, P, 14) + k.ring(x + 6, 4, 1.1, top, P, 14), { tone: "faint" }));
  out.push(S(slab(upright, top, 18, 2, 0.4), { tone: "hi", crease: "lo" }));
  const face = upright.y + upright.d;
  out.push(L(k.sideRing([x, face, top + 10], 4.6, "y", P, 32) + k.sideRing([x, face, top + 10], 3.2, "y", P, 28), { tone: "lo" }));
  out.push(L([[-6.4, 0], [6.4, 0], [0, 6.4], [0, -6.4]].map(([dx, dz]) => k.sideRing([x + dx, face, top + 10 + dz], 0.8, "y", P, 10)).join(""), { tone: "lo" }));
  // two gusset ribs between base and upright
  for (const dx of [-9.4, 7.8]) out.push(S(slab({ x: x + dx, y: face, w: 1.6, d: 6, r: 0.3 }, top, 6, 2), { tone: "hi", crease: "lo" }));
  return out.join("");
}

function fasteners(x: number) {
  const tray: Plan = { x: x - 11, y: -11, w: 22, d: 22, r: 2 };
  const out = [S(slab(tray, Z0, 2.4, 4, 0.4), { tone: "mid" }), L(k.planOutline(k.insetPlan(tray, 1.8), Z0 + 2.4, P, 4), { tone: "faint" })];
  const top = Z0 + 2.4;
  const spots: Plane[] = [];
  for (const dy of [-6, 0, 6]) for (const dx of [-6, 0, 6]) spots.push([x + dx, dy]);
  for (const [px, py] of byDepth(spots)) {
    const nut = (px - x + py) % 12 === 0 && px !== x;
    if (nut) {
      const hex = Array.from({ length: 6 }, (_, i) => [px + 2 * Math.cos((i * Math.PI) / 3), py + 2 * Math.sin((i * Math.PI) / 3)] as Plane);
      out.push(S(k.extrude(hex, top, 1.3, P), { tone: "hi", crease: "lo" }));
      out.push(L(k.ring(px, py, 0.9, top + 1.3, P, 12), { tone: "lo" }));
    } else {
      out.push(S(cyl(px, py, 1.8, top, 1.2, 20), { tone: "hi", crease: "lo" }));
      out.push(L(k.lineOnTop([px - 1.1, py - 0.4], [px + 1.1, py + 0.4], top + 1.2, P), { tone: "lo" }));
    }
  }
  return out.join("");
}

const PART_DRAW = [enclosure, lid, pcb, battery, motor, bracket, fasteners];

/* --------------------------------------------------------------------------------------------
   The rack: Part · Assembly · Revision · Change order · Task
   -------------------------------------------------------------------------------------------- */

function rackBase() {
  return (
    S(slab(RACK, 0, RACK_TOP, 6, 0.6), { tone: "lo", crease: "faint" }) + D(k.corners(RACK, 3).map(([x, y]) => at([x, y, RACK_TOP])), { size: 0.45 })
  );
}

function moduleBody(i: number) {
  const plan: Plan = { x: MOD_X[i], y: MOD_Y, w: MOD_W, d: MOD_D, r: 2 };
  const out = [S(slab(plan, RACK_TOP, MOD_TOP - RACK_TOP, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, MOD_TOP - 3, P, 4), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), MOD_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(plan, 1.3).map(([x, y]) => at([x, y, MOD_TOP])), { size: 0.4 }));
  // front-face screws and status LED
  const fx = MOD_X[i];
  out.push(D([at([fx + 2.6, MOD_FRONT, 7]), at([fx + MOD_W - 2.6, MOD_FRONT, 7])], { size: 0.42 }));
  out.push(`<circle class="bench-led" data-led="mod-${i}" cx="${at([fx + MOD_W - 4, MOD_FRONT, 24])[0].toFixed(1)}" cy="${at([fx + MOD_W - 4, MOD_FRONT, 24])[1].toFixed(1)}" r="1.15"/>`);
  out.push(L(k.sideRing([fx + MOD_W - 4, MOD_FRONT, 24], 1.5, "y", P, 14), { tone: "lo" }));
  // vent slots on the right face
  out.push(L([-24, -16, -8, 0, 8].map((y) => sideRect(y, y + 4, 8.5, 9.7, fx + MOD_W)).join(""), { tone: "lo" }));
  // link jacks (left: in, right: out)
  const jacks: Plane[] = [];
  if (i > 0) jacks.push([fx + 6, 17]);
  if (i < 4) jacks.push([fx + 30, 17]);
  for (const [x, y] of jacks) out.push(S(cyl(x, y, 1.6, MOD_TOP, 1.2, 16), { tone: "mid" }));
  return out.join("");
}

function partModule() {
  const out: string[] = [];
  // a jack per part, an LED beside each
  for (let i = 0; i < PARTS.length; i++) {
    const y = JACK1_Y(i);
    out.push(S(cyl(JACK1_X, y, 1.7, MOD_TOP, 1.2, 16), { tone: "mid" }));
    const led = at([JACK1_X + 8, y, MOD_TOP]);
    out.push(L(k.ring(JACK1_X + 8, y, 1.3, MOD_TOP, P, 14), { tone: "lo" }));
    out.push(`<circle class="bench-led" data-led="part-${i}" cx="${led[0].toFixed(1)}" cy="${led[1].toFixed(1)}" r="0.95"/>`);
    out.push(L(k.lineOnTop([JACK1_X + 12, y], [JACK1_X + 18, y], MOD_TOP, P), { tone: "faint", free: true }));
  }
  return out.join("");
}

function partOverhead() {
  return PARTS.map((_, i) => {
    const lane = LANE(i);
    const y = JACK1_Y(i);
    return cable(
      [
        [RISER_X, lane, RISER_TOP],
        [RISER_X + 9, lane + (y - lane) * 0.45, RISER_TOP + 3],
        [JACK1_X, y, MOD_TOP + 5],
        [JACK1_X, y, MOD_TOP + 1.2],
      ],
      `part-b-${i}`,
      { ends: "to", radius: 4 },
    );
  }).join("");
}

function assemblyModule() {
  const out: string[] = [];
  for (const y of PIN_Y) {
    out.push(S(cyl(PIN_X, y, 3.8, MOD_TOP, 0.8, 24), { tone: "lo" }));
    out.push(L(k.ring(PIN_X, y, 3, MOD_TOP + 0.8, P, 22), { tone: "faint" }));
  }
  const knob: Plane = [MOD_X[1] + 27, -16];
  out.push(S(cyl(knob[0], knob[1], 5, MOD_TOP, 4, 32), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 5, MOD_TOP + 0.4, MOD_TOP + 4, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop(knob, [knob[0] + 3.6, knob[1] + 2], MOD_TOP + 4, P), { tone: "hi" }));
  out.push(D([at([knob[0], knob[1], MOD_TOP + 4])], { size: 0.45, tone: "hi" }));
  // tick strip below the knob
  const strip: Plan = { x: MOD_X[1] + 21, y: -6, w: 12, d: 4, r: 0.5 };
  out.push(S(slab(strip, MOD_TOP, 0.5, 2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 1, strip.x + strip.w - 1, 2, 5, strip.y + 0.6, MOD_TOP + 0.5, [1.2, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

/** One assembly pin (moves up when its assembly is touched). */
const assemblyPin = (y: number) =>
  S(cyl(PIN_X, y, 2.6, MOD_TOP + 0.8, 3.2, 24, 0.3), { tone: "hi", crease: "lo" }) + L(k.ring(PIN_X, y, 1.2, MOD_TOP + 4, P, 14), { tone: "lo" });

function revisionModule() {
  const [x, y] = WHEEL;
  const out = [S(cyl(x, y, WHEEL_R + 1.4, MOD_TOP, 1, 48), { tone: "lo" })];
  out.push(S(cyl(x, y, WHEEL_R, MOD_TOP + 1, 2, 56, 0.4), { tone: "mid", inner: L(k.knurl(x, y, WHEEL_R, MOD_TOP + 1.3, WHEEL_TOP, 40, P, 0.3), { tone: "lo" }) }));
  const t = k.radialTicks(x, y, WHEEL_R - 1.2, 20, 5, WHEEL_TOP, [1.2, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.4, WHEEL_TOP, P, 14), { tone: "mid" }));
  // index mark on the module top, at the wheel's front
  const mark: Plan = { x: x - 0.8, y: y + WHEEL_R + 2, w: 1.6, d: 3, r: 0.3 };
  out.push(S(slab(mark, MOD_TOP, 1, 2), { tone: "hi", crease: "none" }));
  return out.join("");
}

/** The revision wheel's pointer (rebuilt when the revision steps; one step = 1/20 turn). */
export function wheelPointer(turn: number) {
  const [x, y] = WHEEL;
  const a = turn * Math.PI * 2;
  return k.lineOnTop([x, y], [x + Math.sin(a) * (WHEEL_R - 3.6), y + Math.cos(a) * (WHEEL_R - 3.6)], WHEEL_TOP + 0.1, P);
}

function changeModuleBack() {
  const out: string[] = [];
  const pad: Plan = { x: MOD_X[3] + 8, y: -14, w: 20, d: 20, r: 1.5 };
  out.push(S(slab(pad, MOD_TOP, 1.4, 4, 0.4), { tone: "mid" }));
  out.push(`<path class="bench-ink" d="${k.slabOf(k.insetPlan(pad, 2.4), MOD_TOP + 1.4, 0, P, 4).top}"/>`);
  out.push(L(k.planOutline(k.insetPlan(pad, 2.4), MOD_TOP + 1.4, P, 4), { tone: "lo" }));
  out.push(post(MOD_X[3] + 4));
  return out.join("");
}

const post = (x: number) =>
  S(cyl(x, STAMP_Y, 2.4, MOD_TOP, 1.4, 20), { tone: "lo" }) +
  S(cyl(x, STAMP_Y, 1.7, MOD_TOP + 1.4, 56 - MOD_TOP - 1.4, 18), { tone: "mid", crease: "none", inner: L(k.sideArc(x, STAMP_Y, 1.7, 44, P, 10), { tone: "faint" }) });

/** The stamp head, built at rest (the live code translates it along z). */
function stampHead() {
  const head: Plan = { x: STAMP_X - 8, y: STAMP_Y - 8, w: 16, d: 16, r: 1.6 };
  return (
    S(slab(head, STAMP_REST, 1.6, 4), { tone: "hi", lit: true }) +
    S(slab(k.insetPlan(head, 1.2), STAMP_REST + 1.6, 3, 4, 0.4), { tone: "hi", lit: true, inner: L(k.sideSeam(k.insetPlan(head, 1.2), STAMP_REST + 3.2, P, 4), { tone: "lit" }) }) +
    S(cyl(STAMP_X, STAMP_Y, 3, STAMP_REST + 4.6, 1.6, 24), { tone: "hi", lit: true })
  );
}

/** The stamp rod (rebuilt per frame), from the head collar up into the gland. */
export function stampRod(headBottom: number) {
  const from = headBottom + 6.2;
  return S(cyl(STAMP_X, STAMP_Y, 1.5, from, GLAND_Z - from, 16), { tone: "hi", crease: "none" });
}

function changeModuleFront() {
  const out: string[] = [post(MOD_X[3] + 32)];
  out.push(S(cyl(STAMP_X, STAMP_Y, 3.6, GLAND_Z, 3, 24), { tone: "mid", inner: L(k.sideArc(STAMP_X, STAMP_Y, 3.6, GLAND_Z + 1.4, P, 16), { tone: "faint" }) }));
  const head: Plan = { x: MOD_X[3] + 1, y: STAMP_Y - 4, w: 34, d: 8, r: 1.5 };
  out.push(S(slab(head, 56, 5, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(head, 58.5, P, 3), { tone: "faint" }) }));
  out.push(D([at([MOD_X[3] + 4, STAMP_Y, 61]), at([MOD_X[3] + 32, STAMP_Y, 61])], { size: 0.5 }));
  out.push(L(k.ring(MOD_X[3] + 4, STAMP_Y, 1.6, 61, P, 14) + k.ring(MOD_X[3] + 32, STAMP_Y, 1.6, 61, P, 14), { tone: "lo" }));
  return out.join("");
}

function taskModule() {
  const out: string[] = [];
  out.push(S(slab(PRINTER, MOD_TOP, 8, 4, 0.5), { tone: "mid", inner: L(k.sideSeam(PRINTER, MOD_TOP + 3, P, 4), { tone: "faint" }) }));
  // paper slot and tear bar on the printer top
  out.push(L(k.planOutline({ x: TAPE_X0 - 1, y: TAPE_Y - 1.2, w: TAPE_W + 2, d: 2.4, r: 0.6 }, PRINTER_TOP, P, 2), { tone: "lo" }));
  out.push(D([at([PRINTER.x + 2.4, PRINTER.y + 2.4, PRINTER_TOP]), at([PRINTER.x + PRINTER.w - 2.4, PRINTER.y + 2.4, PRINTER_TOP])], { size: 0.4 }));
  // three buttons in front of the printer
  for (const dx of [10, 18, 26]) {
    out.push(S(cyl(MOD_X[4] + dx, 4, 2, MOD_TOP, 1.4, 18, 0.3), { tone: dx === 18 ? "hi" : "mid", crease: "lo" }));
  }
  return out.join("");
}

/** The paper tape: grows out of the slot by `length`, with `lines` printed rows (rebuilt live). */
export function tape(length: number, lines: number) {
  const len = Math.max(0.6, length);
  const paper: Plan = { x: TAPE_X0, y: TAPE_Y - 0.3, w: TAPE_W, d: 0.6, r: 0.1 };
  let rows = "";
  const face = TAPE_Y + 0.3;
  for (let i = 0; i < lines; i++) {
    const z = PRINTER_TOP + len - 2.6 - i * 2.6;
    if (z < PRINTER_TOP + 1) break;
    const w = i % 3 === 0 ? 12 : i % 3 === 1 ? 9 : 13;
    rows += k.segment([TAPE_X0 + 2, face, z], [TAPE_X0 + 2 + w, face, z], P);
  }
  const bar = S(slab({ x: TAPE_X0 - 1.4, y: TAPE_Y + 0.4, w: TAPE_W + 2.8, d: 1.6, r: 0.4 }, PRINTER_TOP, 1.6, 2), { tone: "mid" });
  return S(slab(paper, PRINTER_TOP, len, 1), { tone: "hi", crease: "none", inner: rows ? L(rows, { tone: "lo", free: true }) : "" }) + bar;
}

/** Patch links between modules: Part → Assembly → Revision → Change order → Task. */
function link(i: number) {
  const a = MOD_X[i] + 30;
  const b = MOD_X[i + 1] + 6;
  return cable(
    [
      [a, 17, MOD_TOP + 1.2],
      [a, 17, MOD_TOP + 5],
      [a + 5, 17, MOD_TOP + 7.5],
      [b - 5, 17, MOD_TOP + 7.5],
      [b, 17, MOD_TOP + 5],
      [b, 17, MOD_TOP + 1.2],
    ],
    `link-${i}`,
    { tone: "mid", radius: 3 },
  );
}

/* --------------------------------------------------------------------------------------------
   Assembly
   -------------------------------------------------------------------------------------------- */

const pick = (i: number) => {
  const x = STAND_X[i];
  const hull = k.slabOf({ x: x - 16, y: -16, w: 32, d: 46, r: 2 }, 0, 36, P, 2).fill;
  return `<path class="bench-hit" data-pick="${i}" d="${hull}"/>`;
};

export const DISPLAY_TEXT = {
  part: PARTS[5].no,
  assembly: ASSEMBLIES[PARTS[5].assembly].split(" ")[0],
  revision: "REV B",
  change: "ECO 142",
  task: "TASKS 0",
};

function build() {
  const body: string[] = [];
  body.push(plate(), tray(), jacks(), partCables(), trayFront(), gantry());
  STAND_X.forEach((x, i) => {
    body.push(stand(x));
    body.push(`<g data-part="part-${i}">${PART_DRAW[i](x)}</g>`);
    body.push(tag(x));
  });
  body.push(rackBase());
  // Part module, then its overhead cables
  body.push(moduleBody(0), partModule(), display(0, "part", DISPLAY_TEXT.part), partOverhead());
  // Assembly
  body.push(moduleBody(1), assemblyModule());
  PIN_Y.forEach((y, i) => body.push(`<g data-pin="${i}">${assemblyPin(y)}</g>`));
  body.push(display(1, "assembly", DISPLAY_TEXT.assembly), link(0));
  // Revision
  body.push(moduleBody(2), revisionModule(), `<path class="iso-line" data-tone="hi" data-wheel d="${wheelPointer(0)}" data-free="end"/>`, display(2, "revision", DISPLAY_TEXT.revision), link(1));
  // Change order (the lit part): pad and far post, rod, head, near post, gland and crosshead
  body.push(moduleBody(3), changeModuleBack());
  body.push(`<g data-stamp-rod>${stampRod(STAMP_REST)}</g>`, `<g data-part="stamp">${stampHead()}</g>`, changeModuleFront(), display(3, "change", DISPLAY_TEXT.change), link(2));
  // Task
  body.push(moduleBody(4), taskModule(), `<g data-tape>${tape(4, 0)}</g>`, display(4, "task", DISPLAY_TEXT.task), link(3));
  // Gantry carriage (moves along x), then the hit areas for picking a part
  body.push(`<g data-part="carriage" transform="${k.translateAlong(P, [STAND_X[5], 0, 0])}">${carriage()}<g data-probe-rod>${probeRod(PROBE_REST)}</g>${probeHead()}</g>`);
  body.push(`<g class="bench-hits">${PARTS.map((_, i) => pick(i)).join("")}</g>`);
  return k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    className: "bench-svg",
    label:
      "An isometric change bench. On the left, a fixture plate holds the seven parts of a sample product, a motor-controller pod, each on its own stand and wired by a cable to a plan rack on the right. The rack has five modules: Part, Assembly, Revision, Change order and Task. A probe on a gantry picks a part; the change-order stamp comes down, the revision steps, and every part and task the change touches lights up.",
    body,
  });
}

export const BENCH_SVG = build();
