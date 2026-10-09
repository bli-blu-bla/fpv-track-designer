import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/core/defaultConfig'
import { useAppStore } from '@/editor/store'

import { ViewModeTabs, ViewToolbar } from './ViewToolbar'

const renderToolbar = (onResetView = vi.fn<() => void>()) => {
  render(
    <TooltipProvider>
      <ViewToolbar onResetView={onResetView} />
    </TooltipProvider>,
  )
  return { onResetView }
}

describe('ViewToolbar', () => {
  beforeEach(() => {
    useAppStore.setState({ config: defaultConfig, currentTrack: null })
  })

  it('toggles grid, flight path and pass labels', () => {
    renderToolbar()

    fireEvent.click(screen.getByRole('button', { name: 'Grid anzeigen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Flugbahn' }))
    fireEvent.click(screen.getByRole('button', { name: 'Durchflüge' }))

    const { config } = useAppStore.getState()
    expect(config.showGrid).toBe(true)
    expect(config.showFlightPath).toBe(false)
    expect(config.showOpeningLabels).toBe(false)
  })

  it('reveals snap sizes only while grid snap is on', () => {
    renderToolbar()

    expect(screen.queryByText('0,3 m')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Grid-Snap' }))
    expect(useAppStore.getState().config.snapGatesToGrid).toBe(true)
    expect(screen.getByText('0,3 m')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '0,5 m' }))
    expect(useAppStore.getState().config.snapGridSize).toBe(0.5)
  })

  it('resets the view', () => {
    const { onResetView } = renderToolbar()

    fireEvent.click(screen.getByRole('button', { name: 'Ansicht zurücksetzen' }))

    expect(onResetView).toHaveBeenCalledTimes(1)
  })
})

describe('ViewModeTabs', () => {
  it('reports the chosen camera view', () => {
    const onChange = vi.fn()
    render(<ViewModeTabs viewMode="perspective" onChange={onChange} />)

    expect(screen.getByRole('tab', { name: '3D' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: 'Draufsicht' }))

    expect(onChange).toHaveBeenCalledWith('top')
  })
})
