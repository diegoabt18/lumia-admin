<template>
  <div class="space-y-4">
    <TableToolbar
      :search="table.search.value"
      search-label="Buscar en accesos"
      search-placeholder="Email, IP o evento…"
      @update:search="table.setSearch"
    >
      <template #filters>
        <div
          class="inline-flex flex-wrap rounded-xl border border-lumia-ink/10 bg-white/60 p-1"
          role="group"
          aria-label="Evento"
          :title="table.search.value ? 'El servidor no combina la búsqueda con el filtro de evento.' : undefined"
        >
          <button
            v-for="opt in eventOptions"
            :key="opt.value"
            type="button"
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            :class="activeEvent === opt.value ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
            :aria-pressed="activeEvent === opt.value"
            :disabled="Boolean(table.search.value) && opt.value !== ''"
            @click="filters.setEvent(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <AuditDateRange :from="filters.from.value" :to="filters.to.value" @update="filters.setRange" />
      </template>
    </TableToolbar>

    <DataTable
      :columns="columns"
      :rows="rows"
      :row-key="(row) => row.id"
      :loading="loading"
      :error="errorMessage"
      caption="Registro de accesos"
      empty-title="Sin registros"
      :empty-description="hasFilters ? 'Prueba con otros filtros.' : undefined"
      @retry="refresh"
    >
      <template #cell-at="{ row }">
        <span class="whitespace-nowrap tabular-nums text-lumia-ink/70">{{ row.at ? formatDateTime(row.at) : '—' }}</span>
      </template>
      <template #cell-event="{ row }">
        <div class="flex flex-wrap gap-1">
          <BaseBadge :tone="EVENT_TONES[row.event]">{{ AUTH_AUDIT_EVENT_LABELS[row.event] }}</BaseBadge>
          <BaseBadge v-if="row.via2fa" tone="neutral">con 2FA</BaseBadge>
          <BaseBadge v-if="row.reuseDetected" tone="danger">Reutilización de token</BaseBadge>
        </div>
      </template>
      <template #cell-email="{ row }">
        <NuxtLink
          v-if="row.userId && canReadUsers && OBJECT_ID_PATTERN.test(row.userId)"
          :to="`/users/${row.userId}`"
          class="break-all text-lumia-ink hover:text-lumia-gold"
        >{{ row.email || row.userId }}</NuxtLink>
        <span v-else class="break-all text-lumia-ink/80">{{ row.email || '—' }}</span>
      </template>
      <template #cell-ip="{ row }">
        <code class="text-[12px] text-lumia-ink/70">{{ row.ip || '—' }}</code>
      </template>
      <template #cell-userAgent="{ row }">
        <span class="line-clamp-2 max-w-xs break-all text-[12px] text-lumia-ink/55" :title="row.userAgent ?? undefined">{{ row.userAgent || '—' }}</span>
      </template>
    </DataTable>
    <AppPagination
      v-if="pagination"
      :pagination="pagination"
      :limit-options="[25, 50, 100]"
      item-label="registros"
      :disabled="loading"
      @update:page="table.setPage"
      @update:limit="table.setLimit"
    />
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import { AUTH_AUDIT_EVENT_LABELS, AUTH_AUDIT_EVENTS, type AuthAuditRow } from '#shared/schemas/audit'
import { OBJECT_ID_PATTERN } from '#shared/schemas/common'
import type { TableColumn } from '~/types/ui'

const auth = useAuth()
const canReadUsers = computed(() => auth.can(PERMISSIONS.ADMIN_USERS_READ))

const table = useTableQuery({ allowedLimits: [25, 50, 100] })
const filters = useAuditFilters()
const activeEvent = computed(() =>
  !table.search.value && (AUTH_AUDIT_EVENTS as readonly string[]).includes(filters.event.value) ? filters.event.value : '',
)

const { rows, pagination, loading, errorMessage, refresh } = useServerList<AuthAuditRow>(
  'admin-audit-access',
  '/api/admin/audit/access',
  table,
  computed(() => ({
    event: activeEvent.value || undefined,
    from: filters.from.value || undefined,
    to: filters.to.value || undefined,
  })),
)

const hasFilters = computed(() => Boolean(table.search.value || activeEvent.value || filters.from.value || filters.to.value))

const eventOptions = [
  { value: '', label: 'Todos' },
  ...AUTH_AUDIT_EVENTS.map((value) => ({ value, label: AUTH_AUDIT_EVENT_LABELS[value] })),
]

const EVENT_TONES = {
  LOGIN_SUCCESS: 'positive',
  LOGIN_FAILED: 'warning',
  LOGIN_2FA_FAILED: 'danger',
  LOGOUT: 'neutral',
  unknown: 'neutral',
} as const

const columns: TableColumn[] = [
  { key: 'at', label: 'Fecha', class: 'w-40' },
  { key: 'event', label: 'Evento', class: 'w-48' },
  { key: 'email', label: 'Cuenta' },
  { key: 'ip', label: 'IP', class: 'w-36', hideOnMobile: true },
  { key: 'userAgent', label: 'Dispositivo', hideOnMobile: true },
]
</script>
