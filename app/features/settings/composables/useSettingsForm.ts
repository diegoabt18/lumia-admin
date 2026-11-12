import type { ZodError } from 'zod'
import type { UiError } from '~/composables/useApiError'

type BuildResult = { success: true; data: unknown } | { success: false; error: ZodError }

interface Options<TView, TForm> {
  key: string
  url: `/api/${string}`
  method: 'PUT' | 'PATCH'
  /** Valores editables a partir de la respuesta del BFF. */
  toForm: (view: TView) => TForm
  /** Valida el formulario y construye el cuerpo (normalmente `schema.safeParse(...)`). */
  build: (form: TForm) => BuildResult
  successMessage: string
}

/**
 * Estado de una sección de configuración: carga, edición local, detección de cambios,
 * validación por campo, guardado único y descarte.
 */
export function useSettingsForm<TView, TForm extends object>(options: Options<TView, TForm>) {
  const { request } = useAdminApi()
  const toast = useToast()

  // Estado propio (sin useAsyncData): los genéricos de useAsyncData no se infieren bien con TView abierto.
  const view = shallowRef<TView | null>(null)
  const pending = ref(false)
  const loadError = ref<UiError | null>(null)

  async function refresh() {
    pending.value = true
    loadError.value = null
    try {
      view.value = await request<TView>(options.url)
    } catch (e) {
      loadError.value = toUiError(e)
    } finally {
      pending.value = false
    }
  }
  void refresh()
  const loading = computed(() => pending.value && !view.value)

  const form = ref<TForm | null>(null) as Ref<TForm | null>
  const errors = ref<Record<string, string>>({})
  const formError = ref<string | null>(null)
  const saving = ref(false)

  function reset() {
    form.value = view.value ? structuredClone(toRaw(options.toForm(view.value))) : null
    errors.value = {}
    formError.value = null
  }
  watch(view, reset, { immediate: true })

  const dirty = computed(() =>
    Boolean(form.value && view.value) && JSON.stringify(form.value) !== JSON.stringify(options.toForm(view.value as TView)),
  )

  async function save() {
    if (!form.value || saving.value) return
    const built = options.build(form.value)
    if (!built.success) {
      errors.value = zodFieldErrors(built.error)
      formError.value = 'Revisa los campos marcados.'
      return
    }
    errors.value = {}
    formError.value = null
    saving.value = true
    try {
      view.value = await request<TView>(options.url, { method: options.method, body: built.data as Record<string, unknown> })
      toast.success(options.successMessage)
    } catch (e) {
      const ui = toUiError(e)
      errors.value = bffFieldErrors(ui.fieldErrors)
      formError.value = ui.message
    } finally {
      saving.value = false
    }
  }

  return { view, loading, loadError, refresh, form, errors, formError, saving, dirty, save, discard: reset }
}
