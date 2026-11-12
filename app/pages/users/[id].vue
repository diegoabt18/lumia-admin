<template>
  <div>
    <div v-if="loading && !user" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !user"
      :title="loadError.status === 404 ? 'Usuario no encontrado' : 'No se pudo cargar el usuario'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="user">
      <PageHeader eyebrow="Usuario" :title="user.name || user.email">
        <template #actions>
          <BaseBadge v-if="user.isSelf" tone="info">Tu cuenta</BaseBadge>
          <BaseBadge :tone="user.isStaff ? 'gold' : 'neutral'">{{ user.isStaff ? 'Personal' : 'Cliente' }}</BaseBadge>
        </template>
      </PageHeader>

      <div class="grid gap-6 xl:grid-cols-3">
        <BaseCard class="xl:col-span-2" title="Roles asignados" :description="rolesDescription">
          <ul v-if="user.roles.length" class="divide-y divide-lumia-ink/[0.06]">
            <li v-for="role in user.roles" :key="role.id" class="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="flex flex-wrap items-center gap-2 font-medium text-lumia-ink">
                  {{ role.name }}
                  <code class="rounded bg-lumia-cream/70 px-1.5 py-0.5 text-[11px] font-normal text-lumia-ink/60">{{ role.key }}</code>
                  <BaseBadge v-if="role.isSystem" tone="neutral">Sistema</BaseBadge>
                  <BaseBadge v-if="role.isArchived" tone="warning">Archivado · sin efecto</BaseBadge>
                </p>
                <p v-if="role.description" class="mt-0.5 text-[13px] text-lumia-ink/60">{{ role.description }}</p>
              </div>
              <BaseButton
                v-if="canManage"
                variant="ghost"
                size="sm"
                :disabled="busy"
                :loading="removingId === role.id"
                @click="removeRole(role)"
              >
                <template #icon>
                  <IconX class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
                </template>
                Quitar
              </BaseButton>
            </li>
          </ul>
          <p v-else class="rounded-xl bg-lumia-cream/60 p-3 text-[13px] text-lumia-ink/70">
            Sin roles asignados: no tiene permisos en el panel hasta que se le asigne uno.
          </p>

          <div v-if="canManage" class="mt-6 border-t border-lumia-ink/[0.06] pt-5">
            <form class="flex flex-col gap-3 sm:flex-row sm:items-end" novalidate @submit.prevent="assignRole">
              <FormField label="Asignar rol" :id="selectId" :error="assignError ?? undefined" class="flex-1">
                <BaseSelect
                  :id="selectId"
                  v-model="selectedRoleId"
                  :options="roleOptions"
                  :placeholder="rolesLoading ? 'Cargando roles…' : 'Elige un rol'"
                  :disabled="rolesLoading || busy || roleOptions.length === 0"
                  :invalid="Boolean(assignError)"
                />
              </FormField>
              <BaseButton type="submit" :loading="assigning" :disabled="!selectedRoleId || busy">Asignar</BaseButton>
            </form>
            <p v-if="rolesError" class="mt-2 text-[12px] text-status-danger">{{ rolesError }}</p>
            <p v-else-if="assignable?.truncated" class="mt-2 text-[12px] text-lumia-ink/55">Se muestran los primeros 100 roles.</p>
          </div>

          <p v-else-if="user.isSelf && canManageAny" class="mt-5 rounded-xl bg-lumia-cream/60 p-3 text-[12px] text-lumia-ink/60">
            No puedes cambiar tus propios roles. Pide a otro administrador que lo haga.
          </p>
          <p v-else-if="canManageAny && !canReadRoles" class="mt-5 rounded-xl bg-lumia-cream/60 p-3 text-[12px] text-lumia-ink/60">
            Para asignar roles también necesitas el permiso de lectura de roles.
          </p>
        </BaseCard>

        <BaseCard title="Cuenta">
          <dl class="space-y-3 text-sm">
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Email</dt>
              <dd class="break-all text-lumia-ink">{{ user.email }}</dd>
            </div>
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Verificación en dos pasos</dt>
              <dd class="text-lumia-ink/80">{{ user.twoFactorEnabled ? 'Activa' : 'No configurada' }}</dd>
            </div>
            <div>
              <dt class="text-[12px] text-lumia-ink/50">Alta</dt>
              <dd class="text-lumia-ink/80">{{ user.createdAt ? formatDateTime(user.createdAt) : '—' }}</dd>
            </div>
          </dl>
        </BaseCard>
      </div>

      <BaseCard class="mt-6" title="Permisos efectivos" :description="`${user.effectivePermissions.length} permisos, calculados por el servidor (roles, herencia, denegaciones y permisos temporales).`">
        <p v-if="!user.effectivePermissions.length" class="text-[13px] text-lumia-ink/60">Sin permisos.</p>
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div v-for="group in permissionGroups" :key="group.name">
            <p class="lumia-eyebrow mb-1.5">{{ group.name }}</p>
            <div class="flex flex-wrap gap-1">
              <code
                v-for="key in group.keys"
                :key="key"
                class="rounded bg-lumia-cream/70 px-1.5 py-0.5 text-[11px] text-lumia-ink/70"
              >{{ key }}</code>
            </div>
          </div>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconX } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { AssignableRoles, RoleSummary, UserDetail } from '#shared/schemas/users'

