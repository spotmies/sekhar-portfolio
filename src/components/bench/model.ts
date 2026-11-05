/**
 * The Change Bench model: a sample product (a motor-controller pod) as seven parts in three
 * assemblies, and what an engineering change on each part touches. Every number the figure shows
 * (parts touched, tasks, the ECO number, the revision letter) comes from here.
 *
 * This is demo data for the illustration, not customer data.
 */

export interface BenchPart {
  no: string; // part number, shown on the Part module's display
  name: string; // shown in the readout
  assembly: 0 | 1 | 2; // index into ASSEMBLIES
  touches: number[]; // indexes of the parts a change here touches (itself first)
  tasks: number; // tasks a change here creates
}

export const ASSEMBLIES = ["A1 Housing", "A2 Electronics", "A3 Drive"] as const;

export const PARTS: BenchPart[] = [
  { no: "P-101", name: "Enclosure", assembly: 0, touches: [0, 1, 6], tasks: 2 },
  { no: "P-102", name: "Lid", assembly: 0, touches: [1, 0], tasks: 1 },
  { no: "P-103", name: "Controller PCB", assembly: 1, touches: [2, 3, 0], tasks: 3 },
  { no: "P-104", name: "Battery pack", assembly: 1, touches: [3, 2, 0], tasks: 2 },
  { no: "P-105", name: "Motor", assembly: 2, touches: [4, 5, 2], tasks: 3 },
  { no: "P-106", name: "Motor bracket", assembly: 2, touches: [5, 4, 0, 6], tasks: 3 },
  { no: "P-107", name: "Fasteners", assembly: 0, touches: [6, 0, 5], tasks: 1 },
];

/** The part the figure rests on, and the order the idle tour visits. */
export const REST_PART = 5;
export const TOUR = [5, 2, 4, 0, 3, 1, 6];

export const FIRST_ECO = 142;
export const REVISIONS = "ABCDEFGHJKLMNPRTUVWY"; // drawing-revision letters (no I, O, Q, S, X, Z)

export const assembliesOf = (part: number) => [...new Set(PARTS[part].touches.map((index) => PARTS[index].assembly))].sort();

export const ecoLabel = (eco: number) => `ECO-${String(eco).padStart(4, "0")}`;
export const revLabel = (count: number) => REVISIONS[count % REVISIONS.length];

export function readoutOf(part: number, eco: number) {
  const p = PARTS[part];
  const n = p.touches.length;
  return `${ecoLabel(eco)} · ${p.name} · touches ${n} part${n === 1 ? "" : "s"} · ${p.tasks} task${p.tasks === 1 ? "" : "s"}`;
}

/** The resting readout (rendered on the server, before any motion). */
export const RESTING_READOUT = readoutOf(REST_PART, FIRST_ECO);
