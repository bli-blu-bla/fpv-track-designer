import { useEffect, useRef, useState } from 'react'
import { useAppStore } from './store'
import { generateTrack } from './utils/generator'
import { extractGenerationConfig } from './utils/generationConfig'
import { createDefaultGateOpenings } from './utils/gateOpenings'
import { GATE_DEFINITIONS } from './utils/gateDefinitions'
import { GateIcon } from './components/icons/GateIcon'
import { defaultConfig } from './store/configSlice'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { GateType } from './types'
import { GATE_TYPES } from './types'
import { SaveTrackDialog } from './components/ui/SaveTrackDialog'
import { UnsavedChangesDialog } from './components/ui/UnsavedChangesDialog'
import { TrackGallery } from './components/ui/TrackGallery'
import { KeyboardShortcutsDialog } from './components/ui/KeyboardShortcutsDialog'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './components/ui/sheet'
import { ScrollArea } from './components/ui/scroll-area'
import { Separator } from './components/ui/separator'
import { GateConfigPanel } from './components/ui/GateConfigPanel'
import { ThemeConfigPanel } from './components/ui/ThemeConfigPanel'
import { ApplyConfigFooter } from './components/ui/ApplyConfigFooter'
import { Scene } from './components/scene/Scene'
import { TopBar } from './components/layout/TopBar'
import { LeftToolPanel } from './components/layout/LeftToolPanel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTranslation } from '@/i18n'

const FIRST_VISIT_COOKIE = 'fpv-track-designer-visited'
const FIRST_VISIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function hasFirstVisitCookie() {
  if (typeof document === 'undefined') return true

  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith(`${FIRST_VISIT_COOKIE}=`))
}

