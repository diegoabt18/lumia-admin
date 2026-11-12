<template>
  <div>
    <div v-if="loading && !recipe" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !recipe"
      :title="loadError.status === 404 ? 'Receta no encontrada' : 'No se pudo cargar la receta'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="recipe">
      <PageHeader eyebrow="Receta" :title="recipe.name" :description="`Versión ${recipe.version}`">
        <template #actions>
          <BaseBadge v-if="!recipe.isActive" tone="neutral">Inactiva</BaseBadge>
          <BaseButton v-if="canDelete" variant="secondary" size="sm" :loading="deleting" :disabled="inUse" :title="inUse ? 'Está asignada a productos o variantes' : undefined" @click="onDelete">
            <template #icon>
              <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
            </template>
            Eliminar
          </BaseButton>
        </template>
      </PageHeader>
      <ProductionTabs />

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="xl:col-span-2">
          <RecipeEditor :recipe="recipe" :read-only="!canUpdate" :breakdown="breakdown" @saved="applyResult" />
        </div>

        <div class="space-y-6">
          <RecipeCostPanel
            :recipe="recipe"
            :breakdown="breakdown"
            :calculation-error="calculationError"
            :can-calculate="canUpdate"
            :calculating="calculating"
            @calculate="calculate"
          />

          <BaseCard title="Asignada a" description="Productos y variantes que usan esta receta para su costo.">
            <ul v-if="inUse" class="space-y-1.5 text-[13px]">
              <li v-for="p in recipe.associated.products" :key="p.id">{{ p.name }} <span class="text-lumia-ink/50">(producto)</span></li>
              <li v-for="v in recipe.associated.variants" :key="v.id"><code>{{ v.sku }}</code> <span class="text-lumia-ink/50">· {{ v.productSlug }}</span></li>
            </ul>
            <p v-else class="text-[13px] text-lumia-ink/55">Sin asignar.</p>
          </BaseCard>

          <BaseCard title="Versiones">
            <ol v-if="recipe.versions.length" class="space-y-2.5 text-[13px]">
              <li v-for="v in recipe.versions" :key="v.id" class="border-l-2 border-lumia-beige pl-3">
                <p class="font-medium text-lumia-ink">v{{ v.version }} · {{ formatUnitCost(v.totalCost) }}</p>
                <p class="text-lumia-ink/60">{{ v.changesDescription || 'Sin descripción' }}</p>
                <p class="text-[11px] text-lumia-ink/45">{{ v.createdAt ? formatDateTime(v.createdAt) : '' }}</p>
              </li>
            </ol>
            <p v-else class="text-[13px] text-lumia-ink/55">Sin versiones anteriores.</p>
            <p class="mt-3 text-[11px] text-lumia-ink/45">Cada versión guarda la receta y el costo que tenía antes del cambio.</p>
          </BaseCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { CostBreakdown, RecipeDetail, RecipeSaveResult } from '#shared/schemas/recipes'

definePageMeta({
  layout: 'admin',
  title: 'Receta',
  permissions: [PERMISSIONS.RECIPES_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Recetas', to: '/production/recipes' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canUpdate = computed(() => auth.can(PERMISSIONS.RECIPES_UPDATE))
const canDelete = computed(() => auth.can(PERMISSIONS.RECIPES_DELETE))

const { data: recipe, status, error, refresh } = useAsyncData<RecipeDetail>(
  () => `admin-recipe-${id.value}`,
  () => request<RecipeDetail>(`/api/admin/production/recipes/${id.value}`),
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))
useHead({ title: () => (recipe.value ? `${recipe.value.name} · Lumia Admin` : 'Receta · Lumia Admin') })

const inUse = computed(() => Boolean(recipe.value && recipe.value.associated.products.length + recipe.value.associated.variants.length > 0))

const breakdown = shallowRef<CostBreakdown | null>(null)
const calculationError = ref<string | null>(null)
const calculating = ref(false)

function applyResult(result: RecipeSaveResult) {
  recipe.value = result.recipe
  breakdown.value = result.breakdown
  calculationError.value = result.calculationError
}

async function calculate() {
  if (calculating.value) return
  calculating.value = true
  try {
    const result = await request<RecipeSaveResult>(`/api/admin/production/recipes/${id.value}/calculate`, { method: 'POST' })
    applyResult(result)
    if (result.calculationError) toast.error('No se pudo calcular el costo', result.calculationError)
    else toast.success('Costo calculado')
  } catch (e) {
    toast.error('No se pudo calcular el costo', toUiError(e).message)
  } finally {
    calculating.value = false
  }
}

const deleting = ref(false)
async function onDelete() {
  if (!recipe.value || deleting.value || inUse.value) return
  const ok = await confirm({
    title: `Eliminar “${recipe.value.name}”`,
    description: 'Se eliminará de forma permanente con su historial de costo. Si ya no se usa, también puedes desactivarla.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deleting.value = true
  try {
    await request(`/api/admin/production/recipes/${id.value}`, { method: 'DELETE' })
    toast.success('Receta eliminada')
    await navigateTo('/production/recipes')
  } catch (e) {
    toast.error('No se pudo eliminar la receta', toUiError(e).message)
  } finally {
    deleting.value = false
  }
}
</script>
