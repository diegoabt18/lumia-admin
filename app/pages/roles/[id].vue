<template>
  <div>
    <div v-if="loading && !role" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-64 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !role"
      :title="loadError.status === 404 ? 'Rol no encontrado' : 'No se pudo cargar el rol'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="role">
      <PageHeader eyebrow="Rol" :title="role.name">
        <template #actions>
          <BaseBadge v-if="role.isSystem" tone="neutral">Sistema</BaseBadge>
          <BaseBadge v-if="role.isArchived" tone="warning">Archivado</BaseBadge>
          <template v-if="canManage">
            <BaseButton variant="secondary" size="sm" :disabled="busy" @click="duplicateOpen = true">
              <template #icon>
                <IconCopy class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              Duplicar
            </BaseButton>
            <BaseButton v-if="role.isArchived" variant="secondary" size="sm" :loading="acting === 'restore'" :disabled="busy" @click="restore">
              <template #icon>
                <IconArchiveOff class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              </template>
              Restaurar
            </BaseButton>
            <template v-else-if="!role.isSystem">
              <BaseButton
                variant="secondary"
                size="sm"
                :loading="acting === 'archive'"
                :disabled="busy || !detachable"
                :title="detachBlockedReason ?? undefined"
                @click="archive"
              >
                <template #icon>
                  <IconArchive class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
                </template>
                Archivar
              </BaseButton>
              <BaseButton
                variant="secondary"
                size="sm"
                :loading="acting === 'delete'"
                :disabled="busy || !detachable"
                :title="detachBlockedReason ?? undefined"
                @click="remove"
              >
                <template #icon>
                  <IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" />
                </template>
                Eliminar
              </BaseButton>
            </template>
          </template>
        </template>
      </PageHeader>

      <p
        v-if="role.isArchived"
        class="mb-5 rounded-xl border border-status-warning/20 bg-status-warning-soft/50 px-4 py-3 text-[13px] text-status-warning"
      >
        El servidor ignora este rol mientras está archivado. Restáuralo para editarlo; si conserva asignaciones antiguas, sus permisos volverán a aplicarse.
      </p>

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <BaseCard title="Información" :description="editable ? undefined : readOnlyReason">
            <div class="space-y-5">
              <FormField :id="`${formId}-name`" label="Nombre" :error="fieldErrors.name" required>
                <template #default="{ id, invalid, describedBy }">
                  <BaseInput :id="id" v-model="form.name" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="!editable || saving" />
                </template>
              </FormField>
              <FormField :id="`${formId}-description`" label="Descripción" :error="fieldErrors.description">
                <template #default="{ id, invalid, describedBy }">
                  <BaseTextarea :id="id" v-model="form.description" :rows="3" maxlength="500" :invalid="invalid" :described-by="describedBy" :disabled="!editable || saving" />
                </template>
              </FormField>
            </div>
          </BaseCard>

          <BaseCard title="Permisos" :description="permissionsDescription">
            <PermissionPicker
              v-if="catalogGroups.length"
              v-model="form.permissionKeys"
              :groups="catalogGroups"
              :original="role.permissionKeys"
              :grantable="auth.session.value?.permissions ?? []"
              :disabled="!editable || role.isSystem || saving"
            />
            <p v-else-if="catalogError" class="text-[13px] text-status-danger">{{ catalogError }}</p>
            <p v-else class="text-[13px] text-lumia-ink/60">Cargando permisos…</p>
            <p v-if="fieldErrors.permissionKeys" class="mt-3 text-[12px] text-status-danger">{{ fieldErrors.permissionKeys }}</p>
          </BaseCard>
        </div>

        <div class="space-y-6">
          <BaseCard title="Uso">
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-[12px] text-lumia-ink/50">Clave (no editable)</dt>
                <dd class="font-mono text-[13px] text-lumia-ink">{{ role.key }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-lumia-ink/50">Usuarios asignados</dt>
                <dd class="text-lumia-ink/80">{{ role.assignedUserCount ?? 'No disponible' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-lumia-ink/50">Permisos efectivos</dt>
                <dd class="text-lumia-ink/80">{{ role.effectiveAllow.length }} <span class="text-[12px] text-lumia-ink/50">(propios + heredados − denegados)</span></dd>
              </div>
              <div v-if="role.inheritsFrom.length">
                <dt class="text-[12px] text-lumia-ink/50">Hereda de</dt>
                <dd class="mt-1 flex flex-wrap gap-1">
                  <NuxtLink v-for="parent in role.inheritsFrom" :key="parent.id" :to="`/roles/${parent.id}`">
                    <BaseBadge tone="info">{{ parent.name }}</BaseBadge>
                  </NuxtLink>
                </dd>
              </div>
              <div v-if="role.inheritedBy.length">
                <dt class="text-[12px] text-lumia-ink/50">Heredado por</dt>
                <dd class="mt-1 flex flex-wrap gap-1">
                  <NuxtLink v-for="child in role.inheritedBy" :key="child.id" :to="`/roles/${child.id}`">
                    <BaseBadge tone="info">{{ child.name }}</BaseBadge>
                  </NuxtLink>
                </dd>
              </div>
              <div v-if="role.denyKeys.length">
                <dt class="text-[12px] text-lumia-ink/50">Denegados (solo lectura)</dt>
                <dd class="mt-1 flex flex-wrap gap-1">
                  <code v-for="key in role.denyKeys" :key="key" class="rounded bg-status-danger-soft/60 px-1.5 py-0.5 text-[11px] text-status-danger">{{ key }}</code>
                </dd>
              </div>
              <div>
                <dt class="text-[12px] text-lumia-ink/50">Actualizado</dt>
                <dd class="text-lumia-ink/80">{{ role.updatedAt ? formatDateTime(role.updatedAt) : '—' }} · versión {{ role.version }}</dd>
              </div>
            </dl>
            <p v-if="role.inheritsFrom.length || role.denyKeys.length" class="mt-4 rounded-xl bg-lumia-cream/60 p-3 text-[12px] text-lumia-ink/60">
              La herencia y los permisos denegados no se pueden editar: el servidor los ignora al guardar.
            </p>
          </BaseCard>
        </div>
      </div>

      <div
        v-if="editable"
        class="sticky bottom-0 z-10 mt-6 flex flex-col gap-3 rounded-2xl border border-lumia-ink/[0.08] bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-end"
      >
        <p v-if="formError" role="alert" class="text-[13px] text-status-danger sm:mr-auto">{{ formError }}</p>
        <span v-else-if="dirty" class="text-[12px] text-lumia-ink/50 sm:mr-auto">Cambios sin guardar</span>
        <div class="flex items-center justify-end gap-3">
          <BaseButton variant="secondary" :disabled="!dirty || saving" @click="resetForm">Descartar</BaseButton>
          <BaseButton :loading="saving" :disabled="!dirty" @click="save">Guardar cambios</BaseButton>
        </div>
      </div>
    </template>

    <RoleIdentityDialog v-if="role" v-model:open="duplicateOpen" :source="role" @created="(newId) => navigateTo(`/roles/${newId}`)" />
  </div>
</template>

<script setup lang="ts">
import { IconArchive, IconArchiveOff, IconCopy, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  groupPermissionCatalog,
  rolePatchBodySchema,
  type PermissionCatalogItem,
  type RoleDetail,
} from '#shared/schemas/roles'

definePageMeta({
  layout: 'admin',
  title: 'Rol',
  permissions: [PERMISSIONS.ADMIN_ROLES_READ],
  breadcrumbs: [{ label: 'Administración' }, { label: 'Roles y permisos', to: '/roles' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canManage = computed(() => auth.can(PERMISSIONS.ADMIN_ROLES_MANAGE))

const { data: role, status, error, refresh } = useAsyncData<RoleDetail>(
  () => `admin-role-${id.value}`,
  () => request<RoleDetail>(`/api/admin/roles/${id.value}`),
)
const loading = computed(() => status.value === 'pending')

/** Catálogo de permisos desde el Server: la base manda, no una lista fija en el código. */
const { data: catalog, error: catalogErr } = useAsyncData<{ items: PermissionCatalogItem[] }>(
  'admin-permission-catalog',
  () => request<{ items: PermissionCatalogItem[] }>('/api/admin/permissions'),
)
const catalogGroups = computed(() => groupPermissionCatalog(catalog.value?.items ?? []))
const catalogError = computed(() => (catalogErr.value ? toUiError(catalogErr.value).message : null))
const loadError = computed(() => (error.value ? toUiError(error.value) : null))

useHead({ title: () => (role.value ? `${role.value.name} · Lumia Admin` : 'Rol · Lumia Admin') })

const editable = computed(() => canManage.value && Boolean(role.value) && !role.value?.isArchived)
const readOnlyReason = computed(() =>
  !canManage.value ? 'Solo lectura: no tienes permiso para gestionar roles.' : 'Solo lectura mientras esté archivado.',
)
const permissionsDescription = computed(() => {
  const r = role.value
  if (!r) return undefined
  if (r.isSystem) return 'Rol de sistema: sus permisos no se pueden cambiar.'
  const users = r.assignedUserCount
  const impact = users ? `Afecta a ${users} usuario(s)${r.inheritedByCount ? ' y a los roles que lo heredan' : ''}.` : 'Ningún usuario lo tiene asignado.'
  return `${impact} Solo puedes conceder permisos que tú tienes. Los cambios tardan hasta 5 minutos en aplicarse.`
})

// ---------- Edición ----------
const formId = useId()
const form = reactive({ name: '', description: '', permissionKeys: [] as string[] })
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const saving = ref(false)

function resetForm() {
  const r = role.value
  form.name = r?.name ?? ''
  form.description = r?.description ?? ''
  form.permissionKeys = [...(r?.permissionKeys ?? [])]
  fieldErrors.value = {}
  formError.value = null
}
watch(role, resetForm, { immediate: true })

const dirty = computed(() => {
  const r = role.value
  if (!r) return false
  return (
    form.name.trim() !== r.name ||
    form.description.trim() !== (r.description ?? '') ||
    [...form.permissionKeys].sort().join(',') !== [...r.permissionKeys].sort().join(',')
  )
})

async function save() {
  const r = role.value
  if (!r || !dirty.value || saving.value) return
  const removed = r.permissionKeys.filter((k) => !form.permissionKeys.includes(k))
  const added = form.permissionKeys.filter((k) => !r.permissionKeys.includes(k))

  const body: Record<string, unknown> = { version: r.version }
  if (form.name.trim() !== r.name) body.name = form.name
  if (form.description.trim() !== (r.description ?? '')) body.description = form.description
  if (added.length || removed.length) body.permissionKeys = form.permissionKeys

  const parsed = rolePatchBodySchema.safeParse(body)
  if (!parsed.success) {
    fieldErrors.value = zodFieldErrors(parsed.error)
    formError.value = 'Revisa los campos marcados.'
    return
  }

  if ((added.length || removed.length) && (r.assignedUserCount ?? 0) + r.inheritedByCount > 0) {
    const parts: string[] = []
    if (added.length) parts.push(`concede ${added.length} permiso(s)`)
    if (removed.length) parts.push(`retira ${removed.length} permiso(s)`)
    const ok = await confirm({
      title: 'Cambiar los permisos del rol',
      description: `El cambio ${parts.join(' y ')} a ${r.assignedUserCount ?? 'los'} usuario(s) con este rol${r.inheritedByCount ? ' y a los roles que lo heredan' : ''}. Si tú tienes este rol, también te afecta. Tarda hasta 5 minutos en aplicarse.`,
      confirmLabel: 'Guardar cambios',
      tone: removed.length ? 'danger' : 'default',
    })
    if (!ok) return
  }

  saving.value = true
  fieldErrors.value = {}
  formError.value = null
  try {
    role.value = await request<RoleDetail>(`/api/admin/roles/${r.id}`, { method: 'PATCH', body: parsed.data })
    toast.success('Rol actualizado')
  } catch (e) {
    const ui = toUiError(e)
    fieldErrors.value = bffFieldErrors(ui.fieldErrors)
    formError.value = ui.message
  } finally {
    saving.value = false
  }
}

// ---------- Archivar, restaurar, eliminar ----------
const acting = ref<'archive' | 'restore' | 'delete' | null>(null)
const busy = computed(() => acting.value !== null || saving.value)
const duplicateOpen = ref(false)

/** Misma regla que assertRoleDetachable en el BFF. */
const detachBlockedReason = computed(() => {
  const r = role.value
  if (!r) return null
  if (r.assignedUserCount === null) return 'No se pudo comprobar cuántos usuarios lo tienen.'
  if (r.assignedUserCount > 0) return `Tiene ${r.assignedUserCount} usuario(s) asignado(s): quítaselo primero desde Usuarios.`
  if (r.inheritedByCount > 0) return `${r.inheritedByCount} rol(es) heredan sus permisos.`
  return null
})
const detachable = computed(() => detachBlockedReason.value === null)

async function archive() {
  const r = role.value
  if (!r || busy.value || !detachable.value) return
  const ok = await confirm({
    title: `Archivar “${r.name}”`,
    description: 'El rol dejará de aplicarse y no se podrá asignar. Puedes restaurarlo después.',
    confirmLabel: 'Archivar',
  })
  if (!ok) return
  acting.value = 'archive'
  try {
    role.value = await request<RoleDetail>(`/api/admin/roles/${r.id}/archive`, { method: 'POST' })
    toast.success('Rol archivado')
  } catch (e) {
    toast.error('No se pudo archivar el rol', toUiError(e).message)
  } finally {
    acting.value = null
  }
}

async function restore() {
  const r = role.value
  if (!r || busy.value) return
  const ok = await confirm({
    title: `Restaurar “${r.name}”`,
    description: `Volverá a aplicarse a cualquier usuario que conserve una asignación antigua (${r.effectiveAllow.length} permisos efectivos). Solo puedes restaurarlo si tú tienes todos sus permisos.`,
    confirmLabel: 'Restaurar',
  })
  if (!ok) return
  acting.value = 'restore'
  try {
    role.value = await request<RoleDetail>(`/api/admin/roles/${r.id}/restore`, { method: 'POST' })
    toast.success('Rol restaurado')
  } catch (e) {
    toast.error('No se pudo restaurar el rol', toUiError(e).message)
  } finally {
    acting.value = null
  }
}

async function remove() {
  const r = role.value
  if (!r || busy.value || !detachable.value) return
  const ok = await confirm({
    title: `Eliminar “${r.name}”`,
    description: 'El rol se eliminará de forma permanente. Esta acción no se puede deshacer. Si solo quieres dejar de usarlo, archívalo.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  acting.value = 'delete'
  try {
    await request(`/api/admin/roles/${r.id}`, { method: 'DELETE' })
    toast.success('Rol eliminado')
    await navigateTo('/roles')
  } catch (e) {
    toast.error('No se pudo eliminar el rol', toUiError(e).message)
  } finally {
    acting.value = null
  }
}
</script>
