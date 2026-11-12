<template>
  <div>
    <div v-if="loading && !product" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !product"
      :title="loadError.status === 404 ? 'Producto no encontrado' : loadError.status === 403 ? 'Sin permiso para ver el producto' : 'No se pudo cargar el producto'"
      :message="loadError.status === 403 ? 'Esta pantalla necesita también el permiso de lectura de productos.' : loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404 && loadError.status !== 403"
      @retry="refresh"
    />

    <template v-else-if="product">
      <PageHeader eyebrow="Precios" :title="product.name" :description="product.taxRate !== null ? `IVA ${product.taxRate} % · precios con IVA incluido` : 'IVA sin configurar'">
        <template v-if="canSubmit" #actions>
          <BaseButton :loading="submitting" :disabled="!hasAnyRecipe" :title="hasAnyRecipe ? undefined : 'Asigna una receta primero'" @click="submit">
            <template #icon>
              <IconSend class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
            </template>
            Enviar a aprobación
          </BaseButton>
        </template>
      </PageHeader>
      <ProductionTabs />

      <p v-if="product.taxRate === null" role="note" class="mb-5 rounded-xl border border-status-warning/25 bg-status-warning-soft/50 px-4 py-3 text-[13px] text-status-warning">
        Este producto no tiene IVA configurado: el servidor no lo envía a aprobación porque no puede calcular el precio final. Configúralo en la ficha del producto (0 si está excluido o exento).
        <NuxtLink v-if="canReadProducts" :to="`/products/${product.id}`" class="font-medium underline underline-offset-2">Abrir ficha</NuxtLink>
      </p>

      <div class="grid gap-6 xl:grid-cols-3">
        <BaseCard title="Receta del producto" description="La usan todas las variantes que no tienen receta propia.">
          <div v-if="product.recipeId" class="flex items-center justify-between gap-3 rounded-xl border border-lumia-ink/10 px-3 py-2.5">
            <NuxtLink :to="`/production/recipes/${product.recipeId}`" class="min-w-0 truncate text-[14px] text-lumia-ink hover:text-lumia-gold">
              {{ recipeName(product.recipeId) }}
            </NuxtLink>
            <BaseButton v-if="canAssign" variant="ghost" size="sm" :disabled="busy" @click="unassign">Quitar</BaseButton>
          </div>
          <p v-else class="text-[13px] text-lumia-ink/55">Sin receta asignada.</p>
          <div v-if="canAssign" class="mt-4">
            <label :for="`${uid}-assign`" class="mb-1.5 block text-[13px] font-medium text-lumia-ink">{{ product.recipeId ? 'Cambiar receta' : 'Asignar receta' }}</label>
            <SearchPicker :id="`${uid}-assign`" :search="searchRecipes" placeholder="Buscar receta activa…" :disabled="busy" @pick="(o) => assign(o.value)" />
          </div>
        </BaseCard>

        <BaseCard class="xl:col-span-2" title="Variantes" description="Precio actual en la tienda y último precio sugerido enviado a aprobación (IVA incluido; los anteriores a la regla con IVA no lo incluían).">
          <div class="overflow-x-auto">
            <table class="w-full text-[13px]">
              <caption class="sr-only">Variantes y recetas</caption>
              <thead class="text-left text-[12px] text-lumia-ink/55">
                <tr class="border-b border-lumia-ink/[0.08]">
                  <th scope="col" class="py-2 pr-3 font-medium">Variante</th>
                  <th scope="col" class="py-2 pr-3 text-right font-medium">Precio actual</th>
                  <th scope="col" class="py-2 pr-3 text-right font-medium">Sugerido</th>
                  <th scope="col" class="py-2 pr-3 font-medium">Receta</th>
                  <th scope="col" class="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-lumia-ink/[0.05]">
                <tr v-for="v in product.variants" :key="v.sku">
                  <td class="py-2 pr-3">
                    <span class="block text-lumia-ink">{{ v.label }}</span>
                    <code class="block text-[11px] text-lumia-ink/45">{{ v.sku }}</code>
                  </td>
                  <td class="py-2 pr-3 text-right tabular-nums">{{ formatCurrency(v.price) }}</td>
                  <td class="py-2 pr-3 text-right tabular-nums text-lumia-ink/70">{{ v.lastSuggestedPrice ? formatCurrency(v.lastSuggestedPrice) : '—' }}</td>
                  <td class="py-2 pr-3">
                    <span v-if="v.recipeId" class="text-lumia-ink/80">{{ recipeName(v.recipeId) }} <BaseBadge tone="gold">Propia</BaseBadge></span>
                    <span v-else-if="product.recipeId" class="text-lumia-ink/55">Del producto</span>
                    <span v-else class="text-[12px] text-status-warning">Sin receta</span>
                    <div v-if="canOverride" class="mt-1 flex gap-1">
                      <BaseButton variant="ghost" size="sm" :disabled="busy" @click="overrideSku = overrideSku === v.sku ? null : v.sku">{{ overrideSku === v.sku ? 'Cancelar' : 'Receta propia' }}</BaseButton>
                      <BaseButton v-if="v.recipeId" variant="ghost" size="sm" :disabled="busy" @click="setVariantRecipe(v.sku, null)">Usar la del producto</BaseButton>
                    </div>
                    <SearchPicker v-if="overrideSku === v.sku" :id="`${uid}-v-${v.sku}`" class="mt-1" :search="searchRecipes" placeholder="Buscar receta…" :disabled="busy" @pick="(o) => setVariantRecipe(v.sku, o.value)" />
                  </td>
                  <td class="py-2 text-[12px] text-lumia-ink/60">{{ statusLabel(v.pricingStatus) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

      <BaseCard v-if="lastResult" class="mt-6" title="Resultado del envío" :description="`${lastResult.reposted} enviada(s) a aprobación · ${lastResult.skipped} sin cambios`">
        <ul class="space-y-1.5 text-[13px]">
          <li v-for="r in lastResult.results" :key="r.variantSku" class="flex flex-wrap items-baseline gap-x-2">
            <code class="text-lumia-ink/70">{{ r.variantSku }}</code>
            <template v-if="r.skipped"><span class="text-lumia-ink/55">— {{ r.skipReason }}</span></template>
            <template v-else><span class="tabular-nums">{{ formatCurrency(r.currentPrice) }} → {{ formatCurrency(r.suggestedPrice) }} (IVA incluido)</span></template>
          </li>
          <li v-for="e in lastResult.errors" :key="e" class="text-status-danger">{{ e }}</li>
        </ul>
        <BaseButton v-if="lastResult.reposted && canReadApprovals" class="mt-4" variant="secondary" size="sm" to="/production/approvals">Ir a aprobaciones</BaseButton>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconSend } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { PricingProductDetail, RepostResult } from '#shared/schemas/costing'
import type { RecipeDetail, RecipeList } from '#shared/schemas/recipes'

definePageMeta({
  layout: 'admin',
  title: 'Precio de producto',
  permissions: [PERMISSIONS.RECIPES_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Precios', to: '/production/pricing' }, { label: 'Producto' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const uid = useId()

const id = computed(() => String(route.params.id ?? ''))
const canAssign = computed(() => auth.can(PERMISSIONS.RECIPES_UPDATE))
const canOverride = computed(() => auth.can(PERMISSIONS.PRODUCTS_UPDATE))
const canSubmit = computed(() => auth.can(PERMISSIONS.COSTING_MANAGE))
const canReadApprovals = computed(() => auth.can(PERMISSIONS.COSTING_READ))
const canReadProducts = computed(() => auth.can(PERMISSIONS.PRODUCTS_READ))

const { data: product, status, error, refresh } = useAsyncData<PricingProductDetail>(
  () => `admin-pricing-${id.value}`,
  () => request<PricingProductDetail>(`/api/admin/production/pricing/products/${id.value}`),
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))
useHead({ title: () => (product.value ? `Precio · ${product.value.name} · Lumia Admin` : 'Precio · Lumia Admin') })

const hasAnyRecipe = computed(() => Boolean(product.value && (product.value.recipeId || product.value.variants.some((v) => v.recipeId))))

// ---------- Nombres de receta ----------
const recipeNames = ref<Record<string, string>>({})
watch(
  () => [product.value?.recipeId, ...(product.value?.variants.map((v) => v.recipeId) ?? [])].filter((x): x is string => Boolean(x)),
  async (ids) => {
    for (const rid of new Set(ids)) {
      if (recipeNames.value[rid]) continue
      try {
        const r = await request<RecipeDetail>(`/api/admin/production/recipes/${rid}`)
        recipeNames.value = { ...recipeNames.value, [rid]: `${r.name} (v${r.version})` }
      } catch {
        recipeNames.value = { ...recipeNames.value, [rid]: 'Receta no encontrada' }
      }
    }
  },
  { immediate: true },
)
const recipeName = (rid: string) => recipeNames.value[rid] ?? '…'

async function searchRecipes(term: string) {
  const res = await request<RecipeList>('/api/admin/production/recipes', { query: { search: term || undefined, limit: 25 } })
  return res.items.filter((r) => r.isActive).map((r) => ({ value: r.id, label: r.name, hint: `${r.productName || r.productSlug} · v${r.version}` }))
}

const STATUS_TEXT: Record<string, string> = { pending_approval: 'En aprobación', published: 'Publicado', approved: 'Aprobado' }
const statusLabel = (s: string | null) => (s ? (STATUS_TEXT[s] ?? s) : '—')

// ---------- Acciones ----------
const busy = ref(false)
const overrideSku = ref<string | null>(null)

async function run(action: () => Promise<PricingProductDetail>, ok: string) {
  if (busy.value) return
  busy.value = true
  try {
    product.value = await action()
    toast.success(ok)
  } catch (e) {
    toast.error('No se pudo completar la acción', toUiError(e).message)
  } finally {
    busy.value = false
    overrideSku.value = null
  }
}

const assign = (recipeId: string) =>
  run(() => request<PricingProductDetail>(`/api/admin/production/pricing/products/${id.value}/recipe`, { method: 'POST', body: { recipeId } }), 'Receta asignada')

async function unassign() {
  const ok = await confirm({ title: 'Quitar la receta del producto', description: 'Las variantes sin receta propia quedarán sin costeo. Los precios de la tienda no cambian.', confirmLabel: 'Quitar' })
  if (ok) await run(() => request<PricingProductDetail>(`/api/admin/production/pricing/products/${id.value}/recipe`, { method: 'DELETE' }), 'Receta quitada')
}

const setVariantRecipe = (sku: string, recipeId: string | null) =>
  run(
    () => request<PricingProductDetail>(`/api/admin/production/pricing/products/${id.value}/variants/${encodeURIComponent(sku)}/recipe`, { method: 'PUT', body: { recipeId } }),
    recipeId ? 'Receta asignada a la variante' : 'La variante usa la receta del producto',
  )

const submitting = ref(false)
const lastResult = shallowRef<RepostResult | null>(null)
async function submit() {
  if (!product.value || submitting.value) return
  const ok = await confirm({
    title: 'Enviar a aprobación',
    description: 'Se recalcula el costo de cada variante con receta y se crea una solicitud con el precio sugerido. Los precios de la tienda no cambian hasta que alguien apruebe y publique.',
    confirmLabel: 'Enviar',
  })
  if (!ok) return
  submitting.value = true
  try {
    const res = await request<{ result: RepostResult; product: PricingProductDetail }>(`/api/admin/production/pricing/products/${id.value}/submit`, { method: 'POST' })
    product.value = res.product
    lastResult.value = res.result
    if (res.result.errors.length) toast.error('Algunas variantes no se pudieron enviar', `${res.result.errors.length} con error`)
    else toast.success(res.result.reposted ? `${res.result.reposted} variante(s) enviadas a aprobación` : 'No había cambios que enviar')
  } catch (e) {
    toast.error('No se pudo enviar a aprobación', toUiError(e).message)
  } finally {
    submitting.value = false
  }
}
</script>
