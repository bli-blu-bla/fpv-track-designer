import { useEffect } from 'react'
import { useAppStore } from '@/editor/store'
import { getArrowKeyNudge } from '@/editor/keyboardNudge'

interface KeyboardShortcutsOptions {
  onSave?: () => void
  onShuffle?: () => void
  onOpenGallery?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onSave, onShuffle, onOpenGallery, onEscape } = options
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const selectGate = useAppStore((s) => s.selectGate)
  const selectedGateId = useAppStore((s) => s.selectedGateId)
  const selectedGateIds = useAppStore((s) => s.selectedGateIds)
  const isDeleteDialogOpen = useAppStore((s) => s.isDeleteDialogOpen)
  const openDeleteDialog = useAppStore((s) => s.openDeleteDialog)
  const closeDeleteDialog = useAppStore((s) => s.closeDeleteDialog)
  const deleteSelectedGates = useAppStore((s) => s.deleteSelectedGates)
  const nudgeSelectedGates = useAppStore((s) => s.nudgeSelectedGates)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
        return
      }

      if (selectedGateIds.length > 0 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const nudge = getArrowKeyNudge(e.key, e.shiftKey, useAppStore.getState().config)
        if (nudge) {
          e.preventDefault()
          nudgeSelectedGates(nudge, { continuing: e.repeat })
          return
        }
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        onShuffle?.()
        return
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        onOpenGallery?.()
        return
      }

      if (e.key === 'Escape') {
        onEscape?.()
        selectGate(null)
        if (isDeleteDialogOpen) {
          closeDeleteDialog()
        }
        return
      }

      if (e.key === 'Backspace' && selectedGateId && selectedGateIds.length === 1) {
        e.preventDefault()
        openDeleteDialog()
        return
      }

      if (e.key === 'Enter' && isDeleteDialogOpen) {
        e.preventDefault()
        deleteSelectedGates()
        closeDeleteDialog()
        return
      }

    }
  
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    undo,
    redo,
    onSave,
    onShuffle,
    onOpenGallery,
    onEscape,
    selectGate,
    selectedGateId,
    selectedGateIds,
    isDeleteDialogOpen,
    openDeleteDialog,
    closeDeleteDialog,
    deleteSelectedGates,
    nudgeSelectedGates,
  ])
}
