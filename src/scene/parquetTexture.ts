import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** Meters of floor covered by one texture tile. */
export const PARQUET_TILE_METERS = 4

const SIZE = 512
const COLUMN_WIDTH = 32
const ROW_STEP = 16
// Warm oak tones; slightly saturated because ACES tone mapping and scene light wash wood out.
const WOOD_TONES = ['#A9713D', '#9E6634', '#B37A45', '#966030', '#A56D3A', '#8D592B', '#B07644']

/** Deterministic per-plank pseudo random value in [0, 1). */
function hash(column: number, row: number): number {
  const value = Math.sin(column * 127.1 + row * 311.7) * 43758.5453
  return value - Math.floor(value)
}

/** Two faint grain streaks along the plank. */
function drawGrain(context: CanvasRenderingContext2D, x: number, y: number, slope: number, seed: number) {
  context.save()
  context.clip()
  context.strokeStyle = 'rgba(90, 52, 20, 0.22)'
  for (const offset of [ROW_STEP * (0.3 + seed * 0.2), ROW_STEP * (0.65 + seed * 0.2)]) {
    context.beginPath()
    context.moveTo(x, y + offset)
    context.lineTo(x + COLUMN_WIDTH, y + offset - slope * COLUMN_WIDTH)
    context.stroke()
  }
  context.restore()
}

let cached: CanvasTexture | null = null

/**
 * Seamless herringbone-style (chevron) oak parquet drawn on a canvas.
 * Columns alternate the plank direction; plank colors vary slightly.
 */
export function getParquetTexture(): CanvasTexture {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')

  if (context) {
    context.lineWidth = 1
    context.strokeStyle = 'rgba(74, 42, 14, 0.7)'
    const columns = SIZE / COLUMN_WIDTH
    const rows = SIZE / ROW_STEP

    for (let column = 0; column < columns; column += 1) {
      const x = column * COLUMN_WIDTH
      const slope = column % 2 === 0 ? 1 : -1

      for (let row = 0; row < rows; row += 1) {
        const tone = WOOD_TONES[Math.floor(hash(column, row) * WOOD_TONES.length)]
        // Draw each plank three times (-SIZE, 0, +SIZE) so planks crossing the edge wrap seamlessly.
        for (const wrap of [-SIZE, 0, SIZE]) {
          const y = row * ROW_STEP + wrap + (slope > 0 ? COLUMN_WIDTH : 0)
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(x + COLUMN_WIDTH, y - slope * COLUMN_WIDTH)
          context.lineTo(x + COLUMN_WIDTH, y - slope * COLUMN_WIDTH + ROW_STEP)
          context.lineTo(x, y + ROW_STEP)
          context.closePath()
          context.fillStyle = tone
          context.fill()
          drawGrain(context, x, y, slope, hash(row, column))
          context.stroke()
        }
      }
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  cached = texture
  return texture
}
