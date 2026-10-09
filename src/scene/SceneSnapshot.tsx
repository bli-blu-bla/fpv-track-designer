import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'

export interface SceneSnapshotApi {
  /** Renders the track from a fixed overview angle and returns a JPEG data URL. */
  capture: () => string | null
}

const SNAPSHOT_WIDTH = 320
const SNAPSHOT_HEIGHT = 200
const SNAPSHOT_QUALITY = 0.8
const SNAPSHOT_FOV = 40

interface SceneSnapshotProps {
  fieldSize: { width: number; height: number }
  onReady: (api: SceneSnapshotApi | null) => void
}

/**
 * Exposes a capture function for gallery previews. It renders one extra frame
 * with its own camera (the user's view is untouched; the next regular frame
 * overwrites it) and crops the canvas to a fixed thumbnail size.
 */
export function SceneSnapshot({ fieldSize, onReady }: SceneSnapshotProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const capture = () => {
      const source = gl.domElement
      if (source.width === 0 || source.height === 0) return null

      const camera = new PerspectiveCamera(SNAPSHOT_FOV, source.width / source.height, 0.1, 1000)
      const span = Math.max(fieldSize.width, fieldSize.height / (SNAPSHOT_WIDTH / SNAPSHOT_HEIGHT))
      camera.position.set(0, span * 0.75, span * 0.85)
      camera.lookAt(0, 0, 0)
      gl.render(scene, camera)

      const target = document.createElement('canvas')
      target.width = SNAPSHOT_WIDTH
      target.height = SNAPSHOT_HEIGHT
      const context = target.getContext('2d')
      if (!context) return null

      // Center-crop the canvas to the thumbnail aspect ratio.
      const scale = Math.min(source.width / SNAPSHOT_WIDTH, source.height / SNAPSHOT_HEIGHT)
      const cropWidth = SNAPSHOT_WIDTH * scale
      const cropHeight = SNAPSHOT_HEIGHT * scale
      context.drawImage(
        source,
        (source.width - cropWidth) / 2,
        (source.height - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        SNAPSHOT_WIDTH,
        SNAPSHOT_HEIGHT,
      )
      return target.toDataURL('image/jpeg', SNAPSHOT_QUALITY)
    }

    onReady({ capture })
    return () => onReady(null)
  }, [gl, scene, fieldSize.width, fieldSize.height, onReady])

  return null
}
