<template>
  <div class="min-h-screen bg-lumia-canvas">
    <!-- Sidebar escritorio -->
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-lumia-ink/[0.06] bg-white/70 backdrop-blur-sm lg:block">
      <AdminSidebar />
    </aside>

    <!-- Drawer móvil -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="mobileOpen" class="fixed inset-0 z-50 bg-lumia-black/30 backdrop-blur-[2px] lg:hidden" aria-hidden="true" @click="mobileOpen = false" />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="-translate-x-full"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="mobileOpen"
        id="admin-mobile-nav"
        class="fixed inset-y-0 left-0 z-[51] w-[min(85vw,280px)] border-r border-lumia-ink/[0.06] bg-lumia-canvas shadow-soft-lg lg:hidden"
        aria-label="Navegación"
        @keydown.esc="mobileOpen = false"
      >
        <button
          type="button"
          class="absolute right-3 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lumia-ink/60 hover:bg-lumia-beige/50"
          aria-label="Cerrar menú"
          @click="mobileOpen = false"
        >
          <IconX class="h-5 w-5" stroke-width="1.75" aria-hidden="true" />
        </button>
        <AdminSidebar @navigate="mobileOpen = false" />
      </aside>
    </Transition>

    <!-- Asistente Lumi: solo para quien tiene lumi.use. El Server vuelve a autorizar cada petición. -->
    <LumiWidget v-if="canUseLumi" />

    <div class="lg:pl-[256px]">
      <!-- Aviso permanente cuando el Server opera sobre la base de datos de producción -->
      <div
        v-if="environment?.databaseTier === 'production'"
        role="status"
        class="flex items-center justify-center gap-2 bg-status-danger px-4 py-1.5 text-center text-[12px] font-medium text-white"
      >
        <IconAlertTriangle class="h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
        Conectado a datos de PRODUCCIÓN: los cambios afectan la tienda real.
      </div>
      <AdminTopbar
        :breadcrumbs="breadcrumbs"
        :environment="environment"
        :menu-open="mobileOpen"
        @open-menu="mobileOpen = true"
      />
      <main id="contenido" class="mx-auto w-full max-w-content px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <slot />
      </main>
    </div>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconX } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import type { ServerEnvironment } from '#shared/types/environment'
import type { Crumb } from '~/types/ui'

const route = useRoute()
const { request } = useAdminApi()
const auth = useAuth()
const mobileOpen = ref(false)

const canUseLumi = computed(() => auth.can(PERMISSIONS.LUMI_USE))

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

const breadcrumbs = computed<Crumb[]>(() => route.meta.breadcrumbs ?? (route.meta.title ? [{ label: route.meta.title }] : []))

useHead({
  title: () => (route.meta.title ? `${route.meta.title} · Lumia Admin` : 'Lumia Admin'),
})

/** Entorno del Server: si falla, el panel sigue funcionando sin la insignia. */
const { data: environment } = useAsyncData<ServerEnvironment | null>(
  'server-environment',
  async () => {
    try {
      return await request<ServerEnvironment>('/api/admin/environment')
    } catch {
      return null
    }
  },
  { default: () => null },
)
</script>
