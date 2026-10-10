import { useRef, useState, type ChangeEvent, type FC } from 'react'
import {
  ChevronDown,
  CircleHelp,
  CloudCheck,
  CloudOff,
  Dice5,
  Download,
  FileJson,
  Languages,
  Loader2,
  Play,
  Redo2,
  Save,
  Square,
  Undo2,
  Upload,
} from 'lucide-react'
import { useAppStore } from '@/editor/store'
import { serializeTrack, deserializeTrack } from '@/core/schemas/track.schema'
import { loadTrack, loadTrackThumbnail } from '@/editor/storage'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'
import { PoleCounter } from './PoleCounter'
import { AccountMenu } from './AccountMenu'

interface TopBarProps {
  onShortcutsClick: () => void
  onShuffle: () => void
  fpvModeActive: boolean
  fpvDisabled: boolean
  onFpvToggle: () => void
}

function Divider() {
  return <div aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
}

function HeaderIconButton({ label, className, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn('size-8 text-muted-foreground hover:bg-secondary hover:text-foreground', className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Saved-state indicator; when signed in it also reflects the account sync of the current track. */
function SaveStateIndicator() {
  const { t } = useTranslation()
  const trackId = useAppStore((state) => state.currentTrack?.id)
  const signedIn = useAppStore((state) => state.accountStatus === 'signed-in')
  const syncStatus = useAppStore((state) => state.trackSyncStatus)
  const syncTrack = useAppStore((state) => state.syncTrack)
  const syncState = signedIn && syncStatus?.trackId === trackId ? syncStatus?.state : undefined

  if (syncState === 'failed' || syncState === 'conflict') {
    const retry = () => {
      const saved = trackId ? loadTrack(trackId) : null
      if (saved && trackId) void syncTrack(saved.track, saved.config, loadTrackThumbnail(trackId))
    }
    return (
      <HeaderIconButton label={t('syncRetry')} onClick={retry} className="text-amber-400">
        <CloudOff />
      </HeaderIconButton>
    )
  }

  const label = syncState === 'syncing' ? t('syncStateSyncing') : syncState === 'synced' ? t('syncSavedAndSynced') : t('savedState')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span aria-label={label} className="flex shrink-0 px-1 text-subtle-foreground">
          {syncState === 'syncing' ? <Loader2 className="size-4 animate-spin" /> : <CloudCheck className="size-4" />}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Inline-editable track name; commits on blur or Enter, Escape restores. */
function TrackNameInput() {
  const { t } = useTranslation()
  const name = useAppStore((state) => state.currentTrack?.name ?? '')
  const renameTrack = useAppStore((state) => state.renameTrack)

  return (
    <input
      key={name}
      defaultValue={name}
      aria-label={t('trackName')}
      onBlur={(event) => {
        renameTrack(event.currentTarget.value)
        if (!event.currentTarget.value.trim()) event.currentTarget.value = name
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          event.currentTarget.value = name
          event.currentTarget.blur()
        }
      }}
      className="h-8 w-40 min-w-16 shrink rounded-md border border-transparent bg-transparent px-2 text-[13px] font-medium text-foreground outline-none transition-colors hover:border-border focus:border-ring focus:bg-muted"
    />
  )
}

export const TopBar: FC<TopBarProps> = ({ onShortcutsClick, onShuffle, fpvModeActive, fpvDisabled, onFpvToggle }) => {
  const { language, t, toggleLanguage } = useTranslation()
  const canUndo = useAppStore((state) => state.past.length > 0)
  const canRedo = useAppStore((state) => state.future.length > 0)
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)
  const isTrackModified = useAppStore((state) => state.isTrackModified)
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)
  const openSaveDialog = useAppStore((state) => state.openSaveDialog)
  const [exportOpen, setExportOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    setExportOpen(false)
    if (!currentTrack) return
    const json = serializeTrack(currentTrack, config, { pretty: true })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentTrack.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Confirm before reading so a dirty track is never replaced silently.
    void requestDestructiveAction('import').then((proceed) => {
      if (!proceed) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string
          const result = deserializeTrack(json)
          if ('error' in result) {
            console.error('Import failed:', result.error)
          } else {
            setConfig(result.config)
            replaceTrack(result.track)
          }
        } catch {
          console.error('Failed to parse JSON file')
        }
      }
      reader.readAsText(file)
    })
  }

  const menuItemClass = 'flex h-8 w-full items-center gap-2.5 rounded-sm px-2 text-left text-[13px] text-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-50'

  return (
    <header className="relative z-20 flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <div className="flex shrink-0 items-center gap-2.5 pr-1">
        <a
          href="https://fpvooe.com/"
          target="_blank"
          rel="noreferrer"
          aria-label={t('backToWebsite')}
          className="flex size-7 items-center justify-center rounded-[7px] bg-primary font-mono text-[10px] font-bold tracking-tight text-primary-foreground"
        >
          FPV
        </a>
        <span className="whitespace-nowrap text-sm font-semibold tracking-tight">Track Designer</span>
        <span className="rounded-full border border-strong-border px-[7px] py-px text-[11px] font-medium text-muted-foreground">
          {t('beta')}
        </span>
      </div>

      <Divider />

      <div className="flex gap-0.5">
        <HeaderIconButton label={t('undo')} onClick={undo} disabled={!canUndo}>
          <Undo2 />
        </HeaderIconButton>
        <HeaderIconButton label={t('redo')} onClick={redo} disabled={!canRedo}>
          <Redo2 />
        </HeaderIconButton>
      </div>

      <Divider />

      <div className="flex min-w-0 shrink items-center gap-2 overflow-hidden">
        {currentTrack && <TrackNameInput />}
        <a
          href="https://fpvooe.com/"
          target="_blank"
          rel="noreferrer"
          className="hidden whitespace-nowrap rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-amber-400 hover:bg-primary/20 sm:inline"
        >
          #fpvooe
        </a>
        {currentTrack && (isTrackModified ? (
          <HeaderIconButton label={t('unsavedStateSave')} onClick={openSaveDialog} className="text-amber-400">
            <Save />
          </HeaderIconButton>
        ) : (
          <SaveStateIndicator />
        ))}
        <HeaderIconButton label={t('shuffleTrack')} onClick={onShuffle}>
          <Dice5 />
        </HeaderIconButton>
      </div>

      <div className="min-w-2 flex-1" />

      <PoleCounter />

      <Popover open={exportOpen} onOpenChange={setExportOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 gap-2 border-border bg-transparent px-3 text-[13px] font-medium hover:bg-secondary">
            <Download />
            <span className="hidden md:inline">{t('exportMenu')}</span>
            <ChevronDown className="text-subtle-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-56 gap-0 border-border bg-background p-1 shadow-xl shadow-black/50">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('exportTrackHeading')}</div>
          <button type="button" className={menuItemClass} onClick={handleExport} disabled={!currentTrack}>
            <FileJson className="size-4 text-muted-foreground" />
            {t('exportAsJson')}
          </button>
          <div className="-mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              setExportOpen(false)
              importInputRef.current?.click()
            }}
          >
            <Upload className="size-4 text-muted-foreground" />
            {t('importEllipsis')}
          </button>
        </PopoverContent>
      </Popover>
      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} aria-label={t('importJson')} />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={toggleLanguage}
            aria-label={t('languageToggleLabel')}
            className="h-8 gap-1.5 px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Languages />
            {language.toUpperCase()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('languageToggleTooltip')}</TooltipContent>
      </Tooltip>

      <HeaderIconButton label={t('help')} onClick={onShortcutsClick}>
        <CircleHelp />
      </HeaderIconButton>

      <AccountMenu />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onFpvToggle}
            disabled={fpvDisabled}
            className="h-8 gap-1.5 px-3.5 text-[13px] font-semibold hover:bg-amber-400"
          >
            {fpvModeActive ? <Square /> : <Play />}
            <span className="hidden sm:inline">{fpvModeActive ? t('fpvStopShort') : t('fpvFlight')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {fpvModeActive ? t('fpvStopDescription') : t('fpvStartDescription')}
        </TooltipContent>
      </Tooltip>
    </header>
  )
}
