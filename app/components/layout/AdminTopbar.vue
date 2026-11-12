<template>
  <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-lumia-ink/[0.06] bg-lumia-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lumia-ink/70 transition-colors hover:bg-lumia-beige/50 hover:text-lumia-ink lg:hidden"
      aria-label="Abrir menú"
      :aria-expanded="menuOpen"
      aria-controls="admin-mobile-nav"
      @click="emit('open-menu')"
    >
      <IconMenu2 class="h-5 w-5" stroke-width="1.75" aria-hidden="true" />
    </button>

    <AppBreadcrumbs class="hidden flex-1 sm:block" :items="breadcrumbs" />
    <div class="flex-1 sm:hidden" />

    <EnvironmentBadge :environment="environment" />

    <div class="relative">
      <button
        ref="userButton"
        type="button"
        class="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-lumia-beige/45"
        :aria-expanded="userMenuOpen"
        aria-haspopup="menu"
        @click="userMenuOpen = !userMenuOpen"
      >
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-lumia-cream text-sm font-semibold text-lumia-ink">
          {{ initials }}
        </span>
        <span class="hidden text-left leading-tight md:block">
          <span class="block max-w-[160px] truncate text-sm font-medium text-lumia-ink">{{ user?.displayName }}</span>
          <span class="block max-w-[160px] truncate text-[11px] text-lumia-ink/50">{{ user?.email }}</span>
        </span>
        <IconChevronDown class="hidden h-4 w-4 text-lumia-ink/40 md:block" aria-hidden="true" />
      </button>

      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-75 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="userMenuOpen"
          role="menu"
          class="absolute right-0 mt-2 w-60 rounded-xl border border-lumia-ink/[0.07] bg-white p-1.5 shadow-soft-lg"
          @keydown.esc="userMenuOpen = false"
        >
          <div class="px-3 py-2 md:hidden">
            <p class="truncate text-sm font-medium text-lumia-ink">{{ user?.displayName }}</p>
            <p class="truncate text-[12px] text-lumia-ink/50">{{ user?.email }}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-lumia-ink/80 transition-colors hover:bg-lumia-cream/70 hover:text-lumia-ink disabled:opacity-50"
            :disabled="signingOut"
            @click="onLogout"
          >
            <BaseSpinner v-if="signingOut" size="sm" />
            <IconLogout v-else class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>

<script setup lang="ts">
import { IconChevronDown, IconLogout, IconMenu2 } from '@tabler/icons-vue'
import type { ServerEnvironment } from '#shared/types/environment'
import type { Crumb } from '~/types/ui'

defineProps<{ breadcrumbs: Crumb[]; environment: ServerEnvironment | null; menuOpen: boolean }>()
const emit = defineEmits<{ 'open-menu': [] }>()

const auth = useAuth()
const { confirm } = useConfirm()
const user = auth.user
const userMenuOpen = ref(false)
const signingOut = ref(false)
const userButton = ref<HTMLElement | null>(null)

const initials = computed(() => {
  const name = user.value?.displayName ?? ''
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'L'
})

async function onLogout() {
  userMenuOpen.value = false
  const ok = await confirm({
    title: 'Cerrar sesión',
    description: 'Se cerrará tu sesión en Lumia Admin en este navegador. Tu sesión en la tienda no se ve afectada.',
    confirmLabel: 'Cerrar sesión',
  })
  if (!ok) return
  signingOut.value = true
  try {
    await auth.logout()
  } finally {
    signingOut.value = false
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!userMenuOpen.value) return
  const target = event.target as Node | null
  if (target && userButton.value?.parentElement?.contains(target)) return
  userMenuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
