import { useCallback, useState } from 'react'
import { useAppStore } from '@/editor/store'
import { createTrackShareUrl, getTrackShortenerEndpoint, shortenTrackShareUrl } from '@/core/share/shareTrack'
import { useTranslation } from '@/i18n'

/** Builds the viewer link for the current track and requests a short link in the background. */
export function useShareTrack() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shortShareUrl, setShortShareUrl] = useState('')
  const [isShortening, setIsShortening] = useState(false)
  const [shortenError, setShortenError] = useState<string | null>(null)

  const share = useCallback(() => {
    const { currentTrack, config } = useAppStore.getState()
    if (!currentTrack) return

    const longUrl = createTrackShareUrl(currentTrack, config, import.meta.env.VITE_VIEWER_DOMAIN)
    setShareUrl(longUrl)
    setShortShareUrl('')
    setShortenError(null)
    setIsShortening(true)
    setOpen(true)

    void shortenTrackShareUrl(longUrl, { endpoint: getTrackShortenerEndpoint() })
      .then((shortUrl) => setShortShareUrl(shortUrl))
      .catch(() => setShortenError(t('shareDialogError')))
      .finally(() => setIsShortening(false))
  }, [t])

  return { share, dialogProps: { open, onOpenChange: setOpen, shareUrl, shortShareUrl, isShortening, shortenError } }
}
