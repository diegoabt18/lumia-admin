<template>
  <div>
    <PageHeader eyebrow="Tienda" title="Configuración" description="Ajustes que afectan a la tienda online y al POS." />

    <div role="tablist" aria-label="Secciones de configuración" class="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-lumia-ink/10 bg-white/60 p-1">
      <button
        v-for="tab in tabs"
        :id="`tab-${tab.key}`"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="active === tab.key"
        :aria-controls="`panel-${tab.key}`"
        class="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="active === tab.key ? 'bg-lumia-ink text-lumia-cream' : 'text-lumia-ink/65 hover:bg-lumia-beige/50 hover:text-lumia-ink'"
        @click="setTab(tab.key)"
      >
        <component :is="tab.icon" class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </div>

    <div :id="`panel-${active}`" role="tabpanel" :aria-labelledby="`tab-${active}`">
      <ShippingSettingsForm v-if="active === 'shipping'" />
      <PaymentSettingsForm v-else-if="active === 'payments'" />
      <CurrencySettingsForm v-else-if="active === 'currency'" />
      <CustomerSettingsForm v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCash, IconCreditCard, IconHeadset, IconTruckDelivery } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'

/**
 * El Server protege toda la configuración solo con admin.access (no hay permisos específicos):
 * cualquier usuario del panel puede verla y modificarla (ver docs/permissions.md).
 */
definePageMeta({
  layout: 'admin',
  title: 'Configuración',
  permissions: [PERMISSIONS.ADMIN_ACCESS],
  breadcrumbs: [{ label: 'Tienda' }, { label: 'Configuración' }],
})

type TabKey = 'shipping' | 'payments' | 'currency' | 'customer'
const tabs: { key: TabKey; label: string; icon: unknown }[] = [
  { key: 'shipping', label: 'Envíos', icon: IconTruckDelivery },
  { key: 'payments', label: 'Pagos', icon: IconCreditCard },
  { key: 'currency', label: 'Moneda', icon: IconCash },
  { key: 'customer', label: 'Atención al cliente', icon: IconHeadset },
]

const route = useRoute()
const router = useRouter()
const active = computed<TabKey>(() => {
  const t = route.query.tab
  return tabs.some((x) => x.key === t) ? (t as TabKey) : 'shipping'
})
function setTab(key: TabKey) {
  void router.replace({ query: { ...route.query, tab: key === 'shipping' ? undefined : key } })
}
</script>
