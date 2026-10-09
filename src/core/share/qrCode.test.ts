import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTrackQrCodeSvg, downloadTrackQrCodePng, downloadTrackQrCodeSvg } from './qrCode'

const { toDataURL, toString, createObjectURL, revokeObjectURL } = vi.hoisted(() => ({
  toDataURL: vi.fn(),
  toString: vi.fn(),
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
}))

vi.mock('qrcode', () => ({
  default: { toDataURL, toString },
}))

const clickedAnchors: HTMLAnchorElement[] = []

vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
  clickedAnchors.push(this)
})

Object.defineProperty(URL, 'createObjectURL', {
  value: createObjectURL,
  configurable: true,
})
Object.defineProperty(URL, 'revokeObjectURL', {
  value: revokeObjectURL,
  configurable: true,
})

describe('qrCode downloads', () => {
  beforeEach(() => {
    toDataURL.mockReset()
    toString.mockReset()
    createObjectURL.mockReset()
    revokeObjectURL.mockReset()
    clickedAnchors.length = 0
  })

  it('downloads the encoded share URL as PNG data URL file', async () => {
    toDataURL.mockResolvedValue('data:image/png;base64,qr')

    await downloadTrackQrCodePng('http://go.fpvooe.com/viMbW')

    expect(toDataURL).toHaveBeenCalledWith(
      'http://go.fpvooe.com/viMbW',
      expect.objectContaining({ errorCorrectionLevel: 'M' }),
    )
    expect(createObjectURL).not.toHaveBeenCalled()
    const anchor = clickedAnchors.at(-1)
    expect(anchor?.download).toBe('fpv-track-qr.png')
    expect(anchor?.href).toBe('data:image/png;base64,qr')
  })

  it('downloads the encoded share URL as SVG blob file and revokes the object URL', async () => {
    toString.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    createObjectURL.mockReturnValue('blob:qr-svg')

    await downloadTrackQrCodeSvg('http://go.fpvooe.com/viMbW')

    expect(toString).toHaveBeenCalledWith(
      'http://go.fpvooe.com/viMbW',
      expect.objectContaining({ type: 'svg' }),
    )
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob).toHaveProperty('type', 'image/svg+xml')
    const anchor = clickedAnchors.at(-1)
    expect(anchor?.download).toBe('fpv-track-qr.svg')
    expect(anchor?.href).toContain('blob:qr-svg')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr-svg')
  })

  it('propagates QR generation failures to the caller', async () => {
    toDataURL.mockRejectedValue(new Error('canvas unavailable'))

    await expect(downloadTrackQrCodePng('http://go.fpvooe.com/viMbW')).rejects.toThrow(
      'canvas unavailable',
    )
    expect(clickedAnchors).toHaveLength(0)
  })

  it('returns the QR svg markup for inline preview rendering', async () => {
    toString.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    await expect(createTrackQrCodeSvg('http://go.fpvooe.com/viMbW')).resolves.toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    )
    expect(toString).toHaveBeenCalledWith(
      'http://go.fpvooe.com/viMbW',
      expect.objectContaining({ type: 'svg' }),
    )
  })
})
