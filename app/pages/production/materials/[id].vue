<template>
  <div>
    <div v-if="loading && !data" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !data"
      :title="loadError.status === 404 ? 'Material no encontrado' : 'No se pudo cargar el material'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="data">
      <PageHeader eyebrow="Material" :title="data.material.name">
        <template #actions>
          <BaseBadge :tone="data.material.active ? 'positive' : 'neutral'">{{ data.material.active ? 'Activo' : 'Inactivo' }}</BaseBadge>
          <BaseButton v-if="canDelete" variant="secondary" size="sm" :loading="deleting" @click="onDelete">
            <template #icon>
              <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
            </template>
            Eliminar
          </BaseButton>
        </template>
      </PageHeader>
      <ProductionTabs />

      <div class="grid gap-6 xl:grid-cols-3">
        <BaseCard class="xl:col-span-2" title="Ficha" :description="canUpdate ? undefined : 'Solo lectura: no tienes permiso para editar.'">
          <form :id="formId" novalidate @submit.prevent="save">
            <MaterialFormFields
              v-model:form="form"
              :id-prefix="formId"
              :errors="errors"
              :disabled="!canUpdate || saving"
              :purchase-unit-locked="data.material.hasPriceHistory || data.material.lastCost > 0"
            />
            <div v-if="canUpdate" class="mt-6 flex flex-col gap-3 border-t border-lumia-ink/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-end">
              <p v-if="formError" role="alert" class="text-[13px] text-status-danger sm:mr-auto">{{ formError }}</p>
              <span v-else-if="dirty" class="text-[12px] text-lumia-ink/50 sm:mr-auto">Cambios sin guardar</span>
              <BaseButton variant="secondary" :disabled="!dirty || saving" @click="resetForm">Descartar</BaseButton>
              <BaseButton type="submit" :loading="saving" :disabled="!dirty">Guardar cambios</BaseButton>
            </div>
          </form>
        </BaseCard>

        <div class="space-y-6">
          <BaseCard title="Costo vigente">
            <p class="font-display text-[2rem] leading-none tabular-nums text-lumia-ink">
              {{ data.material.lastCost > 0 ? formatUnitCost(data.material.lastCost) : '—' }}
            </p>
            <p class="mt-1 text-[12px] text-lumia-ink/55">por {{ data.material.purchaseUnit }}<template v-if="data.material.rollMeters"> · {{ data.material.rollMeters }} m por rollo</template></p>
            <BaseButton v-if="canUpdate" class="mt-4 w-full" @click="priceOpen = true">Registrar precio</BaseButton>
          </BaseCard>

          <BaseCard title="Proveedores">
            <ul v-if="data.material.suppliers.length" class="divide-y divide-lumia-ink/[0.06]">
              <li v-for="link in data.material.suppliers" :key="link.supplierId" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span class="min-w-0 truncate text-[14px] text-lumia-ink">
                  {{ link.supplierName || 'Proveedor eliminado' }}
                  <BaseBadge v-if="link.isPreferred" tone="gold" class="ml-1">Preferido</BaseBadge>
                </span>
                <span v-if="canUpdate" class="flex shrink-0 items-center gap-1">
                  <BaseButton v-if="!link.isPreferred" variant="ghost" size="sm" :disabled="linking" @click="linkSupplier(link.supplierId, true)">Preferir</BaseButton>
                  <BaseButton variant="ghost" size="sm" :disabled="linking" :aria-label="`Quitar ${link.supplierName}`" @click="unlinkSupplier(link.supplierId, link.supplierName)">
                    <template #icon>
                      <IconX class="h-4 w-4 text-status-danger" aria-hidden="true" />
                    </template>
                  </BaseButton>
                </span>
              </li>
            </ul>
            <p v-else class="text-[13px] text-lumia-ink/55">Sin proveedores vinculados.</p>

            <form v-if="canUpdate && canReadSuppliers" class="mt-4 flex gap-2 border-t border-lumia-ink/[0.06] pt-4" @submit.prevent="linkSupplier(selectedSupplier, false)">
              <label :for="supplierSelectId" class="sr-only">Proveedor a vincular</label>
              <BaseSelect :id="supplierSelectId" v-model="selectedSupplier" :options="supplierOptions" :placeholder="suppliersLoading ? 'Cargando…' : 'Vincular proveedor'" class="flex-1" :disabled="linking || suppliersLoading" />
              <BaseButton type="submit" variant="secondary" :disabled="!selectedSupplier" :loading="linking">Vincular</BaseButton>
            </form>
          </BaseCard>
        </div>
      </div>

      <BaseCard class="mt-6" title="Historial de precios" description="Cada registro actualiza el costo vigente.">
        <p v-if="!data.prices.length" class="text-[13px] text-lumia-ink/55">Aún no hay precios registrados.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <caption class="sr-only">Historial de precios</caption>
            <thead class="text-left text-[12px] text-lumia-ink/55">
              <tr class="border-b border-lumia-ink/[0.08]">
                <th scope="col" class="py-2 pr-3 font-medium">Fecha</th>
                <th scope="col" class="py-2 pr-3 text-right font-medium">Pagado</th>
                <th scope="col" class="py-2 pr-3 text-right font-medium">Cantidad</th>
                <th scope="col" class="py-2 pr-3 text-right font-medium">Costo unitario</th>
                <th scope="col" class="py-2 pr-3 font-medium">Proveedor</th>
                <th scope="col" class="py-2 font-medium">Factura / notas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-lumia-ink/[0.05]">
              <tr v-for="p in data.prices" :key="p.id">
                <td class="whitespace-nowrap py-2 pr-3 tabular-nums text-lumia-ink/70">{{ p.recordedAt ? formatDateTime(p.recordedAt) : '—' }}</td>
                <td class="py-2 pr-3 text-right tabular-nums">{{ formatCurrency(p.price) }}</td>
                <td class="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-lumia-ink/70">{{ p.quantity }} {{ p.unit }}</td>
                <td class="whitespace-nowrap py-2 pr-3 text-right tabular-nums font-medium">{{ formatUnitCost(p.unitCost) }}</td>
                <td class="py-2 pr-3 text-lumia-ink/70">{{ p.supplierName || '—' }}</td>
                <td class="py-2 text-lumia-ink/60">{{ [p.invoiceNumber, p.notes].filter(Boolean).join(' · ') || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <PriceEntryDialog v-model:open="priceOpen" :material="data.material" @saved="(v) => (data = v)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconTrash, IconX } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { materialPatchBodySchema, type MaterialDetail, type PriceEntry, type SupplierList } from '#shared/schemas/production'
import { emptyMaterialForm, materialFormDiff, materialToForm } from '~/features/production/materialForm'

definePageMeta({
  layout: 'admin',
  title: 'Material',
  permissions: [PERMISSIONS.MATERIALS_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Materiales', to: '/production/materials' }, { label: 'Detalle' }],
})

type Payload = { material: MaterialDetail; prices: PriceEntry[] }

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canUpdate = computed(() => auth.can(PERMISSIONS.MATERIALS_UPDATE))
const canDelete = computed(() => auth.can(PERMISSIONS.MATERIALS_DELETE))
const canReadSuppliers = computed(() => auth.can(PERMISSIONS.SUPPLIERS_READ))

const { data, status, error, refresh } = useAsyncData<Payload>(
  () => `admin-material-${id.value}`,
  () => request<Payload>(`/api/admin/production/materials/${id.value}`),
)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))
useHead({ title: () => (data.value ? `${data.value.material.name} · Lumia Admin` : 'Material · Lumia Admin') })

// ---------- Ficha ----------
const formId = useId()
const form = ref(emptyMaterialForm())
const original = ref(emptyMaterialForm())
const errors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

function resetForm() {
  if (!data.value) return
  form.value = materialToForm(data.value.material)
  original.value = materialToForm(data.value.material)
  errors.value = {}
  formError.value = null
}
watch(() => data.value?.material, resetForm, { immediate: true })

const dirty = computed(() => Object.keys(materialFormDiff(form.value, original.value)).length > 0)

async function save() {
  if (!data.value || saving.value) return
  errors.value = {}
  formError.value = null
  const patch = materialFormDiff(form.value, original.value)
  const parsed = materialPatchBodySchema.safeParse(patch)
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error)
    formError.value = 'Revisa los campos marcados.'
    return
  }
  saving.value = true
  try {
    data.value = await request<Payload>(`/api/admin/production/materials/${id.value}`, { method: 'PATCH', body: parsed.data })
    toast.success('Material actualizado')
  } catch (e) {
    const ui = toUiError(e)
    errors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}

