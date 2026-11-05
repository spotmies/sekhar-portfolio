/**
 * Fig 03 — a six-wheel rover in a CAD-style exploded view (three.js).
 *
 * Every part is built once at its ASSEMBLED mount point. Its exploded position is that mount point
 * plus an offset along the axis it mounts on (wheels slide out along their axles, decks lift
 * straight up, the front sensor bar pulls forward …), so the exploded view lines up with the
 * finished machine like an engineering drawing. `set(p)` interpolates every part between the two
 * states for an overall assembly progress p (0 = fully exploded, 1 = fully assembled).
 *
 * Craft rules from the Anatomy skill: real parts with real detail, crisp outlines, parts
 * explode along their mounting axis with guide lines back to the mount, one accent colour
 * (the parts currently moving), calm eased motion, render only when something changes.
 *
 * Axes: x forward (front of the rover at +x), y up, z to the rover's left. Ground is y = 0.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type V3 = [number, number, number];

interface Part {
  name: string;
  group: THREE.Group;
  home: THREE.Vector3;
  off: THREE.Vector3;
  order: number; // assembly sequence slot
  spin?: number; // wheels turn about their axle as they slide in
  edges: THREE.LineBasicMaterial;
  guide?: THREE.Line;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* --------------------------------------------------------------------------------------------
   Materials
   -------------------------------------------------------------------------------------------- */

function materials() {
  const std = (color: number, metalness: number, roughness: number) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  return {
    paint: std(0xf1efeb, 0.0, 0.72), // matte white ceramic/composite body panels
    alu: std(0xb9b4ac, 0.85, 0.3), // titanium / machined metal
    dark: std(0x2f2d2c, 0.5, 0.45), // graphite structure
    rubber: std(0x1d1b1a, 0.0, 0.9), // black tread
    rim: std(0x9a958e, 0.85, 0.3),
    lens: std(0x141218, 0.6, 0.15),
    gold: std(0xc8a15a, 0.85, 0.32), // foil on the electronics box
    cells: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.28, map: cellTexture(), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  };
}

/** Solar cells: deep indigo cells with silver bus bars (the site accent family). */
function cellTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c9c6c1";
  g.fillRect(0, 0, 512, 512);
  const cols = 6;
  const rows = 6;
  const gap = 6;
  const w = (512 - gap * (cols + 1)) / cols;
  const h = (512 - gap * (rows + 1)) / rows;
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

/* --------------------------------------------------------------------------------------------
   Geometry helpers
   -------------------------------------------------------------------------------------------- */

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, r);
/** A cylinder along an axis ("x" | "y" | "z"). */
function cyl(r: number, len: number, axis: "x" | "y" | "z", seg = 32, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, len, seg);
  if (axis === "x") g.rotateZ(-Math.PI / 2);
  if (axis === "z") g.rotateX(Math.PI / 2);
  return g;
}

export interface RoverHandle {
  set(progress: number): void;
  theme(dark: boolean): void;
  /** Shift the framing right by px (screen space), to leave room for the information panel. */
  shift(px: number): void;
  dispose(): void;
}

