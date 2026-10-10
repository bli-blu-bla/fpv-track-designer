import { LABEL_NAME_PATTERN } from '@/core/api/collections'
import { createLabel, deleteLabel, moveLabel, type NamespaceLabel } from '@/editor/api/collections'

/** What has to happen so that exactly `desired` labels point at an entry. */
export interface LabelPlan {
  create: string[]
  /** Labels that currently sit on another entry; moving them needs the user's confirmation. */
  move: NamespaceLabel[]
  /** Labels of this entry that are no longer wanted. */
  remove: NamespaceLabel[]
}

/** Lowercases and turns whitespace into dashes, e.g. "10 Okt 2026" → "10-okt-2026". */
export function normalizeLabelName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

export function isValidLabelName(name: string): boolean {
  return LABEL_NAME_PATTERN.test(name)
}

/** `entryId` is null for an entry that does not exist yet. */
export function planLabelChanges(desired: string[], entryId: string | null, labels: NamespaceLabel[]): LabelPlan {
  const wanted = new Set(desired)
  const byName = new Map(labels.map((label) => [label.name, label]))

  return {
    create: [...wanted].filter((name) => !byName.has(name)),
    move: [...wanted].flatMap((name) => {
      const label = byName.get(name)
      return label && label.entryId !== entryId ? [label] : []
    }),
    remove: entryId ? labels.filter((label) => label.entryId === entryId && !wanted.has(label.name)) : [],
  }
}

/** Applies a confirmed plan. A parallel edit can still throw `LabelTakenError` from `createLabel`. */
export async function applyLabelPlan(namespaceId: string, entryId: string, plan: LabelPlan): Promise<void> {
  for (const label of plan.remove) await deleteLabel(label.id)
  for (const label of plan.move) await moveLabel(label.id, entryId)
  for (const name of plan.create) await createLabel(namespaceId, name, entryId)
}
