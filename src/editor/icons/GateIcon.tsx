import type { ReactElement, SVGProps } from 'react'
import type { GateType } from '@/core/types'

/**
 * Visual silhouettes of each gate type, rendered in lucide-react's icon
 * convention so they compose with `className="size-4 text-*"` etc.
 *
 * Each silhouette is derived directly from the 3D geometry in
 * `src/components/gates/*Gate.tsx`:
 *
 * - Posts/crossbars are 1.2m, stacks are 1.2m apart, h-gate backrest is +1.02m,
 *   the start-finish gate has a sign panel on top, the flag is just a 2m pole
 *   with a small plate, the small flag is a 1m pole with a proportionally
 *   smaller plate, and the octagonal tunnel is a flat-bottom regular
 *   octagon (with an inset octagon hinting at the tunnel depth).
 *
 * View is a clean front-view (or 3/4 isometric for the dive cube) so the
 * silhouette stays recognisable at 16px (`size-4`).
 */
type GateIconProps = SVGProps<SVGSVGElement> & {
  type: GateType
}

const GATE_PATHS: Record<GateType, ReactElement> = {
  // Standard gate: 2 vertical posts + top crossbar (open bottom).
  standard: (
    <>
      <line x1="6" y1="7" x2="18" y2="7" />
      <line x1="6" y1="7" x2="6" y2="22" />
      <line x1="18" y1="7" x2="18" y2="22" />
    </>
  ),
  // h-gate: standard frame + one post extends upward (backrest) on the right.
  'h-gate': (
    <>
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="9" x2="6" y2="22" />
      <line x1="18" y1="2" x2="18" y2="22" />
    </>
  ),
  // double-h: bottom standard frame + top h-gate frame stacked.
  'double-h': (
    <>
      <line x1="6" y1="16" x2="18" y2="16" />
      <line x1="6" y1="10" x2="18" y2="10" />
      <line x1="6" y1="10" x2="6" y2="22" />
      <line x1="18" y1="3" x2="18" y2="22" />
    </>
  ),
  hurdle: (
    <>
      <rect x="5" y="14" width="14" height="8" />
      <line x1="5" y1="5" x2="5" y2="22" />
      <line x1="19" y1="5" x2="19" y2="22" />
    </>
  ),
  // dive: cube frame with depth (3/4 isometric), open bottom.
  dive: (
    <>
      {/* Front frame (open bottom) */}
      <line x1="4" y1="11" x2="16" y2="11" />
      <line x1="4" y1="11" x2="4" y2="22" />
      <line x1="16" y1="11" x2="16" y2="22" />
      {/* Back frame (offset up-right, open bottom) */}
      <line x1="9" y1="6" x2="21" y2="6" />
      <line x1="9" y1="6" x2="9" y2="17" />
      <line x1="21" y1="6" x2="21" y2="17" />
      {/* Depth connectors at top corners */}
      <line x1="4" y1="11" x2="9" y2="6" />
      <line x1="16" y1="11" x2="21" y2="6" />
    </>
  ),
  // double: two identical standard frames stacked.
  double: (
    <>
      <line x1="6" y1="15" x2="18" y2="15" />
      <line x1="6" y1="8" x2="18" y2="8" />
      <line x1="6" y1="8" x2="6" y2="22" />
      <line x1="18" y1="8" x2="18" y2="22" />
    </>
  ),
  // ladder: three identical frames stacked (tallest gate).
  ladder: (
    <>
      <line x1="6" y1="17" x2="18" y2="17" />
      <line x1="6" y1="11" x2="18" y2="11" />
      <line x1="6" y1="5" x2="18" y2="5" />
      <line x1="6" y1="5" x2="6" y2="22" />
      <line x1="18" y1="5" x2="18" y2="22" />
    </>
  ),
  // start-finish: standard frame + sign panel on top with "S" indicator.
  'start-finish': (
    <>
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="9" x2="6" y2="22" />
      <line x1="18" y1="9" x2="18" y2="22" />
      <rect x="9" y="3" width="6" height="6" rx="0.5" />
    </>
  ),
  // flag: tall vertical pole + small flag plate near top on the right.
  flag: (
    <>
      <line x1="9" y1="2" x2="9" y2="22" />
      <rect x="9" y="3" width="9" height="6" />
    </>
  ),
  // flag-small: standard-height pole + proportionally smaller flag plate on top of it.
  'flag-small': (
    <>
      <line x1="9" y1="7" x2="9" y2="22" />
      <rect x="9" y="7" width="8" height="5" />
    </>
  ),
  // octagonal-tunnel: flat-bottom regular octagon + inset octagon for depth hint.
  'octagonal-tunnel': (
    <>
      <polygon points="20,10 15,5 9,5 4,10 4,16 9,21 15,21 20,16" />
      <polygon
        points="21,11 17,8 12,8 8,11 8,15 12,18 17,18 21,15"
        opacity="0.5"
      />
    </>
  ),
}

export function GateIcon({ type, ...props }: GateIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {GATE_PATHS[type]}
    </svg>
  )
}
