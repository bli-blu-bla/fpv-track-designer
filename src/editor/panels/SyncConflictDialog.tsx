import { useAppStore } from '@/editor/store'
import type { SyncConflictChoice } from '@/editor/store/syncSlice'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n'

/** Asks what to do when a saved track was changed in the account on another device. */
export function SyncConflictDialog() {
  const { t } = useTranslation()
  const conflict = useAppStore((state) => state.syncConflict)
  const resolveSyncConflict = useAppStore((state) => state.resolveSyncConflict)

  const resolve = (choice: SyncConflictChoice) => {
    const copyName = conflict ? `${conflict.track.name} ${t('copySuffix')}` : undefined
    void resolveSyncConflict(choice, copyName).then(() => {
      // The copy is a new local gallery entry.
      if (choice === 'copy') window.dispatchEvent(new CustomEvent('track-saved'))
    })
  }

  return (
    <Dialog open={conflict !== null} onOpenChange={(open) => { if (!open) resolve('cancel') }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('syncConflictTitle')}</DialogTitle>
          <DialogDescription>{t('syncConflictDescription', { name: conflict?.track.name ?? '' })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => resolve('cancel')}>{t('cancel')}</Button>
          <Button type="button" variant="outline" onClick={() => resolve('copy')}>{t('syncConflictCopy')}</Button>
          <Button type="button" onClick={() => resolve('overwrite')}>{t('syncConflictOverwrite')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