// ---------- Precios ----------
const priceOpen = ref(false)

// ---------- Proveedores ----------
const supplierSelectId = useId()
const selectedSupplier = ref('')
const linking = ref(false)
const suppliers = shallowRef<SupplierList | null>(null)
const suppliersLoading = ref(false)

async function loadSuppliers() {
  if (suppliers.value || suppliersLoading.value) return
  suppliersLoading.value = true
  try {
    suppliers.value = await request<SupplierList>('/api/admin/production/suppliers', { query: { active: '1', limit: 200 } })
  } catch {
    suppliers.value = null
  } finally {
    suppliersLoading.value = false
  }
}
watch([canUpdate, canReadSuppliers], ([u, r]) => u && r && void loadSuppliers(), { immediate: true })

const supplierOptions = computed(() => {
  const linked = new Set(data.value?.material.suppliers.map((s) => s.supplierId) ?? [])
  return (suppliers.value?.items ?? [])
    .filter((s) => !linked.has(s.id))
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'es'))
    .map((s) => ({ value: s.id, label: s.isFavorite ? `★ ${s.name}` : s.name }))
})

async function linkSupplier(supplierId: string, isPreferred: boolean) {
  if (!data.value || !supplierId || linking.value) return
  linking.value = true
  try {
    const res = await request<{ suppliers: MaterialDetail['suppliers'] }>(`/api/admin/production/materials/${id.value}/suppliers`, {
      method: 'POST',
      body: { supplierId, isPreferred },
    })
    data.value = { ...data.value, material: { ...data.value.material, suppliers: res.suppliers } }
    selectedSupplier.value = ''
    toast.success(isPreferred ? 'Proveedor preferido actualizado' : 'Proveedor vinculado')
  } catch (e) {
    toast.error('No se pudo vincular el proveedor', toUiError(e).message)
  } finally {
    linking.value = false
  }
}

