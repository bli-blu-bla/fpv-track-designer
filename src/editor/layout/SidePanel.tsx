import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface SidePanelProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Sticky area below the scrolling content, e.g. an apply button. */
  footer?: ReactNode
}

export function SidePanel({ title, onClose, children, footer }: SidePanelProps) {
  const { t } = useTranslation()

  return (
    <aside aria-label={title} className="flex min-h-0 w-[300px] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border pr-2 pl-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-3.5 pb-5">{children}</div>
      {footer}
    </aside>
  )
}
