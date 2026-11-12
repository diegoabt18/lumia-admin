<template>
  <div>
    <PageHeader eyebrow="Administración" title="Auditoría" description="Registros de seguridad que guarda el servidor." />

    <div
      class="mb-5 rounded-xl border border-status-info/20 bg-status-info-soft/50 px-4 py-3 text-[13px] leading-relaxed text-status-info"
      role="note"
    >
      <p class="font-medium">Cobertura actual del servidor</p>
      <p class="mt-0.5">
        Se registran los inicios y cierres de sesión, los intentos fallidos, los permisos temporales y las importaciones de roles.
        <strong>No</strong> quedan registrados los cambios de roles, usuarios, pedidos, productos ni configuración.
      </p>
    </div>

    <div class="mb-4 flex gap-1 border-b border-lumia-ink/[0.08]" role="tablist" aria-label="Tipo de registro">
      <button
        v-for="opt in tabs"
        :id="`audit-tab-${opt.value}`"
        :key="opt.value"
        type="button"
        role="tab"
        :aria-selected="tab === opt.value"
        aria-controls="audit-panel"
        class="-mb-px border-b-2 px-4 py-2.5 text-[14px] font-medium transition-colors"
        :class="tab === opt.value ? 'border-lumia-ink text-lumia-ink' : 'border-transparent text-lumia-ink/55 hover:text-lumia-ink'"
        @click="setTab(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <BaseCard :padded="false">
      <div id="audit-panel" role="tabpanel" :aria-labelledby="`audit-tab-${tab}`" class="p-4 sm:p-5">
        <AccessAuditTable v-if="tab === 'access'" :key="'access'" />
        <PermissionAuditTable v-else :key="'permissions'" />
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'

definePageMeta({
  layout: 'admin',
  title: 'Auditoría',
  permissions: [PERMISSIONS.ADMIN_AUDIT_READ],
  breadcrumbs: [{ label: 'Administración' }, { label: 'Auditoría' }],
})

const route = useRoute()
const router = useRouter()

type Tab = 'access' | 'permissions'
const tabs: { value: Tab; label: string }[] = [
  { value: 'access', label: 'Accesos' },
  { value: 'permissions', label: 'Cambios de permisos' },
]
const tab = computed<Tab>(() => (route.query.tab === 'permissions' ? 'permissions' : 'access'))

/** Cada pestaña tiene sus propios filtros: se limpian al cambiar. */
function setTab(value: Tab) {
  if (value === tab.value) return
  void router.replace({ query: { tab: value === 'access' ? undefined : value } })
}
</script>
