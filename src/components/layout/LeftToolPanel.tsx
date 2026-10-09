import type { FC } from 'react'
import { useState, useCallback } from 'react'
import { Dice5, Save, Settings2, GalleryVertical, Share2, Palette } from 'lucide-react'
import { useAppStore } from '@/store'
import { generateTrack } from '@/utils/generator'
import { extractGenerationConfig } from '@/utils/generationConfig'
import { createTrackShareUrl, getTrackShortenerEndpoint, shortenTrackShareUrl } from '@/utils/shareTrack'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SaveTrackDialog } from '@/components/ui/SaveTrackDialog'
import { ShareTrackDialog } from '@/components/ui/ShareTrackDialog'
import { useTranslation } from '@/i18n'

interface LeftToolPanelProps {
  onSaveClick?: () => void
  onGalleryClick?: () => void
  onSettingsClick?: () => void
  onDesignClick?: () => void
}

export const LeftToolPanel: FC<LeftToolPanelProps> = ({
  onSaveClick,
  onGalleryClick,
  onSettingsClick,
  onDesignClick,
}) => {
  const { t } = useTranslation()
  const config = useAppStore((state) => state.config)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)

  const [saveOpen, setSaveOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shortShareUrl, setShortShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const handleShuffle = useCallback(() => {
    void requestDestructiveAction('shuffle').then((proceed) => {
      if (proceed) setTrack(generateTrack(config), extractGenerationConfig(config))
    })
  }, [config, requestDestructiveAction, setTrack])

  const handleSaveClick = useCallback(() => {
    if (onSaveClick) {
      onSaveClick()
    } else {
      setSaveOpen(true)
    }
  }, [onSaveClick])

  const handleGalleryClick = useCallback(() => {
    onGalleryClick?.()
  }, [onGalleryClick])

  const handleShareClick = useCallback(() => {
    if (!currentTrack) return

    const longUrl = createTrackShareUrl(currentTrack, config, import.meta.env.VITE_VIEWER_DOMAIN)
    setShareUrl(longUrl)
    setShortShareUrl('')
    setShareError(null)
    setShareLoading(true)
    setShareOpen(true)

    void shortenTrackShareUrl(longUrl, { endpoint: getTrackShortenerEndpoint() })
      .then((shortUrl) => {
        setShortShareUrl(shortUrl)
        setShareError(null)
      })
      .catch(() => {
        setShareError(t('shareDialogError'))
      })
      .finally(() => {
        setShareLoading(false)
      })
  }, [config, currentTrack, t])

  const handleSettingsClick = useCallback(() => {
    onSettingsClick?.()
  }, [onSettingsClick])

  const handleDesignClick = useCallback(() => {
    onDesignClick?.()
  }, [onDesignClick])

  const primaryTools: Array<{
    icon: typeof Dice5
    label: string
    shortcut: string
    description?: string
    action: () => void
    disabled?: boolean
  }> = [
    {
      icon: Dice5,
      label: 'Shuffle',
      shortcut: 'S',
      description: t('shuffleDescription'),
      action: handleShuffle,
    },
    {
      icon: Save,
      label: t('save'),
      shortcut: 'Ctrl+S',
      action: handleSaveClick,
    },
    {
      icon: Share2,
      label: t('shareTrack'),
      shortcut: '',
      action: handleShareClick,
      disabled: !currentTrack,
    },
    {
      icon: GalleryVertical,
      label: t('gallery'),
      shortcut: 'G',
      action: handleGalleryClick,
    },
    {
      icon: Settings2,
      label: t('settings'),
      shortcut: '',
      action: handleSettingsClick,
    },
    {
      icon: Palette,
      label: t('design'),
      shortcut: '',
      action: handleDesignClick,
    },
  ]

  return (
    <>
      <aside className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.75rem+env(safe-area-inset-bottom))] shrink-0 items-start justify-center border-t border-border bg-surface/95 px-3 pt-2 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-200 ease-out md:static md:h-auto md:w-12 md:flex-col md:items-center md:justify-start md:border-t-0 md:border-r md:bg-surface md:px-0 md:py-2 md:shadow-none md:backdrop-blur-none">
        <div className="flex w-full max-w-sm items-center justify-around gap-2 md:w-auto md:flex-col md:justify-start md:gap-1">
          {primaryTools.map(({ icon: Icon, label, shortcut, description, action, disabled }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={action}
                  disabled={disabled}
                  aria-label={label}
                  className="size-11 rounded-2xl md:size-8 md:rounded-lg"
                >
                  <Icon className="size-5 md:size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden max-w-xs md:block">
                <div className="font-medium">
                  {label}{shortcut && ` (${shortcut})`}
                </div>
                {description && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </aside>

      {/* Fallback Save Dialog (when no onSaveClick prop provided) */}
      {!onSaveClick && (
        <SaveTrackDialog open={saveOpen} onOpenChange={setSaveOpen} />
      )}
      <ShareTrackDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        shortShareUrl={shortShareUrl}
        isShortening={shareLoading}
        shortenError={shareError}
      />
    </>
  )
}