export function mountRover(host: HTMLElement, { dark }: { dark: boolean }): RoverHandle {
  const M = materials();
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);

  const parts: Part[] = [];
  const edgeIdle = new THREE.Color();
  const edgeLit = new THREE.Color();

  /** Start a part: a group at its mount point; add meshes in mount-relative coordinates. */
  function part(name: string, home: V3, off: V3, order: number, spin?: number) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...home);
    root.add(group);
    const p: Part = {
      name,
      group,
      home: new THREE.Vector3(...home),
      off: new THREE.Vector3(...off),
      order,
      spin,
      edges: new THREE.LineBasicMaterial({ color: 0x57534e, transparent: true, opacity: 0.55 }),
    };
    parts.push(p);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: V3 = [0, 0, 0], rot?: V3, edges = true) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...at);
      if (rot) mesh.rotation.set(...rot);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), p.edges));
      group.add(mesh);
      return mesh;
    };
    return { p, add };
  }

  /** A rectangular beam between two points in the plane z = const (mount-relative). */
  function beam(add: ReturnType<typeof part>["add"], a: [number, number], b: [number, number], z: number, t = 0.07, d = 0.07, mat = M.alu) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    add(rbox(len + t, t, d, 0.012), mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])]);
  }

  /* ---- 0. chassis core: the warm electronics box (the anchor; it never moves) ---- */
  {
    const { add } = part("chassis", [0, 1.05, 0], [0, 0, 0], 0);
    add(rbox(2.0, 0.46, 1.4, 0.04), M.paint);
    for (const z of [0.702, -0.702]) {
      add(rbox(1.7, 0.3, 0.012, 0.006), M.dark, [0, 0, z], undefined, false);
      for (let i = 0; i < 9; i++) for (const y of [-0.19, 0.19]) add(cyl(0.009, 0.012, "z", 8), M.alu, [-0.88 + i * 0.22, y, z * 1.006], undefined, false);
    }
    for (let i = 0; i < 9; i++) for (const z of [-0.66, 0.66]) add(cyl(0.009, 0.012, "y", 8), M.alu, [-0.88 + i * 0.22, 0.232, z], undefined, false);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) add(box(0.02, 0.44, 1.405), M.dark, [x, 0, 0], undefined, false); // panel seams
    add(rbox(0.06, 0.2, 0.9, 0.01), M.dark, [1.0, 0, 0]); // front bulkhead
    add(rbox(0.06, 0.24, 1.0, 0.01), M.dark, [-1.0, 0, 0]); // rear bulkhead
  }

  /* ---- 1. belly pan ---- */
  {
    const { add } = part("belly pan", [0, 0.8, 0], [0, -0.6, 0], 1);
    add(rbox(1.92, 0.04, 1.32, 0.015), M.dark);
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) add(box(0.05, 0.02, 1.2), M.alu, [x, -0.03, 0]);
  }

  /* ---- 2. side covers with vents ---- */
  for (const s of [1, -1]) {
    const { add } = part(`side cover ${s}`, [0, 1.05, s * 0.725], [0, 0, s * 0.45], 2);
    add(rbox(1.84, 0.38, 0.03, 0.012), M.paint);
    for (let i = 0; i < 6; i++) add(rbox(0.05, 0.2, 0.02, 0.008), M.dark, [-0.75 + i * 0.07, 0, s * 0.022]);
    for (const x of [-0.86, 0.86]) for (const y of [-0.15, 0.15]) add(cyl(0.016, 0.02, "z", 12), M.alu, [x, y, s * 0.02]);
  }

  /* ---- 3. top deck ---- */
  {
    const { add } = part("top deck", [0, 1.3, 0], [0, 0.45, 0], 3);
    add(rbox(2.2, 0.05, 1.5, 0.015), M.alu);
    add(rbox(2.1, 0.012, 1.4, 0.004), M.dark, [0, 0.03, 0], undefined, false);
    for (const x of [-1.04, 1.04]) for (const z of [-0.7, 0.7]) add(cyl(0.02, 0.02, "y", 12), M.alu, [x, 0.035, z]);
  }

  /* ---- 4. rocker arms (one per side) with their differential pivots ---- */
  const ARM_Z = 0.98;
  for (const s of [1, -1]) {
    const { add } = part(`rocker ${s}`, [0, 0, s * ARM_Z], [0, 0, s * 0.6], 4);
    add(cyl(0.085, 0.3, "z", 28), M.dark, [0.25, 1.02, -s * 0.13]); // pivot boss into the chassis
    add(cyl(0.11, 0.05, "z", 28), M.alu, [0.25, 1.02, 0]);
    beam(add, [0.25, 1.02], [1.15, 0.86], 0);
    beam(add, [0.25, 1.02], [-0.58, 0.82], 0);
    add(rbox(0.09, 0.4, 0.09, 0.015), M.alu, [1.15, 0.7, 0]); // front leg
    add(cyl(0.07, 0.12, "y", 24), M.dark, [1.15, 0.92, 0]); // steering actuator
    add(cyl(0.06, 0.06, "z", 24), M.alu, [-0.58, 0.82, 0]); // bogie pivot pin
  }

  /* ---- 5. bogies ---- */
  for (const s of [1, -1]) {
    const { add } = part(`bogie ${s}`, [0, 0, s * ARM_Z], [0, -0.08, s * 0.8], 5);
    add(cyl(0.075, 0.08, "z", 24), M.dark, [-0.58, 0.82, s * 0.03]);
    beam(add, [-0.58, 0.82], [0, 0.64], 0, 0.065, 0.065);
    beam(add, [-0.58, 0.82], [-1.15, 0.64], 0, 0.065, 0.065);
    add(rbox(0.08, 0.2, 0.08, 0.012), M.alu, [0, 0.55, 0]);
    add(rbox(0.08, 0.2, 0.08, 0.012), M.alu, [-1.15, 0.55, 0]);
    add(cyl(0.065, 0.11, "y", 24), M.dark, [-1.15, 0.7, 0]); // rear steering actuator
  }

  /* ---- 6. hub motors (six) ---- */
  const WHEEL_X = [1.15, 0, -1.15];
  const WHEEL_Y = 0.36;
  const WHEEL_Z = 1.22;
  WHEEL_X.forEach((x, i) =>
    [1, -1].forEach((s) => {
      const { add } = part(`hub ${i} ${s}`, [x, WHEEL_Y, s * (ARM_Z + 0.07)], [0, 0, s * 0.98], 6);
      add(cyl(0.12, 0.14, "z", 32), M.dark);
      add(cyl(0.145, 0.025, "z", 32), M.alu, [0, 0, -s * 0.07]);
      add(cyl(0.045, 0.24, "z", 16), M.alu, [0, 0, s * 0.12]); // axle stub
    }),
  );

  /* ---- 7. wheels (six): tyre, grousers, rim, spokes, cap ---- */
  WHEEL_X.forEach((x, i) =>
    [1, -1].forEach((s) => {
      const { p, add } = part(`wheel ${i} ${s}`, [x, WHEEL_Y, s * WHEEL_Z], [0, 0, s * 1.4], 7 + i * 0.35, s);
      // tread drum: an open band with ring sidewalls, so the rim and spokes show through
      const drum = new THREE.CylinderGeometry(0.345, 0.345, 0.3, 56, 1, true);
      drum.rotateX(Math.PI / 2);
      const treadMat = M.rubber.clone();
      treadMat.side = THREE.DoubleSide;
      add(drum, treadMat);
      for (const z of [0.15, -0.15]) {
        const wall = new THREE.RingGeometry(0.27, 0.345, 56);
        add(wall, treadMat, [0, 0, z], undefined, false);
      }
      // chevron cleats: two angled blades per station, meeting at the tread centre line
      for (let k = 0; k < 24; k++) {
        const station = new THREE.Group();
        station.rotation.z = (k / 24) * Math.PI * 2;
        for (const side of [1, -1]) {
          const cleat = new THREE.Mesh(box(0.032, 0.028, 0.165), M.rubber);
          cleat.position.set(0.358, 0, side * 0.07);
          cleat.rotation.x = side * 0.42;
          cleat.castShadow = true;
          station.add(cleat);
        }
        p.group.add(station);
      }
      // open rim with lips, inner disc, curved flexure spokes and the hub cap
      const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.31, 48, 1, true);
      rimGeo.rotateX(Math.PI / 2);
      const rimMat = M.rim.clone();
      rimMat.side = THREE.DoubleSide;
      add(rimGeo, rimMat);
      for (const z of [0.15, -0.15]) add(new THREE.TorusGeometry(0.27, 0.014, 10, 56), M.alu, [0, 0, z]);
      add(cyl(0.268, 0.02, "z", 48), M.dark, [0, 0, -s * 0.09]);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const pt = (r: number, da: number) => new THREE.Vector3(Math.cos(a + da) * r, Math.sin(a + da) * r, s * 0.12);
        const curve = new THREE.QuadraticBezierCurve3(pt(0.07, 0), pt(0.17, 0.32), pt(0.265, 0.12));
        add(new THREE.TubeGeometry(curve, 16, 0.013, 8, false), M.alu, [0, 0, 0], undefined, false);
      }
      add(cyl(0.075, 0.07, "z", 28), M.alu, [0, 0, s * 0.12]);
      add(cyl(0.04, 0.02, "z", 20), M.dark, [0, 0, s * 0.16]);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.5;
        add(cyl(0.008, 0.012, "z", 8), M.dark, [Math.cos(a) * 0.055, Math.sin(a) * 0.055, s * 0.158], undefined, false);
      }
    }),
  );

  /* ---- 8. rear power pack (finned, tilted back) ---- */
  {
    const { add } = part("power pack", [-1.2, 1.18, 0], [-0.75, 0, 0], 8);
    const tilt: V3 = [0, 0, Math.PI / 2 - 0.42];
    add(rbox(0.22, 0.12, 0.5, 0.02), M.dark, [0.1, -0.02, 0]); // mount
    add(cyl(0.15, 0.6, "y", 36), M.dark, [-0.12, 0.08, 0], tilt);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const fin = new THREE.Group();
      fin.position.set(-0.12, 0.08, 0);
      fin.rotation.set(...tilt);
      const m = new THREE.Mesh(box(0.02, 0.5, 0.12), M.alu);
      m.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
      m.rotation.y = -a;
      m.castShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), parts[parts.length - 1].edges));
      fin.add(m);
      parts[parts.length - 1].group.add(fin);
    }
  }

  /* ---- 9. front hazard-camera bar ---- */
  {
    const { add } = part("hazcam bar", [1.08, 0.94, 0], [0.62, 0, 0], 9);
    add(rbox(0.08, 0.12, 0.92, 0.015), M.dark);
    for (const z of [-0.32, -0.18, 0.18, 0.32]) {
      add(cyl(0.035, 0.06, "x", 20), M.alu, [0.06, 0, z]);
      add(cyl(0.022, 0.01, "x", 20), M.lens, [0.095, 0, z], undefined, false);
    }
  }

  /* ---- 10. solar-deck standoffs ---- */
  {
    const { add } = part("standoffs", [-0.5, 1.33, 0], [0, 1.0, 0], 10.5);
    for (const x of [-0.85, 0.85]) for (const z of [-0.85, 0.85]) {
      add(cyl(0.035, 0.28, "y", 16), M.alu, [x, 0.14, z]);
      add(cyl(0.06, 0.02, "y", 16), M.dark, [x, 0.01, z]);
    }
  }

  /* ---- 11. solar panel ---- */
  {
    const { add } = part("solar panel", [-0.5, 1.63, 0], [0, 1.4, 0], 11);
    add(rbox(1.96, 0.035, 2.06, 0.01), M.alu);
    add(box(1.88, 0.004, 1.98), M.cells, [0, 0.019, 0], undefined, false);
    for (const x of [-0.99, 0.99]) add(rbox(0.03, 0.05, 2.06, 0.008), M.dark, [x, 0.01, 0]);
    for (const z of [-0.75, 0, 0.75]) add(cyl(0.026, 0.16, "z", 16), M.alu, [-1.0, -0.005, z]); // deployment hinge
    add(cyl(0.012, 2.0, "z", 10), M.dark, [-1.0, -0.005, 0], undefined, false);
  }

  /* ---- 12. mast ---- */
  const MAST: V3 = [0.86, 1.33, 0.46];
  {
    const { add } = part("mast", MAST, [0, 1.05, 0], 12);
    add(cyl(0.1, 0.03, "y", 28), M.dark, [0, 0.015, 0]);
    add(cyl(0.045, 1.05, "y", 24), M.alu, [0, 0.55, 0]);
    add(cyl(0.065, 0.08, "y", 24), M.dark, [0, 0.45, 0]);
    add(cyl(0.06, 0.06, "y", 24), M.dark, [0, 1.06, 0]);
    // two environmental-sensor booms
    for (const s of [1, -1]) {
      add(cyl(0.012, 0.22, "z", 10), M.alu, [0, 0.62, s * 0.13]);
      add(rbox(0.05, 0.04, 0.05, 0.008), M.paint, [0, 0.62, s * 0.25]);
    }
  }

  /* ---- 13. camera head ---- */
  {
    const { add } = part("camera head", [MAST[0], MAST[1] + 1.18, MAST[2]], [0, 1.3, 0], 13);
    add(cyl(0.05, 0.36, "z", 20), M.dark, [0, -0.04, 0]); // tilt axle
    add(rbox(0.24, 0.16, 0.56, 0.025), M.paint, [0.02, 0.06, 0]);
    add(rbox(0.245, 0.012, 0.565, 0.004), M.dark, [0.02, 0.06, 0], undefined, false); // panel seam
    for (const z of [-0.2, 0.2]) {
      add(cyl(0.036, 0.08, "x", 24), M.dark, [0.16, 0.09, z]); // stereo navcams
      add(cyl(0.024, 0.01, "x", 24), M.lens, [0.205, 0.09, z], undefined, false);
    }
    for (const z of [-0.07, 0.07]) {
      add(cyl(0.055, 0.12, "x", 28), M.dark, [0.17, 0.04, z]); // zoom cameras
      add(cyl(0.04, 0.01, "x", 28), M.lens, [0.235, 0.04, z], undefined, false);
    }
    add(rbox(0.12, 0.05, 0.12, 0.01), M.dark, [0.0, 0.165, 0]);
    add(cyl(0.02, 0.05, "x", 14), M.lens, [0.075, 0.165, 0], undefined, false);
  }

  /* ---- 14. high-gain antenna ---- */
  {
    const { add } = part("antenna", [0.6, 1.33, -0.5], [0, 0.95, -0.25], 14);
    add(rbox(0.2, 0.08, 0.16, 0.012), M.paint, [0.1, 0.04, 0]); // telemetry module
    add(rbox(0.04, 0.03, 0.06, 0.006), M.dark, [0.21, 0.05, 0.04]);
    add(cyl(0.05, 0.18, "y", 20), M.alu, [0, 0.16, 0]);
    add(cyl(0.08, 0.05, "y", 20), M.dark, [0, 0.26, 0]);
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const r = (i / 16) * 0.28;
      prof.push(new THREE.Vector2(r, (r * r) / 0.5));
    }
    const dish = new THREE.LatheGeometry(prof, 40);
    const dishMat = M.paint.clone();
    dishMat.side = THREE.DoubleSide;
    add(dish, dishMat, [0.04, 0.31, 0], [0, 0, -0.55]);
    add(cyl(0.012, 0.2, "y", 10), M.dark, [0.1, 0.42, 0], [0, 0, -0.55]);
    add(cyl(0.03, 0.04, "y", 14), M.dark, [0.15, 0.51, 0], [0, 0, -0.55]);
  }

  /* ---- 15. whip antenna ---- */
  {
    const { add } = part("whip", [1.0, 1.33, -0.66], [0, 0.8, 0], 15);
    add(cyl(0.04, 0.06, "y", 16), M.dark, [0, 0.03, 0]);
    add(cyl(0.012, 0.75, "y", 10), M.alu, [0, 0.43, 0]);
    add(new THREE.SphereGeometry(0.025, 16, 12), M.dark, [0, 0.81, 0]);
  }

  /* ==== added modules ==================================================================== */
  const DECK = 1.33; // top face of the upper body deck

  /* ---- science payload under the nose (instrument box with a drill) ---- */
  {
    const { add } = part("payload", [0.72, 0.69, 0], [0.8, -0.04, 0], 1.5);
    add(rbox(0.36, 0.03, 0.48, 0.01), M.dark, [0, 0.075, 0]); // mounting flange
    add(rbox(0.34, 0.14, 0.46, 0.02), M.paint);
    add(cyl(0.05, 0.08, "x", 20), M.dark, [0.2, -0.01, 0.1]);
    add(cyl(0.032, 0.01, "x", 20), M.lens, [0.245, -0.01, 0.1], undefined, false);
    add(cyl(0.03, 0.18, "y", 16), M.alu, [0.08, -0.16, -0.12]);
    add(cyl(0.012, 0.1, "y", 10), M.dark, [0.08, -0.29, -0.12]);
    for (const z of [-0.2, 0.2]) add(cyl(0.014, 0.02, "y", 10), M.alu, [-0.14, 0.095, z]);
  }

  /* ---- thermal radiator on the rear bulkhead ---- */
  {
    const { add } = part("radiator", [-1.05, 0.96, 0], [-0.45, 0, 0], 2.5);
    add(rbox(0.03, 0.26, 1.1, 0.01), M.alu);
    for (let k = 0; k < 11; k++) add(box(0.06, 0.24, 0.012), M.alu, [-0.045, 0, -0.5 + k * 0.1]);
    add(cyl(0.025, 1.12, "z", 12), M.dark, [-0.03, -0.14, 0]); // coolant header
  }

  /* ---- battery pack on the deck ---- */
  {
    const { add } = part("battery", [-1.0, DECK, 0], [0, 0.75, 0], 9.3);
    add(rbox(0.3, 0.13, 0.92, 0.02), M.dark, [0, 0.065, 0]);
    for (const z of [-0.3, 0, 0.3]) add(rbox(0.31, 0.012, 0.025, 0.004), M.alu, [0, 0.13, z]);
    add(rbox(0.08, 0.05, 0.12, 0.01), M.paint, [0.14, 0.09, 0.36]);
  }

  /* ---- power distribution unit ---- */
  {
    const { add } = part("power distribution", [0.15, DECK, 0], [0, 0.75, 0], 9.6);
    add(rbox(0.22, 0.09, 0.32, 0.015), M.paint, [0, 0.045, 0]);
    for (const z of [-0.1, 0, 0.1]) add(rbox(0.04, 0.035, 0.05, 0.006), M.dark, [-0.12, 0.05, z]);
    add(rbox(0.04, 0.035, 0.05, 0.006), M.dark, [0.12, 0.05, 0.1]);
    for (const z of [-0.12, 0.12]) add(cyl(0.012, 0.01, "y", 10), M.alu, [0.06, 0.095, z]);
  }

  /* ---- main compute board with heatsink ---- */
  {
    const { add } = part("compute board", [-0.45, DECK, 0.38], [0, 0.82, 0], 9.8);
    for (const x of [-0.22, 0.22]) for (const z of [-0.16, 0.16]) add(cyl(0.012, 0.04, "y", 10), M.alu, [x, 0.02, z]);
    add(box(0.5, 0.02, 0.38), M.dark, [0, 0.05, 0]);
    add(rbox(0.16, 0.02, 0.16, 0.004), M.lens, [-0.06, 0.07, 0]);
    for (let k = 0; k < 8; k++) add(box(0.14, 0.06, 0.008), M.alu, [-0.06, 0.11, -0.07 + k * 0.02], undefined, false);
    add(rbox(0.06, 0.012, 0.1, 0.003), M.lens, [0.14, 0.066, -0.08]);
    add(rbox(0.06, 0.012, 0.1, 0.003), M.lens, [0.14, 0.066, 0.08]);
    add(rbox(0.04, 0.03, 0.16, 0.004), M.paint, [0.23, 0.075, 0]); // connector strip
  }

  /* ---- navigation / IMU sensor board ---- */
  {
    const { add } = part("nav board", [-0.45, DECK, -0.38], [0, 0.82, 0], 9.9);
    for (const x of [-0.22, 0.22]) for (const z of [-0.14, 0.14]) add(cyl(0.012, 0.04, "y", 10), M.alu, [x, 0.02, z]);
    add(box(0.5, 0.02, 0.34), M.dark, [0, 0.05, 0]);
    add(rbox(0.09, 0.06, 0.09, 0.01), M.paint, [-0.1, 0.09, 0]); // IMU cube
    add(rbox(0.07, 0.012, 0.07, 0.003), M.lens, [0.08, 0.066, -0.06]);
    add(rbox(0.05, 0.012, 0.05, 0.003), M.lens, [0.08, 0.066, 0.07]);
    add(rbox(0.04, 0.03, 0.14, 0.004), M.paint, [0.23, 0.075, 0]);
  }

  /* ---- wiring harness: PDU to battery, compute, nav board and mast ---- */
  {
    const { add } = part("harness", [0, DECK, 0], [0, 0.6, 0], 10.2);
    const y = 0.03;
    const runs: V3[][] = [
      [[0.03, y, 0.1], [-0.3, y, 0.12], [-0.55, y, 0.2], [-0.86, y, 0.36]],
      [[0.03, y, 0.05], [-0.1, y, 0.2], [-0.2, y, 0.38]],
      [[0.03, y, -0.05], [-0.1, y, -0.2], [-0.2, y, -0.38]],
      [[0.27, y, 0.1], [0.5, y, 0.2], [0.7, y, 0.4], [0.8, y, 0.46]],
    ];
    for (const run of runs) {
      const curve = new THREE.CatmullRomCurve3(run.map((p) => new THREE.Vector3(...p)));
      add(new THREE.TubeGeometry(curve, 40, 0.016, 8, false), M.rubber, [0, 0, 0], undefined, false);
      const end = run[run.length - 1];
      add(rbox(0.045, 0.03, 0.045, 0.006), M.alu, end);
    }
  }

  /* ---- LiDAR on a short post at the front of the deck ---- */
  {
    const { add } = part("lidar", [0.98, DECK, 0.04], [0, 1.05, 0], 13.5);
    add(cyl(0.06, 0.03, "y", 20), M.dark, [0, 0.015, 0]);
    add(cyl(0.035, 0.12, "y", 16), M.alu, [0, 0.09, 0]);
    add(cyl(0.09, 0.05, "y", 32), M.paint, [0, 0.175, 0]);
    add(cyl(0.092, 0.045, "y", 32), M.lens, [0, 0.22, 0]);
    add(cyl(0.085, 0.025, "y", 32), M.paint, [0, 0.255, 0]);
  }

  /* ---- GPS puck on the solar panel ---- */
  {
    const { add } = part("gps", [-1.22, 1.65, 0.82], [0, 1.65, 0], 11.5);
    add(cyl(0.08, 0.015, "y", 24), M.dark, [0, 0.008, 0]);
    const dome = new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    add(dome, M.paint, [0, 0.015, 0]);
  }

  /* ---- differential bar across the deck, links down to both rockers (Perseverance-style) ---- */
  {
    const { add } = part("differential", [0.52, DECK, 0], [0, 0.62, 0], 4.5);
    add(rbox(0.12, 0.06, 0.12, 0.012), M.dark, [0, 0.03, 0]); // centre pivot pedestal
    add(cyl(0.045, 0.1, "x", 20), M.alu, [0, 0.085, 0]);
    add(rbox(0.06, 0.05, 1.98, 0.012), M.alu, [0, 0.085, 0]);
    for (const s of [1, -1]) {
      add(cyl(0.03, 0.08, "x", 16), M.dark, [0, 0.085, s * 0.99]);
      // link from the bar end down to the rocker pivot boss
      const a = new THREE.Vector3(0, 0.085, s * 0.99);
      const b = new THREE.Vector3(0.25 - 0.52, 1.02 - DECK + 0.1, s * 0.99);
      const len = a.distanceTo(b);
      const link = add(rbox(0.035, len, 0.035, 0.008), M.alu, [(a.x + b.x) / 2, (a.y + b.y) / 2, a.z]);
      link.rotation.z = Math.atan2(-(b.x - a.x), b.y - a.y);
      add(cyl(0.028, 0.06, "z", 14), M.dark, [b.x, b.y, a.z]);
    }
  }

  /* ---- robotic sampling arm, stowed across the nose ---- */
  {
    const { add } = part("robotic arm", [1.14, 1.08, 0.56], [0.9, 0.05, 0], 14.5);
    add(rbox(0.1, 0.16, 0.12, 0.015), M.dark, [0, 0.0, 0]); // shoulder mount
    add(cyl(0.06, 0.1, "y", 22), M.alu, [0.07, 0.08, 0]); // azimuth joint
    add(cyl(0.055, 0.12, "x", 22), M.dark, [0.1, 0.09, 0]); // elevation joint
    add(rbox(0.07, 0.07, 0.86, 0.015), M.paint, [0.14, 0.09, -0.48]); // upper arm
    add(cyl(0.05, 0.1, "x", 22), M.dark, [0.16, 0.09, -0.93]); // elbow
    add(rbox(0.06, 0.06, 0.74, 0.012), M.paint, [0.2, 0.01, -0.58]); // forearm, folded back
    add(cyl(0.04, 0.09, "x", 20), M.dark, [0.22, 0.01, -0.2]); // wrist
    for (const z of [-0.8, -0.4, 0]) add(cyl(0.008, 0.075, "x", 8), M.alu, [0.15, 0.13, z - 0.1], undefined, false);
  }

  /* ---- arm turret: drill and surface-analysis sensors ---- */
  {
    const { add } = part("arm turret", [1.36, 1.0, 0.33], [1.25, -0.08, 0], 14.8);
    add(cyl(0.085, 0.09, "x", 28), M.alu, [0, 0.02, 0]);
    add(rbox(0.12, 0.12, 0.12, 0.015), M.paint, [0.02, -0.07, 0]);
    add(cyl(0.025, 0.14, "y", 14), M.dark, [0.02, -0.2, 0.0]); // coring drill
    add(cyl(0.01, 0.08, "y", 10), M.alu, [0.02, -0.3, 0.0]);
    add(cyl(0.03, 0.05, "x", 18), M.dark, [0.09, -0.05, 0.05]); // surface-analysis sensor
    add(cyl(0.02, 0.01, "x", 18), M.lens, [0.118, -0.05, 0.05], undefined, false);
    add(rbox(0.05, 0.05, 0.05, 0.008), M.dark, [0.06, -0.12, -0.07]);
  }

  /* ---- guide lines: dashed lines from each exploded part back to its mount ---- */
  const guideMat = new THREE.LineDashedMaterial({ color: 0x8a8480, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.6 });
  for (const p of parts) {
    if (p.off.lengthSq() < 1e-6) continue;
    const geo = new THREE.BufferGeometry().setFromPoints([p.home.clone(), p.home.clone().add(p.off)]);
    p.guide = new THREE.Line(geo, guideMat.clone());
    root.add(p.guide);
  }

  /* ---- assembly sequence: each part slot gets a window of the progress ---- */
  const slots = [...new Set(parts.map((p) => p.order))].sort((a, b) => a - b);
  const SPAN = 0.16;
  const windowOf = (order: number) => {
    const i = slots.indexOf(order);
    const start = 0.03 + (i / (slots.length - 1)) * (0.95 - SPAN - 0.03);
    return [start, start + SPAN];
  };

  /* ---- studio: an invisible floor that only catches soft shadows, three lights, reflections ---- */

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8178, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(4, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e8, 0.55);
  fill.position.set(-5, 3, 6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xdfe3ff, 0.9);
  rim.position.set(-6, 5, -6);
  scene.add(rim);

  // development only: expose the scene so the rendered objects can be inspected from the console
  if (process.env.NODE_ENV !== "production") (window as unknown as { __roverScene?: THREE.Scene }).__roverScene = scene;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  host.appendChild(canvas);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.6;

  /* ---- camera: one viewing direction; the model turns, the camera only dollies ---- */
  const UP = new THREE.Vector3(0, 1, 0);
  const camera = new THREE.PerspectiveCamera(24, 4 / 3, 0.1, 100);
  const target = new THREE.Vector3(0, 1.45, 0);
  const viewDir = new THREE.Vector3(1.0, 0.55, 1.12).normalize();
  /**
   * Fit the camera to what is actually on screen. Each part's eight home-pose corners are cached
   * once; every time the assembly moves, the corners are taken at the parts' CURRENT positions,
   * at the yaws the model turns through, projected into the camera's own axes, and the distance is
   * solved so they fill `fill` of the usable viewport. The framing therefore hugs whatever is still
   * exploded and tightens only as parts arrive, so nothing is clipped and the rover stays large.
   */
  const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), viewDir).normalize().negate();
  const camUp = new THREE.Vector3().crossVectors(viewDir, camRight).normalize();
  let homeCorners: THREE.Vector3[][] = [];
  const cacheCorners = () => {
    const keep = root.rotation.y;
    root.rotation.y = 0;
    root.updateMatrixWorld(true);
    homeCorners = parts.map((p) => {
      const b = new THREE.Box3().setFromObject(p.group);
      const shift = p.group.position.clone().sub(p.home);
      b.min.sub(shift);
      b.max.sub(shift);
      return Array.from({ length: 8 }, (_, c) => new THREE.Vector3(c & 1 ? b.max.x : b.min.x, c & 2 ? b.max.y : b.min.y, c & 4 ? b.max.z : b.min.z));
    });
    root.rotation.y = keep;
    root.updateMatrixWorld(true);
  };
  const q = new THREE.Vector3();
  const fitNow = (fill: number) => {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (const yawAt of [-0.35, 0, 0.35]) {
      parts.forEach((p, i) => {
        const dx = p.group.position.x - p.home.x;
        const dy = p.group.position.y - p.home.y;
        const dz = p.group.position.z - p.home.z;
        for (const c of homeCorners[i]) {
          q.set(c.x + dx, c.y + dy, c.z + dz).applyAxisAngle(UP, yawAt);
          xs.push(q.dot(camRight));
          ys.push(q.dot(camUp));
          zs.push(q.dot(viewDir));
        }
      });
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]);
      y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const tanV = Math.tan((camera.fov * Math.PI) / 360) * fill;
    const tanH = tanV * fitAspect;
    let dist = 0;
    for (let i = 0; i < xs.length; i++) dist = Math.max(dist, zs[i] + Math.abs(xs[i] - cx) / tanH, zs[i] + Math.abs(ys[i] - cy) / tanV);
    return { centre: new THREE.Vector3().addScaledVector(camRight, cx).addScaledVector(camUp, cy), dist };
  };
  let F = { centre: new THREE.Vector3(), dist: 10 };
  const fit = () => {
    if (!homeCorners.length) cacheCorners();
    F = fitNow(0.9 - 0.04 * progress); // exploded fills 90%, the finished rover a little less for breathing room
    camera.updateProjectionMatrix();
  };
  const placeCamera = () => {
    target.copy(F.centre).applyAxisAngle(UP, root.rotation.y);
    camera.position.copy(target).addScaledVector(viewDir, F.dist);
    camera.lookAt(target);
  };

  /* ---- state ---- */
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let progress = 0;
  let isDark = dark;
  let shiftPx = 0;
  let fitAspect = 4 / 3;
  let yaw = -0.35;
  let dragYaw = 0;
  let dirty = true;
  let visible = true;
  let raf = 0;
  let last = 0;

  /** The yaw the model should have: a slow turn with scroll, the user's drag, and a gentle sway once built. */
  const yawTarget = (now: number) => {
    const scroll = -0.35 + 0.7 * ease(progress);
    const sway = progress >= 0.999 && !still.matches ? 0.16 * Math.sin(now / 2600) : 0;
    return scroll + dragYaw + sway;
  };

  const loop = (now: number) => {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const want = yawTarget(now);
    const next = still.matches ? want : yaw + (want - yaw) * (1 - Math.exp(-dt / 0.35));
    const turning = Math.abs(next - yaw) > 1e-5;
    yaw = Math.abs(want - next) < 1e-4 ? want : next;
    if (turning || dirty) {
      dirty = false;
      root.rotation.y = yaw;
      placeCamera();
      renderer.render(scene, camera);
    }
    const showcase = progress >= 0.999 && !still.matches;
    if (visible && (showcase || Math.abs(want - yaw) > 1e-4 || dirty)) raf = requestAnimationFrame(loop);
    else last = 0;
  };
  const request = () => {
    dirty = true;
    if (!raf && visible) raf = requestAnimationFrame(loop);
  };

  const applyTheme = () => {
    edgeIdle.set(isDark ? 0xa8a29e : 0x57534e);
    edgeLit.set(isDark ? 0x818cf8 : 0x4f46e5);
    guideMat.color.set(isDark ? 0x8a8480 : 0x78716c);
    parts.forEach((p) => p.guide && (p.guide.material as THREE.LineDashedMaterial).color.copy(guideMat.color));
    hemi.intensity = isDark ? 0.75 : 0.95;
    apply();
  };

  const apply = () => {
    for (const p of parts) {
      const [a, b] = windowOf(p.order);
      const e = ease((progress - a) / (b - a));
      const k = 1 - e;
      p.group.position.copy(p.home).addScaledVector(p.off, k);
      if (p.spin) p.group.rotation.z = p.spin * k * Math.PI * 1.5;
      const moving = e > 0 && e < 1 ? Math.sin(Math.PI * e) : 0;
      p.edges.color.copy(edgeIdle).lerp(edgeLit, moving);
      p.edges.opacity = (isDark ? 0.42 : 0.5) + moving * 0.45;
      if (p.guide) {
        const pos = p.guide.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, p.home.x, p.home.y, p.home.z);
        pos.setXYZ(1, p.group.position.x, p.group.position.y, p.group.position.z);
        pos.needsUpdate = true;
        p.guide.computeLineDistances();
        (p.guide.material as THREE.LineDashedMaterial).opacity = 0.55 * Math.min(1, k * 3);
        p.guide.visible = k > 0.002;
      }
    }
    if (homeCorners.length) fit();
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
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fitAspect = Math.max(0.6, (w - shiftPx * 2) / h);
    if (shiftPx > 0) camera.setViewOffset(w, h, -shiftPx, 0, w, h);
    else camera.clearViewOffset();
    fit();
    request();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
  });
  io.observe(host);
  applyTheme();
  resize();

  return {
    set(p: number) {
      const next = Math.min(1, Math.max(0, p));
      if (Math.abs(next - progress) < 1e-5) return;
      progress = next;
      apply();
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
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      Object.values(M).forEach((m) => {
        m.dispose();
        (m as THREE.MeshStandardMaterial).map?.dispose();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