async function unlinkSupplier(supplierId: string, name: string) {
  if (!data.value || linking.value) return
  const ok = await confirm({ title: `Quitar ${name || 'proveedor'}`, description: 'Se desvincula del material. El historial de precios se conserva.', confirmLabel: 'Quitar' })
  if (!ok) return
  linking.value = true
  try {
    const res = await request<{ suppliers: MaterialDetail['suppliers'] }>(`/api/admin/production/materials/${id.value}/suppliers/${supplierId}`, { method: 'DELETE' })
    data.value = { ...data.value, material: { ...data.value.material, suppliers: res.suppliers } }
    toast.success('Proveedor desvinculado')
  } catch (e) {
    toast.error('No se pudo desvincular', toUiError(e).message)
  } finally {
    linking.value = false
  }
}

// ---------- Eliminar ----------
const deleting = ref(false)
async function onDelete() {
  if (!data.value || deleting.value) return
  const ok = await confirm({
    title: `Eliminar “${data.value.material.name}”`,
    description: 'Se eliminará de forma permanente. El servidor lo impide si alguna receta lo usa. Si solo dejó de comprarse, desactívalo.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deleting.value = true
  try {
    await request(`/api/admin/production/materials/${id.value}`, { method: 'DELETE' })
    toast.success('Material eliminado')
    await navigateTo('/production/materials')
  } catch (e) {
    toast.error('No se pudo eliminar el material', toUiError(e).message)
  } finally {
    deleting.value = false
  }
}
</script>
