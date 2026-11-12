<template>
  <div>
    <PageHeader eyebrow="Producción" title="Unidades" description="Unidades de medida para convertir cantidades de recetas a la unidad de compra.">
      <template v-if="canCreate" #actions>
        <BaseButton @click="openDialog(null)">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nueva unidad
        </BaseButton>
      </template>
    </PageHeader>
    <ProductionTabs />

    <p class="mb-5 rounded-xl border border-status-info/20 bg-status-info-soft/50 px-4 py-3 text-[13px] text-status-info" role="note">
      La abreviatura, la familia y el factor no se pueden cambiar ni eliminar desde aquí: intervienen en el costo de las recetas y el servidor no lo recalcula al modificarlos.
    </p>

    <BaseCard :padded="false">
      <div class="p-4 sm:p-5">
        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Unidades"
          empty-title="Sin unidades"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <span class="font-medium text-lumia-ink">{{ row.name }}</span>
          </template>
          <template #cell-abbreviation="{ row }">
            <code class="rounded bg-lumia-cream/70 px-1.5 py-0.5 text-[12px] text-lumia-ink/70">{{ row.abbreviation }}</code>
          </template>
          <template #cell-family="{ row }">{{ UNIT_FAMILY_LABELS[row.family] }}</template>
          <template #cell-baseFactor="{ row }"><span class="tabular-nums">{{ row.baseFactor }}</span></template>
          <template #cell-active="{ row }">
            <BaseBadge :tone="row.active ? 'positive' : 'neutral'">{{ row.active ? 'Activa' : 'Inactiva' }}</BaseBadge>
          </template>
          <template v-if="canUpdate" #actions="{ row }">
            <BaseButton variant="ghost" size="sm" @click="openDialog(row)">
              <template #icon>
                <IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              <span class="sr-only md:not-sr-only">Editar</span>
            </BaseButton>
          </template>
        </DataTable>
      </div>
    </BaseCard>

    <UnitFormDialog v-model:open="dialogOpen" :unit="editing" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { UNIT_FAMILIES, UNIT_FAMILY_LABELS, type UnitRow } from '#shared/schemas/production'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Unidades',
  permissions: [PERMISSIONS.UNITS_READ],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Unidades' }],
})

const auth = useAuth()
const { request } = useAdminApi()
const canCreate = computed(() => auth.can(PERMISSIONS.UNITS_CREATE))
const canUpdate = computed(() => auth.can(PERMISSIONS.UNITS_UPDATE))

const { data, status, error, refresh } = useAsyncData('admin-production-units', () => request<{ items: UnitRow[] }>('/api/admin/production/units'))
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))
const rows = computed(() =>
  [...(data.value?.items ?? [])].sort(
    (a, b) => UNIT_FAMILIES.indexOf(a.family) - UNIT_FAMILIES.indexOf(b.family) || a.sortOrder - b.sortOrder,
  ),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Unidad' },
  { key: 'abbreviation', label: 'Abreviatura', class: 'w-32' },
  { key: 'family', label: 'Familia', class: 'w-32' },
  { key: 'baseFactor', label: 'Factor', align: 'right', class: 'w-28', hideOnMobile: true },
  { key: 'active', label: 'Estado', class: 'w-28' },
]

const dialogOpen = ref(false)
const editing = ref<UnitRow | null>(null)
function openDialog(row: UnitRow | null) {
  editing.value = row
  dialogOpen.value = true
}
</script>
