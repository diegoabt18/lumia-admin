export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` para acciones destructivas o irreversibles. */
  tone?: 'default' | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

let resolver: ((value: boolean) => void) | null = null

/**
 * Confirmación de acciones mediante un único <ConfirmDialog /> montado en el layout.
 * Uso: `if (await confirm({ title: '¿Eliminar?', tone: 'danger' })) { ... }`
 */
export function useConfirm() {
  const state = useState<ConfirmState>('confirm-dialog', () => ({ open: false, title: '' }))

  function confirm(options: ConfirmOptions): Promise<boolean> {
    resolver?.(false)
    state.value = { ...options, open: true }
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function settle(value: boolean) {
    state.value = { ...state.value, open: false }
    resolver?.(value)
    resolver = null
  }

  return { state: readonly(state), confirm, settle }
}
