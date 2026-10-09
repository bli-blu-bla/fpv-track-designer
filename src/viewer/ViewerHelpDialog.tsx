import { CircleHelp } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/i18n'

interface ViewerHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewerHelpDialog({ open, onOpenChange }: ViewerHelpDialogProps) {
  const { t } = useTranslation()
  const viewerControls = [
    { description: t('rotateView'), keys: t('viewerRotateViewKey') },
    { description: t('moveOverTrack'), keys: t('viewerMoveOverTrackKey') },
    { description: t('changeCameraHeight'), keys: t('viewerChangeCameraHeightKey') },
    { description: t('zoom'), keys: t('viewerZoomKey') },
    { description: t('fpvStop'), keys: t('viewerStopFpvKey') },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="size-5 text-sky-300" />
            {t('viewerHelpTitle')}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {t('viewerHelpDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {viewerControls.map((control) => (
            <div key={control.description} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-semibold text-slate-100">{control.description}</div>
              <div className="mt-1 text-sm leading-6 text-slate-300">{control.keys}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