function setFirstVisitCookie() {
  if (typeof document === 'undefined') return

  document.cookie = `${FIRST_VISIT_COOKIE}=true; max-age=${FIRST_VISIT_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
}

function App() {
  const { t, gateTypeLabel } = useTranslation()
  const currentTrack = useAppStore((state) => state.currentTrack)
  const setTrack = useAppStore((state) => state.setTrack)
  const config = useAppStore((state) => state.config)
  const isDeleteDialogOpen = useAppStore((state) => state.isDeleteDialogOpen)
  const closeDeleteDialog = useAppStore((state) => state.closeDeleteDialog)
  const deleteSelectedGates = useAppStore((state) => state.deleteSelectedGates)
  const pendingGateInsertion = useAppStore((state) => state.pendingGateInsertion)
  const closeGateInsertionDialog = useAppStore((state) => state.closeGateInsertionDialog)
  const insertGateAtIndex = useAppStore((state) => state.insertGateAtIndex)
  const sequenceEditor = useAppStore((state) => state.sequenceEditor)
  const closeSequenceEditor = useAppStore((state) => state.closeSequenceEditor)
  const moveGateSequenceEntry = useAppStore((state) => state.moveGateSequenceEntry)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)
  const openSaveDialog = useAppStore((state) => state.openSaveDialog)

  // SaveTrackDialog is now globally controlled via store (isSaveDialogOpen).
  // We keep the gallery/shortcuts/settings sheet state local.
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  const [fpvModeActive, setFpvModeActive] = useState(false)
  const [sequenceDraft, setSequenceDraft] = useState<{ editorKey: string | null; value: string }>({
    editorKey: null,
    value: '',
  })
  const sequenceInputRef = useRef<HTMLInputElement>(null)

  useKeyboardShortcuts({
    onSave: () => openSaveDialog(),
    onShuffle: () => {
      void requestDestructiveAction('shuffle').then((proceed) => {
        if (proceed) setTrack(generateTrack(config), extractGenerationConfig(config))
      })
    },
    onOpenGallery: () => {
      setSettingsOpen(false)
      setDesignOpen(false)
      setGalleryOpen(true)
    },
    onEscape: () => setFpvModeActive(false),
  })

  // Auto-generate track on first load
  useEffect(() => {
    if (!currentTrack) {
      const track = generateTrack(defaultConfig)
      setTrack(track, extractGenerationConfig(defaultConfig))
    }
  }, [currentTrack, setTrack])

  // Show help once for first-time visitors.
  useEffect(() => {
    if (hasFirstVisitCookie()) return

    setFirstVisitCookie()
    const timeoutId = window.setTimeout(() => setShortcutsOpen(true), 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  // Mark current value when sequence editor opens, so the user can directly overwrite it.
  useEffect(() => {
    if (!sequenceEditor) return

    const frame = requestAnimationFrame(() => {
      const input = sequenceInputRef.current
      if (!input) return
      input.focus()
      input.select()
    })

    return () => cancelAnimationFrame(frame)
  }, [sequenceEditor])

  const singletonGateTypes = new Set<GateType>(
    currentTrack?.gates
      .filter((gate) => GATE_DEFINITIONS[gate.type].isStartFinish)
      .map((gate) => gate.type) ?? [],
  )

  const handleInsertGate = (type: GateType) => {
    if (!currentTrack || !pendingGateInsertion || singletonGateTypes.has(type)) return

    const id = crypto.randomUUID()
    insertGateAtIndex(
      {
        id,
        type,
        position: pendingGateInsertion.position,
        rotation: pendingGateInsertion.rotation,
        openings: createDefaultGateOpenings(type, id),
      },
      pendingGateInsertion.gateIndex,
      pendingGateInsertion.sequenceIndex,
    )
    closeGateInsertionDialog()
  }

  const sequenceEditorKey = sequenceEditor
    ? `${sequenceEditor.gateId}:${sequenceEditor.openingId}:${sequenceEditor.sourceSequenceNumber}`
    : null
  const sequenceValue = sequenceEditorKey && sequenceDraft.editorKey === sequenceEditorKey
    ? sequenceDraft.value
    : String(sequenceEditor?.sourceSequenceNumber ?? '')
  const sequenceLength = currentTrack?.gateSequence.length ?? 0
  const nextSequenceNumber = Number(sequenceValue.trim())
  const sequenceInputError = (() => {
    if (!sequenceEditor || sequenceValue.trim().length === 0) {
      return t('enterNumber')
    }

    if (!Number.isInteger(nextSequenceNumber)) {
      return t('enterInteger')
    }

    if (nextSequenceNumber < 1 || nextSequenceNumber > sequenceLength) {
      return t('numberBetween', { count: sequenceLength })
    }

    return null
  })()

  const handleSequenceSubmit = () => {
    if (!sequenceEditor || sequenceInputError) return

    moveGateSequenceEntry(
      sequenceEditor.gateId,
      sequenceEditor.openingId,
      sequenceEditor.sourceSequenceNumber,
      nextSequenceNumber,
    )
    setSequenceDraft({ editorKey: null, value: '' })
    closeSequenceEditor()
  }

  const closeSequenceDialog = () => {
    setSequenceDraft({ editorKey: null, value: '' })
    closeSequenceEditor()
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh w-dvw flex-col overflow-hidden">
        <TopBar
          onShortcutsClick={() => setShortcutsOpen(true)}
          fpvModeActive={fpvModeActive}
          fpvDisabled={!currentTrack || currentTrack.gates.length < 2}
          onFpvToggle={() => setFpvModeActive((active) => !active)}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LeftToolPanel
            onSaveClick={() => openSaveDialog()}
            onGalleryClick={() => {
              setSettingsOpen(false)
              setDesignOpen(false)
              setGalleryOpen(true)
            }}
            onSettingsClick={() => {
              setGalleryOpen(false)
              setDesignOpen(false)
              setSettingsOpen(true)
            }}
            onDesignClick={() => {
              setGalleryOpen(false)
              setSettingsOpen(false)
              setDesignOpen(true)
            }}
          />
          <main className="relative min-w-0 flex-1 touch-none pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
            <Scene fpvModeActive={fpvModeActive} onFpvComplete={() => setFpvModeActive(false)} />
          </main>
        </div>
      </div>
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="left" className="flex w-[min(100dvw,28rem)] flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="pr-12">
            <SheetTitle>{t('settingsTitle')}</SheetTitle>
            <SheetDescription>
              {t('settingsDescription')}
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              <GateConfigPanel />
            </div>
          </ScrollArea>
          <ApplyConfigFooter />
        </SheetContent>
      </Sheet>
      <Sheet open={designOpen} onOpenChange={setDesignOpen}>
        <SheetContent side="left" className="flex w-[min(100dvw,28rem)] flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="pr-12">
            <SheetTitle>{t('design')}</SheetTitle>
            <SheetDescription>
              {t('designDescription')}
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              <ThemeConfigPanel />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <SaveTrackDialog />
      <UnsavedChangesDialog />
      <TrackGallery open={galleryOpen} onOpenChange={setGalleryOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <Dialog open={pendingGateInsertion !== null} onOpenChange={(open) => {
        if (!open) closeGateInsertionDialog()
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)]">
          <DialogHeader>
            <DialogTitle>{t('insertGateTitle')}</DialogTitle>
            <DialogDescription>
              {t('insertGateDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {GATE_TYPES.map((type) => {
              const disabled = singletonGateTypes.has(type)

              return (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  className="flex h-auto justify-start gap-3 py-3 text-left"
                  disabled={disabled}
                  onClick={() => handleInsertGate(type)}
                >
                  <span className="flex w-10 shrink-0 justify-center">
                    <GateIcon type={type} className="size-6" />
                  </span>
                  <span>{gateTypeLabel(type)}</span>
                </Button>
              )
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeGateInsertionDialog}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={sequenceEditor !== null} onOpenChange={(open) => {
        if (!open) closeSequenceDialog()
      }}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleSequenceSubmit()
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('changePassNumberTitle')}</DialogTitle>
              <DialogDescription>
                {t('changePassNumberDescription', { count: sequenceLength })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="sequence-number">{t('passNumber')}</Label>
              <Input
                id="sequence-number"
                ref={sequenceInputRef}
                value={sequenceValue}
                onChange={(event) => setSequenceDraft({
                  editorKey: sequenceEditorKey,
                  value: event.target.value,
                })}
                onFocus={(event) => event.currentTarget.select()}
                inputMode="numeric"
              />
              {sequenceInputError && <p className="text-xs text-destructive">{sequenceInputError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSequenceDialog}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={Boolean(sequenceInputError)}>
                {t('apply')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
      >
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              deleteSelectedGates()
              closeDeleteDialog()
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('deleteSelectedGateTitle')}</DialogTitle>
              <DialogDescription>
                {t('deleteSelectedGateDescription')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" variant="destructive" autoFocus>
                {t('deleteGate')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

export default App
