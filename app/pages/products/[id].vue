<template>
  <div>
    <div v-if="loading && !product" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !product"
      :title="loadError.status === 404 ? 'Producto no encontrado' : 'No se pudo cargar el producto'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="product">
      <PageHeader eyebrow="Producto" :title="product.name">
        <template #actions>
          <ProductStatusBadge :status="product.status" />
          <BaseButton v-if="canDelete && product.variants.length === 0" variant="secondary" size="sm" :loading="deleting" @click="onDelete">
            <template #icon>
              <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
            </template>
            Eliminar
          </BaseButton>
        </template>
      </PageHeader>

      <div class="grid gap-6 xl:grid-cols-3">
        <BaseCard class="xl:col-span-2" title="Información general" :description="canUpdate ? undefined : 'Solo lectura: no tienes permiso para editar.'">
          <form :id="formId" novalidate @submit="onSubmit">
            <ProductFormFields
              :id-prefix="formId"
              :fields="formFields"
              :errors="errors"
              :disabled="!canUpdate || isSubmitting"
              :current-category-slug="product.categorySlug"
            />
            <div v-if="canUpdate" class="mt-6 flex items-center justify-end gap-3 border-t border-lumia-ink/[0.06] pt-5">
              <span v-if="formDirty" class="text-[12px] text-lumia-ink/50">Cambios sin guardar</span>
              <BaseButton variant="secondary" :disabled="!formDirty || isSubmitting" @click="resetFromProduct">Descartar</BaseButton>
              <BaseButton type="submit" :loading="isSubmitting" :disabled="!formDirty">Guardar cambios</BaseButton>
            </div>
          </form>
        </BaseCard>

        <ProductAssistCard
          v-if="canUseLumi && canUpdate && product"
          :product-id="product.id"
          :fields="formFields"
          class="xl:order-none"
        />

        <BaseCard title="Datos del registro">
          <dl class="space-y-3 text-sm">
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Slug (no editable)</dt>
              <dd class="font-mono text-[13px] text-lumia-ink">{{ product.slug }}</dd>
            </div>
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Creado</dt>
              <dd class="text-lumia-ink/80">{{ product.createdAt ? formatDateTime(product.createdAt) : '—' }}</dd>
            </div>
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Última actualización</dt>
              <dd class="text-lumia-ink/80">{{ product.updatedAt ? formatDateTime(product.updatedAt) : '—' }}</dd>
            </div>
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Variantes</dt>
              <dd class="text-lumia-ink/80">{{ product.variants.length }}</dd>
            </div>
          </dl>
          <p v-if="product.variants.length > 0 && canDelete" class="mt-4 rounded-xl bg-lumia-cream/60 p-3 text-[12px] text-lumia-ink/60">
            Un producto con variantes no se elimina: cámbialo a <strong>Inactivo</strong> para retirarlo de la tienda.
          </p>
        </BaseCard>
      </div>

      <BaseCard v-if="canUpdate" class="mt-6" title="Ejes de opciones (Tamaño, Color, etc.)">
        <ProductOptionsEditor v-model="optionAxes" />
      </BaseCard>

      <BaseCard class="mt-6" title="Variantes y stock" description="Precio con IVA incluido. Disponible = en bodega − reservado.">
        <template v-if="canUpdate" #actions>
          <BaseButton size="sm" @click="openVariant(null)">
            <template #icon>
              <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
            </template>
            Nueva variante
          </BaseButton>
        </template>
        <DataTable
          :columns="variantColumns"
          :rows="product.variants"
          :row-key="(row) => row.sku"
          caption="Variantes del producto"
          empty-title="Este producto aún no tiene variantes"
          empty-description="Sin variantes no se puede vender en la tienda ni en el POS."
        >
          <template #cell-sku="{ row }">
            <span class="font-mono text-[12px]">{{ row.sku }}</span>
          </template>
          <template #cell-price="{ row }">
            <span class="tabular-nums">{{ formatCurrency(row.price) }}</span>
            <span v-if="row.compareAtPrice" class="ml-1 text-[12px] text-lumia-ink/40 line-through">{{ formatCurrency(row.compareAtPrice) }}</span>
          </template>
          <template #cell-available="{ row }">
            <BaseBadge v-if="row.isPerOrder" tone="info">Por pedido</BaseBadge>
            <BaseBadge v-else :tone="row.available > 0 ? 'positive' : 'danger'">{{ row.available }}</BaseBadge>
          </template>
          <template v-if="canUpdate" #actions="{ row }">
            <BaseButton variant="ghost" size="sm" @click="openVariant(row)">
              <template #icon>
                <IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only">Editar {{ row.sku }}</span>
            </BaseButton>
            <BaseButton variant="ghost" size="sm" @click="openStock(row)">
              <template #icon>
                <IconAdjustments class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Stock</span>
            </BaseButton>
            <BaseButton v-if="row.isPerOrder" variant="ghost" size="sm" @click="openDeposit(row)">
              <template #icon>
                <IconCash class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Anticipo</span>
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              :disabled="row.reserved > 0 || deletingSku === row.sku"
              :loading="deletingSku === row.sku"
              :title="row.reserved > 0 ? 'Tiene unidades reservadas por pedidos en curso' : undefined"
              @click="onDeleteVariant(row)"
            >
              <template #icon>
                <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only">Eliminar {{ row.sku }}</span>
            </BaseButton>
          </template>
        </DataTable>
      </BaseCard>

      <StockAdjustDialog v-model:open="stockOpen" :target="stockTarget" @saved="refresh" />
      <DepositPolicyDialog v-model:open="depositOpen" :target="depositTarget" @saved="refresh" />
      <VariantFormDialog
        v-model:open="variantOpen"
        :product-id="product.id"
        :variant="editingVariant"
        :axes="product.optionAxes"
        @saved="refresh"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconAdjustments, IconCash, IconPencil, IconPlus, IconTrash } from '@tabler/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { PERMISSIONS } from '#shared/auth/permissions'
