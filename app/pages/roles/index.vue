<template>
  <div>
    <PageHeader eyebrow="Administración" title="Roles y permisos" description="Conjuntos de permisos que se asignan a los usuarios del panel.">
      <template v-if="canManage" #actions>
        <BaseButton @click="createOpen = true">
          <template #icon>
            <IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" />
          </template>
          Nuevo rol
        </BaseButton>
      </template>
    </PageHeader>

    <BaseCard :padded="false">
      <div class="space-y-4 p-4 sm:p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="inline-flex w-fit rounded-xl border border-lumia-ink/10 bg-white/60 p-1" role="group" aria-label="Estado">
            <button
              v-for="opt in viewOptions"
              :key="opt.value"
              type="button"
              class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
              :class="view === opt.value ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
              :aria-pressed="view === opt.value"
              @click="view = opt.value"
            >
              {{ opt.label }} <span class="tabular-nums opacity-60">{{ counts[opt.value] }}</span>
            </button>
          </div>
          <p v-if="data?.truncated" class="text-[12px] text-status-warning">Hay más de 100 roles activos: algunos conteos no están disponibles.</p>
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :row-key="(row) => row.id"
          :loading="loading"
          :error="errorMessage"
          caption="Roles"
          :empty-title="view === 'archived' ? 'No hay roles archivados' : 'Aún no hay roles'"
          @retry="refresh"
        >
          <template #cell-name="{ row }">
            <NuxtLink :to="`/roles/${row.id}`" class="group block min-w-0">
              <span class="block truncate font-medium text-lumia-ink group-hover:text-lumia-gold">{{ row.name }}</span>
              <code class="block truncate text-[11px] text-lumia-ink/45">{{ row.key }}</code>
            </NuxtLink>
          </template>
          <template #cell-flags="{ row }">
            <div class="flex flex-wrap gap-1">
              <BaseBadge v-if="row.isSystem" tone="neutral">Sistema</BaseBadge>
              <BaseBadge v-if="row.isArchived" tone="warning">Archivado</BaseBadge>
              <BaseBadge v-if="row.inheritedByCount" tone="info">Heredado por {{ row.inheritedByCount }}</BaseBadge>
            </div>
          </template>
          <template #cell-permissionCount="{ row }">
            <span class="tabular-nums text-lumia-ink/70">{{ row.permissionCount }}</span>
          </template>
          <template #cell-assignedUserCount="{ row }">
            <span class="tabular-nums text-lumia-ink/70">{{ row.assignedUserCount ?? '—' }}</span>
          </template>
          <template #cell-updatedAt="{ row }">
            <span class="whitespace-nowrap tabular-nums text-lumia-ink/60">{{ row.updatedAt ? formatDateTime(row.updatedAt) : '—' }}</span>
          </template>
        </DataTable>
      </div>
    </BaseCard>

    <RoleIdentityDialog v-model:open="createOpen" :source="null" @created="(id) => navigateTo(`/roles/${id}`)" />
  </div>
</template>

<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { RoleList } from '#shared/schemas/roles'
import type { TableColumn } from '~/types/ui'

definePageMeta({
  layout: 'admin',
  title: 'Roles y permisos',
  permissions: [PERMISSIONS.ADMIN_ROLES_READ],
  breadcrumbs: [{ label: 'Administración' }, { label: 'Roles y permisos' }],
})

const auth = useAuth()
const { request } = useAdminApi()
const canManage = computed(() => auth.can(PERMISSIONS.ADMIN_ROLES_MANAGE))

const { data, status, error, refresh } = useAsyncData<RoleList>('admin-roles', () => request<RoleList>('/api/admin/roles'))
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

const view = ref<'active' | 'archived'>('active')
const viewOptions = [
  { value: 'active' as const, label: 'Activos' },
  { value: 'archived' as const, label: 'Archivados' },
]
const counts = computed(() => {
  const items = data.value?.items ?? []
  return { active: items.filter((r) => !r.isArchived).length, archived: items.filter((r) => r.isArchived).length }
})
const rows = computed(() => (data.value?.items ?? []).filter((r) => r.isArchived === (view.value === 'archived')))

const columns: TableColumn[] = [
  { key: 'name', label: 'Rol' },
  { key: 'flags', label: 'Estado' },
  { key: 'permissionCount', label: 'Permisos', align: 'right', class: 'w-24' },
  { key: 'assignedUserCount', label: 'Usuarios', align: 'right', class: 'w-24' },
  { key: 'updatedAt', label: 'Actualizado', class: 'w-40', hideOnMobile: true },
]

const createOpen = ref(false)
</script>
