import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareTrackDialog } from './ShareTrackDialog'
import { createTrackQrCodeSvg, downloadTrackQrCodePng, downloadTrackQrCodeSvg } from '@/core/share/qrCode'

vi.mock('@/core/share/qrCode', () => ({
  downloadTrackQrCodePng: vi.fn(),
  downloadTrackQrCodeSvg: vi.fn(),
  createTrackQrCodeSvg: vi.fn(),
}))

const writeText = vi.fn<(_: string) => Promise<void>>()
const downloadQrPng = vi.mocked(downloadTrackQrCodePng)
const downloadQrSvg = vi.mocked(downloadTrackQrCodeSvg)
const createQrSvg = vi.mocked(createTrackQrCodeSvg)

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
})

describe('ShareTrackDialog', () => {
  beforeEach(() => {
    writeText.mockReset()
    writeText.mockResolvedValue(undefined)
    downloadQrPng.mockReset()
    downloadQrPng.mockResolvedValue(undefined)
    downloadQrSvg.mockReset()
    downloadQrSvg.mockResolvedValue(undefined)
    createQrSvg.mockReset()
    createQrSvg.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  })

  it('shows the long share URL in a readonly input', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    expect(screen.getByText('Track teilen')).not.toBeNull()
    expect(screen.getByLabelText('Langer Link')).toHaveProperty('readOnly', true)
    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByText('Der Track öffnet sich über diesen Link im reinen Ansichtsmodus.')).not.toBeNull()
  })

  it('copies the link and shows feedback', async () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://sharedtrack.fpvooe.com/#abc'))
    expect(screen.getByRole('button', { name: 'Kopiert!' })).not.toBeNull()
  })

  it('shows shortener loading feedback while keeping the long link usable', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        isShortening
      />,
    )

    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByLabelText('Teilbarer Link')).toHaveProperty('value', '')
    expect(screen.getByText(/Kurzlink wird erstellt/)).not.toBeNull()
  })

  it('shows successful short-link feedback without replacing the long link', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl="http://go.fpvooe.com/viMbW"
      />,
    )

    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByDisplayValue('http://go.fpvooe.com/viMbW')).not.toBeNull()
    expect(screen.getByText('Kurzlink erstellt.')).not.toBeNull()
  })

  it('shows shortener errors while keeping the current link copyable', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortenError="Der Kurzlink konnte nicht erstellt werden."
      />,
    )

    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByText('Der Kurzlink konnte nicht erstellt werden.')).not.toBeNull()
  })

  it('closes via the Schließen button', () => {
    const onOpenChange = vi.fn()

    render(
      <ShareTrackDialog
        open
        onOpenChange={onOpenChange}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not show QR downloads without a short link', () => {
    const { rerender } = render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        isShortening
      />,
    )

    expect(screen.queryByRole('button', { name: 'QR-Code als PNG herunterladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'QR-Code als SVG herunterladen' })).toBeNull()

    rerender(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl=""
      />,
    )

    expect(screen.queryByRole('button', { name: 'QR-Code als PNG herunterladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'QR-Code als SVG herunterladen' })).toBeNull()
  })

  it('downloads the short link QR code as PNG', async () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl="http://go.fpvooe.com/viMbW"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'QR-Code als PNG herunterladen' }))

    await waitFor(() => expect(downloadQrPng).toHaveBeenCalledWith('http://go.fpvooe.com/viMbW'))
    expect(downloadQrSvg).not.toHaveBeenCalled()
  })

  it('downloads the short link QR code as SVG', async () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl="http://go.fpvooe.com/viMbW"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'QR-Code als SVG herunterladen' }))

    await waitFor(() => expect(downloadQrSvg).toHaveBeenCalledWith('http://go.fpvooe.com/viMbW'))
    expect(downloadQrPng).not.toHaveBeenCalled()
  })

  it('shows an error when the QR download fails', async () => {
    downloadQrPng.mockRejectedValueOnce(new Error('boom'))
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl="http://go.fpvooe.com/viMbW"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'QR-Code als PNG herunterladen' }))

    await waitFor(() =>
      expect(screen.getByText('Der QR-Code konnte nicht erstellt werden.')).not.toBeNull(),
    )
  })

  it('renders the QR code preview for the short link above the download buttons', async () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl="http://go.fpvooe.com/viMbW"
      />,
    )

    await waitFor(() => expect(createQrSvg).toHaveBeenCalledWith('http://go.fpvooe.com/viMbW'))
    const preview = document.querySelector('[data-qr-preview]')
    expect(preview).not.toBeNull()
    expect(preview?.querySelector('svg')).not.toBeNull()
  })

  it('shows the QR error message when the preview cannot be generated', async () => {
    createQrSvg.mockRejectedValueOnce(new Error('boom'))
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortShareUrl="http://go.fpvooe.com/viMbW"
      />,
    )

    await waitFor(() =>
      expect(screen.getByText('Der QR-Code konnte nicht erstellt werden.')).not.toBeNull(),
    )
    expect(document.querySelector('[data-qr-preview]')).toBeNull()
  })
})
