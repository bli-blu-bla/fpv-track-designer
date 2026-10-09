import QRCode from 'qrcode'

const QR_CODE_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 512,
  color: { dark: '#000000ff', light: '#ffffffff' },
} as const

const triggerDownload = (href: string, fileName: string, cleanup?: () => void): void => {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  cleanup?.()
}

export const downloadTrackQrCodePng = async (shareUrl: string): Promise<void> => {
  const dataUrl = await QRCode.toDataURL(shareUrl, QR_CODE_OPTIONS)
  triggerDownload(dataUrl, 'fpv-track-qr.png')
}

export const createTrackQrCodeSvg = async (shareUrl: string): Promise<string> =>
  QRCode.toString(shareUrl, { ...QR_CODE_OPTIONS, type: 'svg' })

export const downloadTrackQrCodeSvg = async (shareUrl: string): Promise<void> => {
  const svg = await createTrackQrCodeSvg(shareUrl)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  triggerDownload(url, 'fpv-track-qr.svg', () => URL.revokeObjectURL(url))
}
