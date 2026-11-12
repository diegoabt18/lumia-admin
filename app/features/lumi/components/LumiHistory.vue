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
        :disabled="lumi.historyLoading.value"
        @click="lumi.loadHistory()"
      >
        Actualizar
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <ul v-if="lumi.historyLoading.value && lumi.conversations.value.length === 0" class="space-y-2" aria-busy="true" aria-label="Cargando historial">
        <li v-for="n in 3" :key="n"><BaseSkeleton class="h-14 w-full rounded-xl" /></li>
      </ul>

      <ErrorState
        v-else-if="lumi.historyError.value && lumi.conversations.value.length === 0"
        title="No se pudo cargar el historial"
        :message="lumi.historyError.value"
        :retrying="lumi.historyLoading.value"
        @retry="lumi.loadHistory()"
      />

      <EmptyState
        v-else-if="lumi.conversations.value.length === 0"
        compact
        title="Aún no tienes conversaciones"
        description="Las conversaciones que inicies con Lumi aparecerán aquí."
      />

      <ul v-else class="space-y-1.5" aria-label="Conversaciones guardadas">
        <li
          v-for="conversation in lumi.conversations.value"
          :key="conversation.id"
          class="group flex items-center gap-1 rounded-xl border border-transparent transition-colors hover:border-lumia-ink/10 hover:bg-lumia-canvas"
          :class="lumi.conversationId.value === conversation.id ? 'border-lumia-gold/40 bg-lumia-cream/50' : ''"
        >
          <button
            type="button"
            class="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
            @click="lumi.openConversation(conversation.id)"
          >
            <span class="block truncate text-[13px] font-medium text-lumia-ink">{{ conversation.title }}</span>
            <span class="mt-0.5 block text-[11px] text-lumia-ink/55">
              {{ formatDateTime(conversation.updatedAt) }} · {{ conversation.messageCount }} mensajes
            </span>
          </button>
          <button
            type="button"
            class="mr-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lumia-ink/50 hover:bg-status-danger-soft hover:text-status-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
            :aria-label="`Eliminar la conversación ${conversation.title}`"
            title="Eliminar"
            @click="lumi.deleteConversation(conversation.id)"
          >
            <IconTrash class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft, IconTrash } from '@tabler/icons-vue'

const emit = defineEmits<{ back: [] }>()
const lumi = useLumi()

onMounted(() => {
  if (lumi.conversations.value.length === 0) void lumi.loadHistory()
})
</script>
