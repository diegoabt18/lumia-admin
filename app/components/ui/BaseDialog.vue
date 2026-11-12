<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[55] flex items-end justify-center bg-lumia-black/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        @mousedown.self="requestClose"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-lumia-ink/[0.07] bg-white shadow-soft-lg outline-none sm:rounded-2xl"
          :class="sizeClass"
          @keydown.esc.stop="requestClose"
        >
          <header class="flex items-start justify-between gap-4 border-b border-lumia-ink/[0.06] px-6 py-4">
            <div>
              <h2 :id="titleId" class="font-display text-2xl leading-tight text-lumia-ink">{{ title }}</h2>
              <p v-if="description" class="mt-0.5 text-[13px] text-lumia-ink/55">{{ description }}</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lumia-ink/50 transition-colors hover:bg-lumia-beige/50 hover:text-lumia-ink disabled:opacity-40"
              aria-label="Cerrar"
              :disabled="busy"
              @click="requestClose"
            >
              <IconX class="h-5 w-5" stroke-width="1.75" aria-hidden="true" />
            </button>
          </header>
          <div class="overflow-y-auto px-6 py-5">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="flex flex-col-reverse gap-2 border-t border-lumia-ink/[0.06] px-6 py-4 sm:flex-row sm:justify-end">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { IconX } from '@tabler/icons-vue'

/**
 * Diálogo modal base para formularios. Mientras `busy` (envío en curso) no se puede cerrar,
 * para no perder el resultado de una operación en vuelo.
 */
const props = withDefaults(
  defineProps<{ title: string; description?: string; size?: 'sm' | 'md' | 'lg'; busy?: boolean }>(),
  { description: undefined, size: 'md', busy: false },
)

const open = defineModel<boolean>('open', { default: false })
const titleId = useId()
const panel = ref<HTMLElement | null>(null)

const sizeClass = computed(() => ({ sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' })[props.size])

function requestClose() {
  if (!props.busy) open.value = false
}

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  const first = panel.value?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
  ;(first ?? panel.value)?.focus()
})
</script>
