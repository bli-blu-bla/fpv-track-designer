import type { ThemeColors } from '@/core/types/theme'

const LINE_WIDTH = 0.06
const LINE_HEIGHT = 0.012
const COURT_INSET = 0.6
/** Reference handball court the markings are scaled from (meters). */
const REFERENCE_COURT = { length: 40, width: 20, goalAreaRadius: 6 }

interface CourtMarkingsProps {
  fieldSize: { width: number; height: number }
  lines: NonNullable<ThemeColors['courtLines']>
  unlit: boolean
}

function LineMaterial({ color, unlit }: { color: string; unlit: boolean }) {
  return unlit
    ? <meshBasicMaterial color={color} toneMapped={false} fog={false} />
    : <meshStandardMaterial color={color} roughness={0.7} metalness={0} />
}

/** Straight line segment on the floor from (x1, z1) to (x2, z2). */
function Segment({ from, to, color, unlit }: { from: [number, number]; to: [number, number]; color: string; unlit: boolean }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]

  return (
    <mesh
      position={[(from[0] + to[0]) / 2, LINE_HEIGHT, (from[1] + to[1]) / 2]}
      rotation={[-Math.PI / 2, 0, -Math.atan2(dz, dx)]}
    >
      <planeGeometry args={[Math.hypot(dx, dz) + LINE_WIDTH, LINE_WIDTH]} />
      <LineMaterial color={color} unlit={unlit} />
    </mesh>
  )
}

/** Circle or arc on the floor; angles follow the x axis towards -z (counter-clockwise seen from above). */
function Arc({ center, radius, start = 0, length = Math.PI * 2, color, unlit }: {
  center: [number, number]
  radius: number
  start?: number
  length?: number
  color: string
  unlit: boolean
}) {
  return (
    <mesh position={[center[0], LINE_HEIGHT, center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - LINE_WIDTH / 2, radius + LINE_WIDTH / 2, 64, 1, start, length]} />
      <LineMaterial color={color} unlit={unlit} />
    </mesh>
  )
}

function Rectangle({ halfWidth, halfDepth, color, unlit }: { halfWidth: number; halfDepth: number; color: string; unlit: boolean }) {
  const corners: [number, number][] = [[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth]]

  return (
    <>
      {corners.map((corner, index) => (
        <Segment key={index} from={corner} to={corners[(index + 1) % corners.length]} color={color} unlit={unlit} />
      ))}
    </>
  )
}

/** Gym-floor court lines scaled to the field: handball court, centre circle and centre spot. */
export function CourtMarkings({ fieldSize, lines, unlit }: CourtMarkingsProps) {
  const halfWidth = fieldSize.width / 2 - COURT_INSET
  const halfDepth = fieldSize.height / 2 - COURT_INSET
  if (halfWidth <= 1 || halfDepth <= 1) return null

  const scale = Math.min((halfWidth * 2) / REFERENCE_COURT.length, (halfDepth * 2) / REFERENCE_COURT.width)
  const goalRadius = Math.min(REFERENCE_COURT.goalAreaRadius * scale, halfDepth * 0.8)
  const centerRadius = Math.min(halfDepth * 0.3, 3)

  return (
    <group>
      <Rectangle halfWidth={halfWidth} halfDepth={halfDepth} color={lines.main} unlit={unlit} />
      <Segment from={[0, -halfDepth]} to={[0, halfDepth]} color={lines.main} unlit={unlit} />
      <Arc center={[0, 0]} radius={centerRadius} color={lines.main} unlit={unlit} />
      <Arc center={[halfWidth, 0]} radius={goalRadius} start={Math.PI / 2} length={Math.PI} color={lines.main} unlit={unlit} />
      <Arc center={[-halfWidth, 0]} radius={goalRadius} start={-Math.PI / 2} length={Math.PI} color={lines.main} unlit={unlit} />
      <mesh position={[0, LINE_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 24]} />
        <LineMaterial color={lines.accent} unlit={unlit} />
      </mesh>
    </group>
  )
}
