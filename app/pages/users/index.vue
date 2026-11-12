<template>
  <div>
    <PageHeader
      eyebrow="Administración"
      title="Usuarios"
      description="Cuentas de la tienda y del personal, con sus roles y permisos efectivos."
    />

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <TableToolbar
          :search="table.search.value"
          search-label="Buscar usuarios"
          search-placeholder="Buscar por nombre o email…"
          @update:search="table.setSearch"
        >
          <template #filters>
            <div class="inline-flex rounded-xl border border-lumia-ink/10 bg-white/60 p-1" role="group" aria-label="Tipo de cuenta">
              <button
                v-for="opt in scopeOptions"
                :key="opt.value"
                type="button"
                class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
                :class="scope === opt.value ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
                :aria-pressed="scope === opt.value"
                @click="setScope(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </template>
        </TableToolbar>

        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Usuarios"
          :empty-title="table.search.value || scope ? 'Sin coincidencias' : 'Aún no hay usuarios'"
          :empty-description="table.search.value ? 'Prueba con otro término de búsqueda.' : undefined"
          @retry="refresh"
        >
          <template #cell-email="{ row }">
            <NuxtLink :to="`/users/${row.id}`" class="group block min-w-0">
              <span class="block truncate font-medium text-lumia-ink group-hover:text-lumia-gold">{{ row.name || row.email }}</span>
              <span v-if="row.name" class="block truncate text-[12px] text-lumia-ink/50">{{ row.email }}</span>
            </NuxtLink>
          </template>
          <template #cell-isStaff="{ row }">
            <BaseBadge :tone="row.isStaff ? 'gold' : 'neutral'">{{ row.isStaff ? 'Personal' : 'Cliente' }}</BaseBadge>
          </template>
          <template #cell-roles="{ row }">
            <div class="flex flex-wrap gap-1">
              <template v-if="row.roles.length">
                <BaseBadge v-for="role in row.roles" :key="role.id" :tone="role.isArchived ? 'warning' : 'info'">
                  {{ role.name }}{{ role.isArchived ? ' (archivado)' : '' }}
                </BaseBadge>
              </template>
              <span v-else class="text-[12px] text-lumia-ink/55">Rol base: {{ LEGACY_ROLE_LABELS[row.legacyRole] }}</span>
            </div>
          </template>
          <template #cell-twoFactorEnabled="{ row }">
            <BaseBadge :tone="row.twoFactorEnabled ? 'positive' : 'neutral'">{{ row.twoFactorEnabled ? 'Activo' : 'No' }}</BaseBadge>
          </template>
          <template #cell-effectivePermissionCount="{ row }">
            <span class="tabular-nums text-lumia-ink/70">{{ row.effectivePermissionCount }}</span>
          </template>
          <template #cell-createdAt="{ row }">
            <span class="whitespace-nowrap tabular-nums text-lumia-ink/60">{{ row.createdAt ? formatDateTime(row.createdAt) : '—' }}</span>
          </template>
        </DataTable>
        <AppPagination
          v-if="pagination"
          :pagination="pagination"
          :limit-options="[25, 50, 100]"
          item-label="usuarios"
          :disabled="loading"
          @update:page="table.setPage"
          @update:limit="table.setLimit"
        />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import { LEGACY_ROLE_LABELS, type UserRow } from '#shared/schemas/users'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Usuarios',
  permissions: [PERMISSIONS.ADMIN_USERS_READ],
  breadcrumbs: [{ label: 'Administración' }, { label: 'Usuarios' }],
})

const route = useRoute()
const router = useRouter()
const table = useTableQuery({ allowedLimits: [25, 50, 100] })

const scope = computed<'' | 'staff'>(() => (route.query.scope === 'staff' ? 'staff' : ''))
const scopeOptions = [
  { value: '' as const, label: 'Todos' },
  { value: 'staff' as const, label: 'Personal' },
]
function setScope(value: '' | 'staff') {
  void router.replace({ query: { ...route.query, scope: value || undefined, page: undefined } })
}

const { rows, pagination, loading, errorMessage, refresh } = useServerList<UserRow>(
  'admin-users',
  '/api/admin/users',
  table,
  computed(() => ({ staff: scope.value === 'staff' ? '1' : undefined })),
)

const columns: TableColumn[] = [
  { key: 'email', label: 'Usuario' },
  { key: 'isStaff', label: 'Tipo', class: 'w-28' },
  { key: 'roles', label: 'Roles' },
  { key: 'twoFactorEnabled', label: '2FA', class: 'w-24', hideOnMobile: true },
  { key: 'effectivePermissionCount', label: 'Permisos', align: 'right', class: 'w-24', hideOnMobile: true },
  { key: 'createdAt', label: 'Alta', class: 'w-40', hideOnMobile: true },
]
</script>
