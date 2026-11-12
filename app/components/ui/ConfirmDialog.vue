<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.open"
        class="fixed inset-0 z-[60] flex items-end justify-center bg-lumia-black/35 p-4 backdrop-blur-[2px] sm:items-center"
        @click.self="settle(false)"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="state.description ? descriptionId : undefined"
          class="w-full max-w-md rounded-2xl border border-lumia-ink/[0.07] bg-white p-6 shadow-soft-lg"
          @keydown.esc="settle(false)"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="isDanger ? 'bg-status-danger-soft text-status-danger' : 'bg-lumia-cream text-lumia-gold'"
            >
              <IconAlertTriangle v-if="isDanger" class="h-5 w-5" stroke-width="1.5" aria-hidden="true" />
              <IconHelpCircle v-else class="h-5 w-5" stroke-width="1.5" aria-hidden="true" />
            </span>
            <div>
              <h2 :id="titleId" class="font-display text-xl text-lumia-ink">{{ state.title }}</h2>
              <p v-if="state.description" :id="descriptionId" class="mt-1 text-sm text-lumia-ink/60">
                {{ state.description }}
              </p>
            </div>
          </div>
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <BaseButton ref="cancelButton" variant="secondary" @click="settle(false)">
              {{ state.cancelLabel ?? 'Cancelar' }}
            </BaseButton>
            <BaseButton :variant="isDanger ? 'danger' : 'primary'" @click="settle(true)">
              {{ state.confirmLabel ?? 'Confirmar' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconHelpCircle } from '@tabler/icons-vue'

const { state, settle } = useConfirm()
const titleId = useId()
const descriptionId = useId()
const isDanger = computed(() => state.value.tone === 'danger')

const cancelButton = ref<{ $el: HTMLElement } | null>(null)

// Foco inicial en "Cancelar": la opción segura por defecto.
watch(
  () => state.value.open,
  async (open) => {
    if (!open) return
    await nextTick()
    cancelButton.value?.$el?.focus()
  },
)
</script>
