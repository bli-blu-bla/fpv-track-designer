import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/editor/store'
import { defaultConfig } from '@/core/defaultConfig'

import { GateConfigPanel } from './GateConfigPanel'

const resetStore = () => {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    selectedGateId: null,
    selectedGateIds: [],
    isDeleteDialogOpen: false,
    isDraggingGate: false,
    past: [],
    future: [],
  })
}

describe('GateConfigPanel', () => {
  beforeEach(() => {
    resetStore()
  })

  it('commits free field width input after editing and blur', () => {
    render(<GateConfigPanel />)

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement

    fireEvent.change(widthInput, { target: { value: '30' } })
    fireEvent.blur(widthInput)

    expect(useAppStore.getState().config.fieldSize.width).toBe(30)
    expect(widthInput.value).toBe('30')
  })

  it('resets invalid width input back to current value on blur', () => {
    render(<GateConfigPanel />)

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement

    fireEvent.change(widthInput, { target: { value: '0' } })
    fireEvent.blur(widthInput)

    expect(useAppStore.getState().config.fieldSize.width).toBe(defaultConfig.fieldSize.width)
    expect(widthInput.value).toBe(String(defaultConfig.fieldSize.width))
  })

  it('allows clearing field size value and typing another valid number', () => {
    render(<GateConfigPanel />)

    const widthInput = screen.getByLabelText('Breite') as HTMLInputElement
    const heightInput = screen.getByLabelText('Länge') as HTMLInputElement

    fireEvent.change(widthInput, { target: { value: '' } })
    fireEvent.change(widthInput, { target: { value: '30' } })
    fireEvent.blur(widthInput)

    fireEvent.change(heightInput, { target: { value: '25' } })
    fireEvent.blur(heightInput)

    expect(useAppStore.getState().config.fieldSize.width).toBe(30)
    expect(useAppStore.getState().config.fieldSize.height).toBe(25)
    expect(widthInput.value).toBe('30')
    expect(heightInput.value).toBe('25')
  })
})
