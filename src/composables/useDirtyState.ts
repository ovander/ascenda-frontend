/**
 * useDirtyState — tracks whether local state differs from the last persisted
 * server state for a given module.
 *
 * Usage:
 *   const dirty = useDirtyState('staff')
 *   // mark dirty whenever a field changes:
 *   dirty.markDirty()
 *   // call after a successful save:
 *   dirty.markClean()
 *   // call to surface a save error:
 *   dirty.markError('Network timeout — changes not saved')
 *
 * The composable is intentionally simple: it does not cache values to
 * localStorage (which is unsupported in Claude artifacts) — it tracks
 * in-memory state only. Page reloads clear the dirty state.
 */

import { ref, readonly } from 'vue'

export type DirtyState = 'clean' | 'dirty' | 'error' | 'saving'

export interface DirtyStateHandle {
  /** Current state of this module */
  readonly state: Readonly<ReturnType<typeof ref<DirtyState>>>
  /** True when local changes have not yet been persisted */
  readonly isDirty: Readonly<ReturnType<typeof ref<boolean>>>
  /** True when a save failure has been detected */
  readonly hasError: Readonly<ReturnType<typeof ref<boolean>>>
  /** True when a save request is in flight */
  readonly isSaving: Readonly<ReturnType<typeof ref<boolean>>>
  /** Last save error message, if any */
  readonly errorMessage: Readonly<ReturnType<typeof ref<string>>>

  markDirty(): void
  markSaving(): void
  markClean(): void
  markError(message?: string): void
  reset(): void
}

/**
 * Registry of shared state per module key.
 * Both `state` and `errorMessage` are shared so that any handle calling
 * markError() makes the message visible to all other handles for the same
 * key — including the KSaveBanner component that reads errorMessage.
 */
const stateRegistry   = new Map<string, ReturnType<typeof ref<DirtyState>>>()
const errorRegistry   = new Map<string, ReturnType<typeof ref<string>>>()

/** Returns all module keys that are currently dirty or errored. */
export function getDirtyModules(): string[] {
  const dirty: string[] = []
  stateRegistry.forEach((state, key) => {
    if (state.value === 'dirty' || state.value === 'error') {
      dirty.push(key)
    }
  })
  return dirty
}

/**
 * Create (or reuse) a dirty-state handle for the given module key.
 * Calling this twice with the same key returns shared state.
 */
export function useDirtyState(moduleKey: string): DirtyStateHandle {
  // Share state and errorMessage across callers with the same key
  if (!stateRegistry.has(moduleKey)) {
    stateRegistry.set(moduleKey, ref<DirtyState>('clean'))
    errorRegistry.set(moduleKey, ref<string>(''))
  }
  const state        = stateRegistry.get(moduleKey)!
  const errorMessage = errorRegistry.get(moduleKey)!   // shared across handles

  const isDirty = ref(false)
  const hasError = ref(false)
  const isSaving = ref(false)

  // Keep derived refs in sync with the canonical state ref
  function syncDerived() {
    isDirty.value = state.value === 'dirty'
    hasError.value = state.value === 'error'
    isSaving.value = state.value === 'saving'
  }

  function markDirty() {
    if (state.value === 'saving') return // don't override in-flight saves
    state.value = 'dirty'
    errorMessage.value = ''
    syncDerived()
  }

  function markSaving() {
    state.value = 'saving'
    errorMessage.value = ''
    syncDerived()
  }

  function markClean() {
    state.value = 'clean'
    errorMessage.value = ''
    syncDerived()
  }

  function markError(message = 'Changes not saved — please retry.') {
    state.value = 'error'
    errorMessage.value = message
    syncDerived()
  }

  function reset() {
    state.value = 'clean'
    errorMessage.value = ''
    syncDerived()
  }

  // Initialise derived refs from current state
  syncDerived()

  return {
    state: readonly(state),
    isDirty: readonly(isDirty),
    hasError: readonly(hasError),
    isSaving: readonly(isSaving),
    errorMessage: readonly(errorMessage),
    markDirty,
    markSaving,
    markClean,
    markError,
    reset,
  }
}
