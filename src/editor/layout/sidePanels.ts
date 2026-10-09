import type { TranslationKey } from '@/i18n'

export type SidePanelId = 'library' | 'layers' | 'tracks' | 'field' | 'appearance'

export const PANEL_TITLE_KEYS: Record<SidePanelId, TranslationKey> = {
  library: 'panelLibrary',
  layers: 'panelLayers',
  tracks: 'panelTracks',
  field: 'panelField',
  appearance: 'panelAppearance',
}
