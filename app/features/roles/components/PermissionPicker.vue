<template>
  <div class="space-y-5">
    <fieldset v-for="group in groups" :key="group.key" class="rounded-xl border border-lumia-ink/[0.07] p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <legend class="lumia-eyebrow">{{ group.label }}</legend>
        <button
          v-if="!disabled && group.permissions.some(canToggle)"
          type="button"
          class="text-[12px] font-medium text-lumia-ink/55 underline-offset-2 hover:text-lumia-ink hover:underline"
          @click="toggleGroup(group.permissions)"
        >
          {{ group.permissions.filter(canToggle).every((p) => selected.has(p)) ? 'Quitar todos' : 'Marcar todos' }}
        </button>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          v-for="permission in group.permissions"
          :key="permission"
          :for="`${baseId}-${permission}`"
          class="flex items-start gap-2.5 rounded-lg px-2 py-1.5"
          :class="canToggle(permission) && !disabled ? 'cursor-pointer hover:bg-lumia-cream/50' : 'opacity-60'"
          :title="lockedReason(permission)"
        >
          <input
            :id="`${baseId}-${permission}`"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 rounded border-lumia-ink/25 accent-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/60"
            :checked="selected.has(permission)"
            :disabled="disabled || !canToggle(permission)"
            @change="setPermission(permission, ($event.target as HTMLInputElement).checked)"
          >
          <span class="min-w-0">
            <span class="block text-[13px] text-lumia-ink">{{ actionLabel(permission) }}</span>
            <code class="block truncate text-[11px] text-lumia-ink/50">{{ permission }}</code>
          </span>
        </label>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { PERMISSION_WILDCARD } from '#shared/auth/permissions'
import { groupPermissions } from '#shared/schemas/roles'

/**
 * Selector de permisos por módulo. Solo se pueden MARCAR permisos que quien edita tiene
 * (`grantable`) o que el rol ya tenía (`original`); desmarcar siempre está permitido.
 * Misma regla que aplica el BFF (assertNoEscalation).
 */
const props = withDefaults(
  defineProps<{ original?: readonly string[]; grantable: readonly string[]; disabled?: boolean }>(),
  { original: () => [], disabled: false },
)
const model = defineModel<string[]>({ required: true })

const baseId = useId()
const groups = groupPermissions()
const selected = computed(() => new Set(model.value))
const grantableSet = computed(() =>
  props.grantable.includes(PERMISSION_WILDCARD) ? null : new Set([...props.grantable, ...props.original]),
)

function canToggle(permission: string) {
  return selected.value.has(permission) || grantableSet.value === null || grantableSet.value.has(permission)
}

function lockedReason(permission: string) {
  return canToggle(permission) ? undefined : 'No tienes este permiso: no puedes concederlo.'
}

function setPermission(permission: string, value: boolean) {
  if (value && !canToggle(permission)) return
  const next = new Set(model.value)
  if (value) next.add(permission)
  else next.delete(permission)
  model.value = [...next].sort()
}

function toggleGroup(permissions: readonly string[]) {
  const togglable = permissions.filter(canToggle)
  const allOn = togglable.every((p) => selected.value.has(p))
  const next = new Set(model.value)
  for (const p of togglable) {
    if (allOn) next.delete(p)
    else next.add(p)
  }
  model.value = [...next].sort()
}

const ACTION_LABELS: Record<string, string> = {
  read: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  manage: 'Gestionar',
  write: 'Modificar',
  access: 'Acceder al panel',
  refund: 'Reembolsar',
  view: 'Ver',
  revoke: 'Revocar',
  security: 'Seguridad',
  cart: 'Carrito',
}

function actionLabel(permission: string) {
  const parts = permission.split('.')
  const action = parts.at(-1) ?? permission
  const subject = parts.length > 2 ? parts.slice(1, -1).join(' ') : ''
  const label = ACTION_LABELS[action] ?? action
  return subject ? `${label} · ${subject}` : label
}
</script>
