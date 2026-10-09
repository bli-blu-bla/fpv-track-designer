import type { FC } from 'react'
import { useState } from 'react'
import { useAppStore } from '@/editor/store'
import { saveTrack } from '@/editor/storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/i18n'

interface SaveTrackDialogProps {
  /**
   * When provided, the dialog is fully controlled by the parent (legacy
   * usage in `LeftToolPanel.tsx` fallback path). When omitted, the dialog
   * binds to the global store state (`isSaveDialogOpen`) and dispatches
   * `openSaveDialog` / `dismissSaveDialog` / `markTrackSaved` actions –
   * which is the production wiring used by `App.tsx`.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const SaveTrackDialog: FC<SaveTrackDialogProps> = ({ open: openProp, onOpenChange }) => {
  const { t } = useTranslation()
  const currentTrack = useAppStore((state) => state.currentTrack)
  const syncCurrentTrack = useAppStore((state) => state.syncCurrentTrack)
  const config = useAppStore((state) => state.config)
  const storeOpen = useAppStore((state) => state.isSaveDialogOpen)
  const dismissSaveDialog = useAppStore((state) => state.dismissSaveDialog)
  const markTrackSaved = useAppStore((state) => state.markTrackSaved)

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : storeOpen

  const [name, setName] = useState(currentTrack?.name ?? '')

  // React-recommended "adjust state when a prop changes" pattern: sync the
  // input value to the active track whenever the dialog transitions to open.
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open && currentTrack) {
      setName(currentTrack.name)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && currentTrack) {
      setName(currentTrack.name)
    }
    if (isControlled) {
      onOpenChange?.(newOpen)
      return
    }
    if (!newOpen) {
      dismissSaveDialog()
    }
  }

  const handleSave = () => {
    if (!currentTrack) return
    const trackName = name || currentTrack.name
    const updated = { ...currentTrack, name: trackName, updatedAt: new Date().toISOString() }
    saveTrack(updated, config)
    syncCurrentTrack(updated)
    window.dispatchEvent(new CustomEvent('track-saved'))
    if (isControlled) {
      onOpenChange?.(false)
      return
    }
    // markTrackSaved() clears the dirty flag, closes this dialog, and
    // automatically continues any pending destructive action that was
    // staged via the "Zuerst speichern" path of UnsavedChangesDialog.
    markTrackSaved()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('saveTrackTitle')}</DialogTitle>
          <DialogDescription>
            {t('saveTrackDescription')}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSave()
          }}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="track-name">{t('trackName')}</Label>
              <Input
                id="track-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('trackNamePlaceholder')}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!currentTrack}>
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
