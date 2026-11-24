<template>
  <div class="w-full max-w-[24rem] rounded-2xl rounded-bl-md border border-lumia-gold/40 bg-white px-3.5 py-3 text-[14px] leading-relaxed text-lumia-ink">
    <p class="mb-1.5 inline-flex items-center gap-1 rounded-full bg-lumia-beige/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lumia-ink/70">
      <IconDeviceDesktop class="h-3 w-3" stroke-width="1.75" aria-hidden="true" />
      {{ confirmation.device }}
    </p>
    <p class="break-words">
      <span class="sr-only">Lumi: </span>Voy a {{ confirmation.summary }}. ¿Lo hago?
    </p>

    <p v-if="confirmation.answer" class="mt-2 text-[12px] text-lumia-ink/60" role="status">
      Respondiste: {{ ANSWER_LABEL[confirmation.answer] }}
    </p>
    <p v-else-if="!usable" class="mt-2 text-[12px] text-lumia-ink/60" role="status">
      {{ expired ? 'Esta confirmación caducó; pídelo de nuevo.' : 'Hay una confirmación más reciente; usa esa.' }}
    </p>
    <template v-else>
      <div class="mt-2.5">
        <BaseCheckbox :id="checkboxId" v-model="remember">
          <span class="text-[12px] leading-snug text-lumia-ink/75">
            No volver a preguntar para {{ confirmation.scope }} en este equipo
          </span>
        </BaseCheckbox>
      </div>
      <div class="mt-3 flex justify-end gap-2">
        <BaseButton variant="secondary" size="sm" :disabled="disabled" @click="emit('answer', 'no')">No</BaseButton>
        <BaseButton size="sm" :disabled="disabled" @click="emit('answer', remember ? 'yes_remember' : 'yes')">Sí, hazlo</BaseButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconDeviceDesktop } from '@tabler/icons-vue'
import type { LumiDesktopConfirmation } from '~/features/lumi/composables/useLumi'

/**
 * Confirmación de una acción en un equipo del usuario (Lumia Desktop Agent). La casilla solo cuenta
 * para el «sí»: «no» nunca guarda nada y la próxima vez se vuelve a preguntar. El Server decide y
 * vuelve a autorizar la operación; esta tarjeta solo envía la respuesta.
 */
const props = defineProps<{
  confirmation: LumiDesktopConfirmation
  /** Es la confirmación más reciente del chat (las anteriores ya no son válidas en el Server). */
  latest: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ answer: [answer: 'yes' | 'yes_remember' | 'no'] }>()

const ANSWER_LABEL = { yes: 'Sí', yes_remember: 'Sí, sin volver a preguntar', no: 'No' } as const

const checkboxId = useId()
const remember = ref(false)

// Reloj de la tarjeta: caduca a los 10 minutos (lo mismo que la acción pendiente en el Server).
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 15_000)
})
onBeforeUnmount(() => clearInterval(timer))

const expired = computed(() => {
  const at = Date.parse(props.confirmation.expiresAt)
  return Number.isFinite(at) && at <= now.value
})
const usable = computed(() => props.latest && !expired.value)
</script>
