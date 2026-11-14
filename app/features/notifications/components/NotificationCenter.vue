<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-lumia-ink/70 transition-colors hover:bg-lumia-beige/50 hover:text-lumia-ink"
      :aria-label="buttonLabel"
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-controls="notification-center-panel"
      @click="toggle"
    >
      <IconBell class="h-5 w-5" stroke-width="1.75" aria-hidden="true" />
      <span
        v-if="unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-semibold leading-none text-white"
        aria-hidden="true"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0"
    >
      <section
        v-if="open"
        id="notification-center-panel"
        role="dialog"
        aria-label="Notificaciones"
        class="absolute right-0 z-40 mt-2 flex max-h-[70vh] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-lumia-ink/[0.07] bg-white shadow-soft-lg"
        @keydown.esc="open = false"
      >
        <header class="flex items-center justify-between gap-3 border-b border-lumia-ink/[0.06] px-4 py-3">
          <h2 class="text-sm font-semibold text-lumia-ink">Notificaciones</h2>
          <span v-if="unreadCount > 0" class="text-[12px] text-lumia-ink/50">{{ unreadCount }} sin leer</span>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p v-if="loading && items.length === 0" class="flex items-center gap-2 px-4 py-6 text-sm text-lumia-ink/60">
            <BaseSpinner size="sm" />
            Cargando notificaciones…
          </p>
          <p v-else-if="error" class="px-4 py-6 text-sm text-status-danger">{{ error }}</p>
          <p v-else-if="items.length === 0" class="px-4 py-8 text-center text-sm text-lumia-ink/50">
            No tienes notificaciones.
          </p>

          <ul v-else class="divide-y divide-lumia-ink/[0.05]">
            <li v-for="item in items" :key="item.id" class="px-4 py-3" :class="item.read ? '' : 'bg-lumia-cream/40'">
              <div class="flex items-start gap-3">
                <span
                  class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  :class="item.read ? 'bg-transparent' : 'bg-lumia-ink'"
                  aria-hidden="true"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-lumia-ink">{{ item.title }}</p>
                  <p class="mt-0.5 text-[13px] leading-snug text-lumia-ink/70">{{ item.message }}</p>
                  <p class="mt-1 text-[11px] text-lumia-ink/45">
                    <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
                    <span v-if="item.reviewed"> · Revisada</span>
                  </p>

                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-if="automationTaskIdOf(item) && !item.reviewed"
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-lumia-ink px-2.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      :disabled="busyId === item.id"
                      @click="onReview(item)"
                    >
                      <IconCircleCheck class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
                      Marcar como revisado
                    </button>
                    <button
                      v-if="!item.read"
                      type="button"
                      class="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-lumia-ink/70 transition-colors hover:bg-lumia-beige/50 hover:text-lumia-ink disabled:opacity-50"
                      :disabled="busyId === item.id"
                      @click="onMarkRead(item)"
                    >
                      Marcar como leída
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { IconBell, IconCircleCheck } from '@tabler/icons-vue'
import { automationTaskIdOf, type NotificationItem } from '#shared/schemas/notifications'

const { items, unreadCount, loading, error, load, markRead, markReviewed, connect, disconnect } = useNotificationCenter()
const toast = useToast()

const open = ref(false)
const busyId = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)

const buttonLabel = computed(() =>
  unreadCount.value > 0 ? `Notificaciones, ${unreadCount.value} sin leer` : 'Notificaciones',
)

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}

function toggle() {
  open.value = !open.value
}

async function onMarkRead(item: NotificationItem) {
  busyId.value = item.id
  try {
    await markRead([item.id])
  } catch (e) {
    toast.error('No se pudo marcar la notificación', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

async function onReview(item: NotificationItem) {
  busyId.value = item.id
  try {
    await markReviewed(item)
    toast.success('Revisión confirmada')
  } catch (e) {
    toast.error('No se pudo confirmar la revisión', toUiError(e).message)
  } finally {
    busyId.value = null
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (target && root.value?.contains(target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  void load()
  connect()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  disconnect()
})
</script>
