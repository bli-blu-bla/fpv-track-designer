import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/editor/store'
import { generateTrack } from '@/core/track/generator'
import { extractGenerationConfig } from '@/core/track/generationConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { GATE_DEFINITIONS } from '@/core/gates/gateDefinitions'
import { GateIcon } from '@/editor/icons/GateIcon'
import { defaultConfig } from '@/core/defaultConfig'
import { useKeyboardShortcuts } from '@/editor/hooks/useKeyboardShortcuts'
import type { GateType } from '@/core/types'
import { GATE_TYPES } from '@/core/types'
import { SaveTrackDialog } from '@/editor/panels/SaveTrackDialog'
import { UnsavedChangesDialog } from '@/editor/panels/UnsavedChangesDialog'
import { SyncConflictDialog } from '@/editor/panels/SyncConflictDialog'
import { TrackGallery } from '@/editor/panels/TrackGallery'
import { CollectionsPanel } from '@/editor/panels/CollectionsPanel'
import { KeyboardShortcutsDialog } from '@/editor/panels/KeyboardShortcutsDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GateConfigPanel } from '@/editor/panels/GateConfigPanel'
import { ThemeConfigPanel } from '@/editor/panels/ThemeConfigPanel'
import { ApplyConfigFooter } from '@/editor/panels/ApplyConfigFooter'
import { Scene } from '@/scene/Scene'
import { EditableGate } from './gates/EditableGate'
import type { SceneViewMode } from '@/scene/CameraViewController'
import type { SceneSnapshotApi } from '@/scene/SceneSnapshot'
import { TopBar } from '@/editor/layout/TopBar'
import { ToolRail } from '@/editor/layout/ToolRail'
import { PANEL_TITLE_KEYS, type SidePanelId } from '@/editor/layout/sidePanels'
import { SidePanel } from '@/editor/layout/SidePanel'
import { ViewModeTabs, ViewToolbar } from '@/editor/layout/ViewToolbar'
import { Inspector } from '@/editor/layout/Inspector'
import { GateLibraryPanel } from '@/editor/panels/GateLibraryPanel'
import { LayersPanel } from '@/editor/panels/LayersPanel'
import { ShareTrackDialog } from '@/editor/panels/ShareTrackDialog'
import { useShareTrack } from '@/editor/hooks/useShareTrack'
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

