<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-lumia-ink/[0.06] px-4 py-2.5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-lumia-ink/70 hover:bg-lumia-beige/50 hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
        @click="emit('back')"
      >
        <IconArrowLeft class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
        Volver al chat
      </button>
      <button
        type="button"
        class="rounded-lg px-2 py-1 text-[12px] text-lumia-ink/60 hover:bg-lumia-beige/50 hover:text-lumia-ink disabled:opacity-50"
        :disabled="center.loading.value"
        @click="center.load()"
      >
        Actualizar
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <p class="px-1 pb-3 text-[12px] leading-snug text-lumia-ink/60">
        Confirma cada tarea cuando la hayas revisado. Las confirmadas dejan de aparecer en el contador.
      </p>

      <ul v-if="center.loading.value && reviews.pending.value.length === 0" class="space-y-2" aria-busy="true" aria-label="Cargando tareas">
        <li v-for="n in 2" :key="n"><BaseSkeleton class="h-20 w-full rounded-xl" /></li>
      </ul>

      <EmptyState
        v-else-if="reviews.pending.value.length === 0"
        compact
        title="No tienes tareas pendientes"
        description="Cuando Lumi tenga algo que revisar, aparecerá aquí."
      />

      <ul v-else class="space-y-2" aria-label="Tareas pendientes por revisar">
        <li
          v-for="item in reviews.pending.value"
          :key="item.id"
          class="rounded-xl border border-lumia-ink/[0.08] bg-white p-3.5"
        >
          <p class="text-[13px] font-semibold leading-snug text-lumia-ink">{{ item.title }}</p>
          <p v-if="item.message && item.message !== item.title" class="mt-1 text-[12px] leading-snug text-lumia-ink/70">
            {{ item.message }}
          </p>
          <div class="mt-2.5 flex items-center justify-between gap-3">
            <span class="text-[11px] text-lumia-ink/50">{{ formatDateTime(item.createdAt) }}</span>
            <button
              type="button"
              class="rounded-lg bg-lumia-ink px-3 py-1.5 text-[12px] font-semibold text-lumia-cream hover:bg-lumia-ink/90 disabled:cursor-wait disabled:opacity-60"
              :disabled="reviews.confirmingId.value !== null"
              @click="reviews.confirm(item)"
            >
              {{ reviews.confirmingId.value === item.id ? 'Confirmando…' : 'Confirmar' }}
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft } from '@tabler/icons-vue'

const emit = defineEmits<{ back: [] }>()
const center = useNotificationCenter()
const reviews = useLumiReviews()

onMounted(() => {
  // Al abrir la lista se recargan los avisos para no mostrar una tarea ya confirmada en otra pestaña.
  void center.load()
})
</script>
