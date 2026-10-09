import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/editor/store/configSlice'
import { useAppStore } from '@/editor/store'

import { TopBar } from './TopBar'

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

const resetStore = () => {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    past: [],
    future: [],
  })
}

const renderTopBar = ({
  fpvModeActive = false,
  fpvDisabled = false,
  onFpvToggle = vi.fn<() => void>(),
} = {}) => {
  const onShortcutsClick = vi.fn<() => void>()

  render(
    <TooltipProvider>
      <TopBar
        onShortcutsClick={onShortcutsClick}
        fpvModeActive={fpvModeActive}
        fpvDisabled={fpvDisabled}
        onFpvToggle={onFpvToggle}
      />
    </TooltipProvider>,
  )

  return { onFpvToggle, onShortcutsClick }
}

describe('TopBar', () => {
  beforeEach(() => {
    resetStore()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders a mobile FPV play button that toggles fly-through mode', () => {
    const onFpvToggle = vi.fn<() => void>()

    renderTopBar({ onFpvToggle })

    const mobileFpvButton = screen.getByRole('button', { name: 'FPV-Flug starten' })
    expect(mobileFpvButton.className).toContain('md:hidden')

    fireEvent.click(mobileFpvButton)

    expect(onFpvToggle).toHaveBeenCalledTimes(1)
  })

  it('shows the mobile FPV stop state when fly-through mode is active', () => {
    renderTopBar({ fpvModeActive: true })

    const mobileFpvButton = screen.getByRole('button', { name: 'FPV-Flug stoppen' })
    expect(mobileFpvButton.className).toContain('md:hidden')
  })

  it('hides undo and redo controls on mobile widths', () => {
    renderTopBar()

    const undoButton = screen.getByRole('button', { name: 'Rückgängig' })
    const redoButton = screen.getByRole('button', { name: 'Wiederholen' })
    const historyControls = undoButton.closest('div')

    expect(historyControls?.className).toContain('hidden')
    expect(historyControls?.className).toContain('md:flex')
    expect(redoButton.closest('div')).toBe(historyControls)
  })

  it('switches header labels to English via the language toggle', () => {
    renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Sprache auf Englisch umstellen' }))

    expect(screen.getByRole('button', { name: 'Switch language to German' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Start FPV flight' })).not.toBeNull()
    expect(window.localStorage.getItem('fpv-track-designer-language')).toBe('en')
  })

  it('toggles the ground grid display setting', () => {
    renderTopBar()

    const showGridToggle = screen.getByLabelText('Grid anzeigen')
    expect(useAppStore.getState().config.showGrid).toBe(false)

    fireEvent.click(showGridToggle)
    expect(useAppStore.getState().config.showGrid).toBe(true)

    fireEvent.click(showGridToggle)
    expect(useAppStore.getState().config.showGrid).toBe(false)
  })

  it('reveals a three-step snap precision control only when grid snap is enabled', () => {
    renderTopBar()

    expect(screen.queryByText('Snap-Genauigkeit')).toBeNull()

    fireEvent.click(screen.getByLabelText('Grid-Snap'))

    expect(screen.getByText('Snap-Genauigkeit')).not.toBeNull()
    expect(screen.getByText('0,3 m')).not.toBeNull()
    expect(screen.getByText('0,5 m')).not.toBeNull()
    expect(screen.getByText('1 m')).not.toBeNull()
    expect(useAppStore.getState().config.snapGatesToGrid).toBe(true)
    expect(useAppStore.getState().config.snapGridSize).toBe(0.3)

    fireEvent.click(screen.getByRole('button', { name: '1/2 Feld · 0,5 m' }))
    expect(useAppStore.getState().config.snapGridSize).toBe(0.5)

    fireEvent.click(screen.getByRole('button', { name: '1 Feld · 1,0 m' }))
    expect(useAppStore.getState().config.snapGridSize).toBe(1)
  })
})