import { productFormSchema, type ProductDetail, type ProductPatchBody, type VariantRow } from '#shared/schemas/products'
import type { OptionAxis } from '#shared/schemas/variants'
import type { DepositPolicyTarget, StockTarget, TableColumn } from '~/types/ui'
import ProductOptionsEditor from '~/features/products/components/ProductOptionsEditor.vue'

definePageMeta({
  layout: 'admin',
  title: 'Producto',
  permissions: [PERMISSIONS.PRODUCTS_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Productos', to: '/products' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canUpdate = computed(() => auth.can(PERMISSIONS.PRODUCTS_UPDATE))
const canDelete = computed(() => auth.can(PERMISSIONS.PRODUCTS_DELETE))

const { data: product, status: fetchStatus, error, refresh } = useAsyncData<ProductDetail>(
  () => `admin-product-${id.value}`,
  () => request<ProductDetail>(`/api/admin/products/${id.value}`),
)
const loading = computed(() => fetchStatus.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))

useHead({ title: () => (product.value ? `${product.value.name} · Lumia Admin` : 'Producto · Lumia Admin') })

// ---------- Edición ----------
const formId = useId()
const { defineField, errors, handleSubmit, isSubmitting, resetForm, setErrors, meta } = useForm({
  validationSchema: toTypedSchema(productFormSchema),
})
const [name] = defineField('name')
const [slug] = defineField('slug')
const [categorySlug] = defineField('categorySlug')
const [brand] = defineField('brand')
const [status] = defineField('status')
const [taxRate] = defineField('taxRate')
const [description] = defineField('description')
/** Objeto plano con refs: el template no las desenvuelve al pasarlo como prop. */
const formFields = { name, slug, categorySlug, brand, status, taxRate, description }

// ---------- Ejes de opciones ----------
const optionAxes = ref<OptionAxis[]>([])

function resetFromProduct() {
  const p = product.value
  if (!p) return
  resetForm({
    values: {
      name: p.name,
      slug: p.slug,
      categorySlug: p.categorySlug ?? '',
      brand: p.brand ?? '',
      status: p.status,
      taxRate: p.taxRate === null ? '' : String(p.taxRate),
      description: p.description ?? '',
    },
  })
  optionAxes.value = p.optionAxes ? JSON.parse(JSON.stringify(p.optionAxes)) : []
}
watch(product, resetFromProduct, { immediate: true })

// Detectar cambios en optionAxes también (vee-validate solo tracked form fields)
const optionAxesChanged = computed(() => {
  const p = product.value
  if (!p) return false
  const currentJson = JSON.stringify(p.optionAxes ?? [])
  const newJson = JSON.stringify(optionAxes.value)
  return currentJson !== newJson
})

const formDirty = computed(() => meta.dirty || optionAxesChanged.value)

/** Asistente de contenido: solo con lumi.use (el Server vuelve a autorizar cada petición). */
const canUseLumi = computed(() => auth.can(PERMISSIONS.LUMI_USE))

/** Solo se envían los campos modificados. */
function buildPatch(values: ReturnType<typeof productFormSchema.parse>, p: ProductDetail): ProductPatchBody | null {
  const patch: Record<string, unknown> = {}
  if (values.name !== p.name) patch.name = values.name
  if (values.description !== (p.description ?? '')) patch.description = values.description || null
  if (values.categorySlug !== (p.categorySlug ?? '')) patch.category_slug = values.categorySlug || null
  if (values.brand !== (p.brand ?? '')) patch.brand = values.brand || null
  if (values.status !== p.status) patch.status = values.status
  const tax = values.taxRate === '' ? null : Number(values.taxRate)
  if (tax !== p.taxRate) patch.tax_rate = tax

  // Comparar optionAxes con deep equality
  const currentAxesJson = JSON.stringify(p.optionAxes ?? [])
  const newAxesJson = JSON.stringify(optionAxes.value)
  if (currentAxesJson !== newAxesJson) patch.option_axes = optionAxes.value

  return Object.keys(patch).length ? (patch as ProductPatchBody) : null
}

const onSubmit = handleSubmit(async (values) => {
  const p = product.value
  if (!p) return
  const patch = buildPatch(values, p)
  if (!patch) return
  if (patch.status === 'inactive') {
    const ok = await confirm({
      title: 'Desactivar producto',
      description: 'Dejará de mostrarse y venderse en la tienda.',
      confirmLabel: 'Desactivar',
      tone: 'danger',
    })
    if (!ok) return
  }
  try {
    await request(`/api/admin/products/${p.id}`, { method: 'PATCH', body: patch })
    toast.success('Producto actualizado')
    await refresh()
  } catch (e) {
    const ui = toUiError(e)
    if (ui.status === 400 && /categor/i.test(ui.message)) setErrors({ categorySlug: ui.message })
    else toast.error('No se pudo guardar', ui.message)
  }
})

// ---------- Eliminación ----------
const deleting = ref(false)
async function onDelete() {
  const p = product.value
  if (!p || deleting.value) return
  const ok = await confirm({
    title: `Eliminar "${p.name}"`,
    description: 'El producto se eliminará de forma permanente. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deleting.value = true
  try {
    await request(`/api/admin/products/${p.id}`, { method: 'DELETE' })
    toast.success('Producto eliminado')
    await navigateTo('/products')
  } catch (e) {
    toast.error('No se pudo eliminar', toUiError(e).message)
  } finally {
    deleting.value = false
  }
}

// ---------- Variantes / stock ----------
const variantColumns: TableColumn[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'label', label: 'Variante' },
  { key: 'price', label: 'Precio', align: 'right' },
  { key: 'stock', label: 'En bodega', align: 'right', class: 'tabular-nums' },
  { key: 'reserved', label: 'Reservado', align: 'right', class: 'tabular-nums', hideOnMobile: true },
  { key: 'available', label: 'Disponible', align: 'right' },
]

const variantOpen = ref(false)
const editingVariant = ref<VariantRow | null>(null)
function openVariant(row: VariantRow | null) {
  editingVariant.value = row
  variantOpen.value = true
}

const deletingSku = ref<string | null>(null)
async function onDeleteVariant(row: VariantRow) {
  const p = product.value
  if (!p || row.reserved > 0 || deletingSku.value) return
  const ok = await confirm({
    title: `Eliminar la variante ${row.sku}`,
    description: `Se eliminarán la variante y su registro de inventario (${row.stock} unidades). Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar variante',
    tone: 'danger',
  })
  if (!ok) return
  deletingSku.value = row.sku
  try {
    await request(`/api/admin/products/${p.id}/variants/${encodeURIComponent(row.sku)}`, { method: 'DELETE' })
    toast.success('Variante eliminada', row.sku)
    await refresh()
  } catch (e) {
    toast.error('No se pudo eliminar la variante', toUiError(e).message)
  } finally {
    deletingSku.value = null
  }
}

const depositOpen = ref(false)
const depositTarget = ref<DepositPolicyTarget | null>(null)
function openDeposit(row: VariantRow) {
  depositTarget.value = { sku: row.sku, label: row.label, isPerOrder: row.isPerOrder, depositPolicy: null }
  depositOpen.value = true
}

const stockOpen = ref(false)
const stockTarget = ref<StockTarget | null>(null)
function openStock(row: VariantRow) {
  stockTarget.value = {
    sku: row.sku,
    label: row.label,
    quantity: row.stock,
    reserved: row.reserved,
    isPerOrder: row.isPerOrder,
    endpoint: `/api/admin/products/${id.value}/inventory/${encodeURIComponent(row.sku)}`,
  }
  stockOpen.value = true
}
</script>
