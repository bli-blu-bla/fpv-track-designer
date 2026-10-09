/** All gate types in canonical UI order (lists, pole counter, insert dialog). */
export const GATE_TYPES = [
  'start-finish',
  'standard',
  'h-gate',
  'double-h',
  'hurdle',
  'dive',
  'double',
  'ladder',
  'flag',
  'flag-small',
  'octagonal-tunnel',
] as const;

export type GateType = (typeof GATE_TYPES)[number];

export interface GateOpening {
  id: string;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  rotation: number;
  rotationX?: number;
  reverse?: boolean;
}

/** Opening as persisted: geometry is derived from the gate type, only user state is stored. */
export type PersistedGateOpening = Pick<GateOpening, 'id'> & Partial<Omit<GateOpening, 'id'>>;

export interface Gate {
  id: string;
  type: GateType;
  position: { x: number; y: number; z: number };
  rotation: number; // degrees, continuous (0-359)
  openings: GateOpening[];
}
