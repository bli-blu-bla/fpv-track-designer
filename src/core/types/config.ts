import type { GateType } from './gate';
import type { GroundId, QualityId, SkyId } from './theme';

export const SNAP_GRID_SIZES = [0.3, 0.5, 1] as const;
export type SnapGridSize = (typeof SNAP_GRID_SIZES)[number];

export interface Config {
  gateQuantities: Record<GateType, number>;
  fieldSize: { width: number; height: number };
  snapGatesToGrid: boolean;
  snapGridSize: SnapGridSize;
  showGrid: boolean;
  showFlightPath: boolean;
  showOpeningLabels: boolean;
  sky: SkyId;
  ground: GroundId;
  quality: QualityId;
}
