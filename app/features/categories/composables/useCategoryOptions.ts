import type { Ref } from 'vue'
import type { CategoryList, SubcategoryRow } from '#shared/schemas/categories'

export interface CategoryOption {
  /** Slug (usado por promociones, que referencian categorías por slug). */
  value: string
  /** _id de la categoría (usado por el selector de producto). */
  id: string
  label: string
  active: boolean
}

/**
 * Opciones de categoría para selectores (hasta 100, ordenadas en el Server).
 * Si existieran más de 100 categorías, `truncated` lo indica para no ocultarlo en silencio.
 */
export function useCategoryOptions() {
  const { request } = useAdminApi()
  const { data, status, error } = useAsyncData('admin-category-options', () =>
    request<CategoryList>('/api/admin/categories', { query: { limit: 100 } }),
  )

  const options = computed<CategoryOption[]>(() =>
    (data.value?.items ?? []).map((c) => ({
      value: c.slug,
      id: c.id,
      label: c.name,
      active: c.status === 'active',
    })),
  )
  const truncated = computed(() => (data.value?.pagination.total ?? 0) > (data.value?.items.length ?? 0))
  const loading = computed(() => status.value === 'pending')

  return { options, truncated, loading, error }
}

/**
 * Subcategorías de una categoría para el selector de producto. Se piden solo cuando hay categoría.
 * Las inactivas no se ofrecen para nuevas asignaciones (salvo que se pase `keepId`, la ya asignada).
 */
export function useSubcategoryOptions(categoryId: Ref<string | undefined>, keepId?: Ref<string | undefined>) {
  const { request } = useAdminApi()
  const subcategories = ref<SubcategoryRow[]>([])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  let requestSeq = 0

  async function load(id: string | undefined) {
    const seq = ++requestSeq
    if (!id) {
      subcategories.value = []
      loading.value = false
      return []
    }
    loading.value = true
    errorMessage.value = null
    try {
      const res = await request<{ items: SubcategoryRow[] }>(`/api/admin/categories/${id}/subcategories`)
      if (seq === requestSeq) subcategories.value = res.items
    } catch (err) {
      if (seq === requestSeq) {
        subcategories.value = []
        errorMessage.value = toUiError(err).message
      }
    } finally {
      if (seq === requestSeq) loading.value = false
    }
    return subcategories.value
  }

  watch(categoryId, (id) => void load(id), { immediate: true })

  const options = computed(() =>
    subcategories.value
      .filter((s) => s.status === 'active' || s.id === keepId?.value)
      .map((s) => ({
        value: s.id,
        label: s.status === 'active' ? s.name : `${s.name} (inactiva)`,
        disabled: s.status !== 'active' && s.id !== keepId?.value,
      })),
  )

  /** Devuelve true si el id pertenece a la categoría cargada y sigue siendo asignable. */
  function isAssignable(subcategoryId: string | undefined) {
    if (!subcategoryId) return false
    return subcategories.value.some((s) => s.id === subcategoryId && (s.status === 'active' || s.id === keepId?.value))
  }

  return { options, subcategories, loading, errorMessage, isAssignable, reload: () => load(categoryId.value) }
}