definePageMeta({
  layout: 'admin',
  title: 'Usuario',
  permissions: [PERMISSIONS.ADMIN_USERS_READ],
  breadcrumbs: [{ label: 'Administración' }, { label: 'Usuarios', to: '/users' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))

const { data: user, status: fetchStatus, error, refresh } = useAsyncData<UserDetail>(
  () => `admin-user-${id.value}`,
  () => request<UserDetail>(`/api/admin/users/${id.value}`),
)
const loading = computed(() => fetchStatus.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))

useHead({ title: () => (user.value ? `${user.value.name || user.value.email} · Lumia Admin` : 'Usuario · Lumia Admin') })

const canManageAny = computed(() => auth.can(PERMISSIONS.ADMIN_USERS_MANAGE))
const canReadRoles = computed(() => auth.can(PERMISSIONS.ADMIN_ROLES_READ))
const canManage = computed(() => canManageAny.value && canReadRoles.value && Boolean(user.value) && !user.value?.isSelf)

const rolesDescription = 'Los cambios pueden tardar hasta 5 minutos en aplicarse: el servidor guarda los permisos en caché.'

// ---------- Roles asignables ----------
const assignable = shallowRef<AssignableRoles | null>(null)
const rolesLoading = ref(false)
const rolesError = ref<string | null>(null)

async function loadAssignable() {
  if (assignable.value || rolesLoading.value) return
  rolesLoading.value = true
  rolesError.value = null
  try {
    assignable.value = await request<AssignableRoles>('/api/admin/users/assignable-roles')
  } catch (e) {
    rolesError.value = toUiError(e).message
  } finally {
    rolesLoading.value = false
  }
}
watch(canManage, (value) => value && void loadAssignable(), { immediate: true })

const roleOptions = computed(() => {
  const assigned = new Set(user.value?.roles.map((r) => r.id) ?? [])
  return (assignable.value?.items ?? [])
    .filter((r) => !assigned.has(r.id))
    .map((r) => ({ value: r.id, label: `${r.name} (${r.key})` }))
})

// ---------- Cambios ----------
const selectId = useId()
const selectedRoleId = ref('')
const assignError = ref<string | null>(null)
const assigning = ref(false)
const removingId = ref<string | null>(null)
const busy = computed(() => assigning.value || removingId.value !== null)

async function assignRole() {
  const current = user.value
  const role = assignable.value?.items.find((r) => r.id === selectedRoleId.value)
  if (!current || !role || busy.value) return
  assignError.value = null

  const notes: string[] = []
  if (!current.isStaff) {
    notes.push('Es una cuenta de cliente: recibirá todos los permisos del rol, incluido el acceso al panel si el rol lo concede.')
  }
  notes.push('Solo puedes conceder permisos que tú también tienes. El cambio puede tardar hasta 5 minutos en aplicarse.')

  const ok = await confirm({
    title: `Asignar "${role.name}" a ${current.name || current.email}`,
    description: notes.join(' '),
    confirmLabel: 'Asignar rol',
    tone: current.isStaff ? 'default' : 'danger',
  })
  if (!ok) return

  assigning.value = true
  try {
    user.value = await request<UserDetail>(`/api/admin/users/${current.id}/roles`, {
      method: 'POST',
      body: { roleId: role.id },
    })
    selectedRoleId.value = ''
    toast.success('Rol asignado', 'Puede tardar hasta 5 minutos en aplicarse.')
  } catch (e) {
    assignError.value = toUiError(e).message
  } finally {
    assigning.value = false
  }
}

async function removeRole(role: RoleSummary) {
  const current = user.value
  if (!current || busy.value) return
  const ok = await confirm({
    title: `Quitar "${role.name}"`,
    description:
      current.roles.length === 1
        ? 'Es su único rol: perderá los permisos que le daba. El cambio puede tardar hasta 5 minutos en aplicarse.'
        : 'Perderá los permisos que solo le da este rol. El cambio puede tardar hasta 5 minutos en aplicarse.',
    confirmLabel: 'Quitar rol',
    tone: 'danger',
  })
  if (!ok) return

  removingId.value = role.id
  try {
    user.value = await request<UserDetail>(`/api/admin/users/${current.id}/roles/${role.id}`, { method: 'DELETE' })
    toast.success('Rol retirado', 'Puede tardar hasta 5 minutos en aplicarse.')
  } catch (e) {
    toast.error('No se pudo quitar el rol', toUiError(e).message)
  } finally {
    removingId.value = null
  }
}

// ---------- Permisos agrupados por módulo ----------
const permissionGroups = computed(() => {
  const groups = new Map<string, string[]>()
  for (const key of user.value?.effectivePermissions ?? []) {
    const name = key === '*' ? 'todos' : (key.split('.')[0] ?? key)
    groups.set(name, [...(groups.get(name) ?? []), key])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, keys]) => ({ name, keys }))
})
</script>
