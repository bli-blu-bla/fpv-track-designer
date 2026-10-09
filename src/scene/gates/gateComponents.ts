import type { ComponentType } from 'react'
import type { GateType } from '@/core/types'
import type { GateComponentProps } from './gateComponentProps'
import { StandardGate } from './StandardGate'
import { HGate } from './HGate'
import { DoubleHGate } from './DoubleHGate'
import { HurdleGate } from './HurdleGate'
import { DiveGate } from './DiveGate'
import { DoubleGate } from './DoubleGate'
import { LadderGate } from './LadderGate'
import { StartFinishGate } from './StartFinishGate'
import { Flag } from './Flag'
import { FlagSmall } from './FlagSmall'
import { OctagonalTunnelGate } from './OctagonalTunnelGate'

/** 3D component per gate type; non-visual per-type data lives in `utils/gateDefinitions.ts`. */
export const GATE_COMPONENTS: Record<GateType, ComponentType<GateComponentProps>> = {
  'start-finish': StartFinishGate,
  standard: StandardGate,
  'h-gate': HGate,
  'double-h': DoubleHGate,
  hurdle: HurdleGate,
  dive: DiveGate,
  double: DoubleGate,
  ladder: LadderGate,
  flag: Flag,
  'flag-small': FlagSmall,
  'octagonal-tunnel': OctagonalTunnelGate,
}
