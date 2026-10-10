import type { LucideIcon } from 'lucide-react'
import { CalendarDays, FolderOpen, Keyboard, Layers, Palette, Settings2, Shapes, Share2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTranslation, type TranslationKey } from '@/i18n'
import { PANEL_TITLE_KEYS, type SidePanelId } from './sidePanels'


interface ToolRailProps {
  activePanel: SidePanelId | null
  onPanelToggle: (panel: SidePanelId) => void
  onShareClick: () => void
  shareDisabled: boolean
  onShortcutsClick: () => void
  /** Only members of a namespace see the collections panel. */
  showCollections?: boolean
}

interface RailItem {
  key: string
  icon: LucideIcon
  labelKey: TranslationKey
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

function RailButton({ item }: { item: RailItem }) {
  const { t } = useTranslation()
  const label = t(item.labelKey)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={item.onClick}
          disabled={item.disabled}
          aria-label={label}
          aria-pressed={item.active}
          className={cn(
            'flex size-9 items-center justify-center rounded-lg transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
            item.active ? 'bg-secondary text-foreground' : 'text-subtle-foreground',
          )}
        >
          <item.icon className="size-[17px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}{item.shortcut && ` (${item.shortcut})`}
      </TooltipContent>
    </Tooltip>
  )
}

/** Left icon rail: toggles side panels; share opens its dialog. */
export function ToolRail({ activePanel, onPanelToggle, onShareClick, shareDisabled, onShortcutsClick, showCollections = false }: ToolRailProps) {
  const panel = (key: SidePanelId, icon: LucideIcon): RailItem => ({
    key,
    icon,
    labelKey: PANEL_TITLE_KEYS[key],
    active: activePanel === key,
    onClick: () => onPanelToggle(key),
  })

  const items: RailItem[] = [
    panel('library', Shapes),
    panel('layers', Layers),
    { ...panel('tracks', FolderOpen), shortcut: 'G' },
    ...(showCollections ? [panel('collections', CalendarDays)] : []),
    { key: 'share', icon: Share2, labelKey: 'shareTrack', onClick: onShareClick, disabled: shareDisabled },
    panel('field', Settings2),
    panel('appearance', Palette),
  ]

  return (
    <nav className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-2.5">
      {items.map((item) => <RailButton key={item.key} item={item} />)}
      <div className="flex-1" />
      <RailButton item={{ key: 'shortcuts', icon: Keyboard, labelKey: 'keyboardShortcuts', onClick: onShortcutsClick }} />
    </nav>
  )
}
