import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/i18n'
import { createTrackQrCodeSvg, downloadTrackQrCodePng, downloadTrackQrCodeSvg } from '@/core/share/qrCode'

interface ShareTrackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl: string
  shortShareUrl?: string
  isShortening?: boolean
  shortenError?: string | null
}

export const ShareTrackDialog: FC<ShareTrackDialogProps> = ({
  open,
  onOpenChange,
  shareUrl,
  shortShareUrl = '',
  isShortening = false,
  shortenError = null,
}) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrPreviewSvg, setQrPreviewSvg] = useState<string | null>(null)
  const [qrPreviewFailed, setQrPreviewFailed] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevShareUrl, setPrevShareUrl] = useState(shareUrl)
  const [prevShortShareUrl, setPrevShortShareUrl] = useState(shortShareUrl)
  const hasShortLink = Boolean(shortShareUrl)
  const copyTarget = shortShareUrl || shareUrl

  if (open !== prevOpen || shareUrl !== prevShareUrl || shortShareUrl !== prevShortShareUrl) {
    setPrevOpen(open)
    setPrevShareUrl(shareUrl)
    setPrevShortShareUrl(shortShareUrl)
    setCopied(false)
    setCopyError(null)
    setQrError(null)
    setQrPreviewSvg(null)
    setQrPreviewFailed(false)
  }

  useEffect(() => {
    if (!open || isShortening || !shortShareUrl) return

    let cancelled = false
    createTrackQrCodeSvg(shortShareUrl)
      .then((svg) => {
        if (!cancelled) {
          setQrPreviewSvg(svg)
          setQrPreviewFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrPreviewSvg(null)
          setQrPreviewFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, isShortening, shortShareUrl])

  const handleCopy = async () => {
    if (!copyTarget) return

    try {
      await navigator.clipboard.writeText(copyTarget)
      setCopied(true)
      setCopyError(null)
    } catch {
      setCopied(false)
      setCopyError(t('copyLinkError'))
    }
  }

  const handleQrDownload = async (format: 'png' | 'svg') => {
    if (!shortShareUrl) return

    try {
      setQrError(null)
      if (format === 'png') {
        await downloadTrackQrCodePng(shortShareUrl)
      } else {
        await downloadTrackQrCodeSvg(shortShareUrl)
      }
    } catch {
      setQrError(t('qrCodeError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)]">
        <DialogHeader>
          <DialogTitle>{t('shareDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('shareDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="share-track-long-url">{t('longShareLink')}</Label>
            <Input
              id="share-track-long-url"
              value={shareUrl}
              readOnly
              aria-label={t('longShareLink')}
              onFocus={(event) => event.currentTarget.select()}
            />
            <p className="text-xs text-muted-foreground">
              {t('readonlyLinkInfo')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-track-short-url">{t('shareableLink')}</Label>
            <div className="relative">
              <Input
                id="share-track-short-url"
                value={shortShareUrl}
                readOnly
                aria-label={t('shareableLink')}
                className={isShortening ? 'pr-9' : undefined}
                onFocus={(event) => event.currentTarget.select()}
              />
              {isShortening && (
                <Loader2
                  className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            {isShortening && (
              <p className="text-xs text-muted-foreground">
                {t('shortLinkCreating')}
              </p>
            )}
            {!isShortening && hasShortLink && (
              <p className="text-xs text-muted-foreground">
                {t('shortLinkCreated')}
              </p>
            )}
            {shortenError && <p className="text-xs text-destructive">{shortenError}</p>}
            {copyError && <p className="text-xs text-destructive">{copyError}</p>}
            {!isShortening && hasShortLink && (
              <div className="space-y-2 pt-1">
                <Label>{t('qrCodeSection')}</Label>
                {qrPreviewSvg && (
                  <div
                    data-qr-preview=""
                    className="flex justify-center rounded-lg border bg-white p-2 [&_svg]:h-36 [&_svg]:w-36"
                    dangerouslySetInnerHTML={{ __html: qrPreviewSvg }}
                  />
                )}
                <div className="flex justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={t('downloadQrPng')}
                    onClick={() => void handleQrDownload('png')}
                  >
                  <Download aria-hidden="true" />
                  {t('qrCodePng')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={t('downloadQrSvg')}
                    onClick={() => void handleQrDownload('svg')}
                  >
                  <Download aria-hidden="true" />
                  {t('qrCodeSvg')}
                  </Button>
                </div>
                {(qrPreviewFailed || qrError) && (
                  <p className="text-xs text-destructive">
                    {qrPreviewFailed ? t('qrCodeError') : qrError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          <Button type="button" onClick={handleCopy} disabled={!copyTarget}>
            {copied ? t('copied') : t('copyLink')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
