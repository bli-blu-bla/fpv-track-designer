import type { FC } from 'react'
import { useAppStore } from '@/editor/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation, type TranslationKey } from '@/i18n'
import type { DestructiveActionReason } from '@/editor/store/unsavedChangesSlice'

const REASON_DESCRIPTION_KEYS: Record<DestructiveActionReason, TranslationKey> = {
  shuffle: 'dirtyShuffleDescription',
  'apply-config': 'applyConfigDirtyDescription',
  import: 'dirtyImportDescription',
  load: 'dirtyLoadDescription',
  duplicate: 'dirtyDuplicateDescription',
}

/**
 * Globally-mounted confirmation dialog shown whenever a destructive action
 * (Shuffle, Import JSON, Gallery Load, Gallery Duplicate, Apply Config) is
 * triggered while there are unsaved changes (`isTrackModified === true`).
 *
 * Three resolution paths:
 *   - Abbrechen          → cancelDestructiveAction()         (keep current track)
 *   - Zuerst speichern   → saveBeforeDestructiveAction()     (open SaveTrackDialog, request stays pending)
 *   - Verwerfen          → confirmDestructiveAction()        (proceed, lose changes)
 *
 * The dialog hides itself while SaveTrackDialog is open so the two dialogs
 * never overlap. Once the user saves successfully, `markTrackSaved` lets the
 * pending request proceed.
 */
export const UnsavedChangesDialog: FC = () => {
  const { t } = useTranslation()
  const pending = useAppStore((state) => state.pendingDestructiveAction)
  const isSaveDialogOpen = useAppStore((state) => state.isSaveDialogOpen)
  const cancelDestructiveAction = useAppStore((state) => state.cancelDestructiveAction)
  const confirmDestructiveAction = useAppStore((state) => state.confirmDestructiveAction)
  const saveBeforeDestructiveAction = useAppStore((state) => state.saveBeforeDestructiveAction)

  const open = pending !== null && !isSaveDialogOpen

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) cancelDestructiveAction()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending ? t('discardCurrentTrackTitle') : t('unsavedChanges')}</DialogTitle>
          <DialogDescription>
            {pending ? t(REASON_DESCRIPTION_KEYS[pending.reason]) : t('unsavedChangesDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={cancelDestructiveAction}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={saveBeforeDestructiveAction}
          >
            {t('saveFirst')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            autoFocus
            onClick={confirmDestructiveAction}
          >
            {t('discard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