// A click that ends a gate drag also lands on the ground; it must not clear the selection.
function clearSelectionOnGroundClick() {
  const { isDraggingGate, selectGate } = useAppStore.getState()
  if (!isDraggingGate) selectGate(null)
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
  const canManageCollections = useAppStore((state) => state.accountNamespaces.length > 0)

  // SaveTrackDialog is now globally controlled via store (isSaveDialogOpen).
  // We keep the gallery/shortcuts/settings sheet state local.
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [selectedPanel, setSelectedPanel] = useState<SidePanelId | null>('library')
  // The collections panel disappears with the membership (e.g. after signing out).
  const activePanel = selectedPanel === 'collections' && !canManageCollections ? null : selectedPanel
  const [viewMode, setViewMode] = useState<SceneViewMode>('perspective')
  const [viewResetToken, setViewResetToken] = useState(0)
  const [fpvModeActive, setFpvModeActive] = useState(false)
  const { share, dialogProps: shareDialogProps } = useShareTrack()
  const snapshotRef = useRef<SceneSnapshotApi | null>(null)
  const handleSnapshotReady = useCallback((api: SceneSnapshotApi | null) => {
    snapshotRef.current = api
  }, [])
  const captureThumbnail = useCallback(() => snapshotRef.current?.capture() ?? null, [])
  const [sequenceDraft, setSequenceDraft] = useState<{ editorKey: string | null; value: string }>({
    editorKey: null,
    value: '',
  })
  const sequenceInputRef = useRef<HTMLInputElement>(null)

  const shuffleTrack = () => {
    void requestDestructiveAction('shuffle').then((proceed) => {
      if (proceed) setTrack(generateTrack(config), extractGenerationConfig(config))
    })
  }

  useKeyboardShortcuts({
    onSave: () => openSaveDialog(),
    onShuffle: shuffleTrack,
    onOpenGallery: () => setSelectedPanel('tracks'),
    onEscape: () => setFpvModeActive(false),
  })

  // Auto-generate track on first load
  useEffect(() => {
    if (!currentTrack) {
      const track = generateTrack(defaultConfig)
      setTrack(track, extractGenerationConfig(defaultConfig))
    }
  }, [currentTrack, setTrack])

  // Restore and validate a stored account session (no-op without VITE_API_URL). Cleanup keeps StrictMode idempotent.
  useEffect(() => useAppStore.getState().initAccount(), [])

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
      <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-background text-[13px]">
        <TopBar
          onShortcutsClick={() => setShortcutsOpen(true)}
          onShuffle={shuffleTrack}
          fpvModeActive={fpvModeActive}
          fpvDisabled={!currentTrack || currentTrack.gates.length < 2}
          onFpvToggle={() => setFpvModeActive((active) => !active)}
          captureThumbnail={captureThumbnail}
        />
        <div className="flex min-h-0 flex-1">
          <ToolRail
            activePanel={activePanel}
            onPanelToggle={(panel) => setSelectedPanel((current) => current === panel ? null : panel)}
            onShareClick={share}
            shareDisabled={!currentTrack}
            onShortcutsClick={() => setShortcutsOpen(true)}
            showCollections={canManageCollections}
          />
          {activePanel && (
            <SidePanel
              title={t(PANEL_TITLE_KEYS[activePanel])}
              onClose={() => setSelectedPanel(null)}
              footer={activePanel === 'field' ? <ApplyConfigFooter /> : undefined}
            >
              {activePanel === 'library' && <GateLibraryPanel />}
              {activePanel === 'layers' && <LayersPanel />}
              {activePanel === 'tracks' && <TrackGallery />}
              {activePanel === 'collections' && <CollectionsPanel captureThumbnail={captureThumbnail} />}
              {activePanel === 'field' && <GateConfigPanel />}
              {activePanel === 'appearance' && <ThemeConfigPanel />}
            </SidePanel>
          )}
          <main className="relative min-w-0 flex-1 touch-none overflow-hidden">
            <Scene
              track={currentTrack}
              config={config}
              gateComponent={EditableGate}
              onGroundClick={clearSelectionOnGroundClick}
              fpvModeActive={fpvModeActive}
              onFpvComplete={() => setFpvModeActive(false)}
              viewMode={viewMode}
              viewResetToken={viewResetToken}
              onSnapshotReady={handleSnapshotReady}
            />
            {!fpvModeActive && <ViewModeTabs viewMode={viewMode} onChange={setViewMode} />}
            <p className="pointer-events-none absolute top-4 right-3 hidden text-[11px] text-muted-foreground xl:block">
              {t('viewHint')}
            </p>
            {fpvModeActive ? (
              <div className="absolute top-3.5 left-1/2 flex h-9 -translate-x-1/2 items-center gap-2.5 rounded-full border border-border bg-background pr-1.5 pl-3.5 shadow-xl shadow-black/40">
                <span aria-hidden="true" className="size-2 rounded-full bg-red-500" />
                <span className="font-medium">{t('fpvFlight')}</span>
                <button
                  type="button"
                  onClick={() => setFpvModeActive(false)}
                  className="h-[26px] rounded-full border border-border px-2.5 text-xs hover:bg-secondary"
                >
                  {t('fpvStopShort')} <span className="font-mono text-subtle-foreground">Esc</span>
                </button>
              </div>
            ) : (
              <ViewToolbar onResetView={() => setViewResetToken((token) => token + 1)} />
            )}
          </main>
          <Inspector />
        </div>
      </div>
      <ShareTrackDialog {...shareDialogProps} />
      <SaveTrackDialog captureThumbnail={captureThumbnail} />
      <UnsavedChangesDialog />
      <SyncConflictDialog />
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
