import { useCallback, useState } from 'react'
import { useAppStore } from '@/editor/store'
import { createShare } from '@/core/api/shares'
import { isApiError } from '@/core/api/http'
import { encodeCompactTrack } from '@/core/schemas/compactTrack.schema'
import { createTrackShareUrl } from '@/core/share/shareTrack'
import { buildShareUrl } from '@/core/share/viewerRoute'
import { useTranslation } from '@/i18n'

/** Builds the inline `#c.` viewer link and requests a `/s/<id>` short link from PocketBase in the background. */
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

    const viewerDomain = import.meta.env.VITE_VIEWER_DOMAIN
    setShareUrl(createTrackShareUrl(currentTrack, config, viewerDomain))
    setShortShareUrl('')
    setShortenError(null)
    setIsShortening(true)
    setOpen(true)

    void createShare(encodeCompactTrack(currentTrack, config))
      .then(({ id }) => setShortShareUrl(buildShareUrl(id, viewerDomain)))
      .catch((error: unknown) => {
        const rateLimited = isApiError(error) && error.kind === 'rate-limited'
        setShortenError(t(rateLimited ? 'shareDialogRateLimited' : 'shareDialogError'))
      })
      .finally(() => setIsShortening(false))
  }, [t])

  return { share, dialogProps: { open, onOpenChange: setOpen, shareUrl, shortShareUrl, isShortening, shortenError } }
}
