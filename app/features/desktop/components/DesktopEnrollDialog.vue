<template>
  <BaseDialog
    v-model:open="open"
    title="Inscribir un equipo"
    description="El código sirve una sola vez durante 10 minutos. El equipo quedará a tu nombre."
    :busy="loading"
  >
    <div class="space-y-5">
      <div v-if="loading" class="flex items-center gap-2.5 text-[13px] text-lumia-ink/65" role="status">
        <BaseSpinner size="sm" tone="dark" />
        Generando código…
      </div>
      <p v-else-if="errorMessage" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ errorMessage }}
      </p>
      <div v-else-if="enrollment" class="rounded-2xl border border-lumia-gold/40 bg-lumia-cream/50 px-5 py-4 text-center">
        <p class="lumia-eyebrow">Código de inscripción</p>
        <p class="mt-2 select-all break-all font-mono text-[28px] font-semibold tracking-[0.2em] text-lumia-ink" aria-live="polite">
          {{ enrollment.code }}
        </p>
        <p class="mt-1 text-[12px]" :class="expired ? 'text-status-danger' : 'text-lumia-ink/55'">
          {{ expired ? 'Caducó. Genera otro.' : `Vence a las ${expiresAtLabel}` }}
        </p>
        <BaseButton variant="ghost" size="sm" class="mt-2" :disabled="expired" @click="copy">
          <template #icon><IconCopy class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          {{ copied ? 'Copiado' : 'Copiar' }}
        </BaseButton>
      </div>

      <ol class="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-lumia-ink/75">
        <li>Instala y abre <span class="font-medium text-lumia-ink">Lumia Desktop Agent</span> en el equipo.</li>
        <li>En «Registrar este equipo», escribe la dirección del servidor de Lumia y este código.</li>
        <li>El equipo aparecerá aquí como «Conectado» en unos segundos.</li>
      </ol>
      <p class="text-[12px] leading-relaxed text-lumia-ink/55">
        Lumi solo actuará en ese equipo cuando se lo pidas, con tus permisos, y te pedirá confirmación antes de abrir, pulsar o escribir.
      </p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" :disabled="loading" @click="generate">Generar otro</BaseButton>
      <BaseButton :disabled="loading" @click="open = false">Listo</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { IconCopy } from '@tabler/icons-vue'
import type { DesktopEnrollment } from '#shared/schemas/desktop'

/** Genera un código de inscripción al abrirse. Emite `closed` para refrescar la lista. */
const emit = defineEmits<{ closed: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const enrollment = ref<DesktopEnrollment | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const copied = ref(false)

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

const expired = computed(() => (enrollment.value ? Date.parse(enrollment.value.expiresAt) <= now.value : false))
const expiresAtLabel = computed(() =>
  enrollment.value
    ? new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(enrollment.value.expiresAt))
    : '',
)

async function generate() {
  loading.value = true
  errorMessage.value = null
  copied.value = false
  try {
    enrollment.value = await request<DesktopEnrollment>('/api/admin/desktop/enrollments', { method: 'POST', body: {} })
  } catch (error) {
    enrollment.value = null
    errorMessage.value = toUiError(error).message
  } finally {
    loading.value = false
  }
}

async function copy() {
  if (!enrollment.value) return
  try {
    await navigator.clipboard.writeText(enrollment.value.code)
    copied.value = true
  } catch {
    copied.value = false
  }
}

watch(open, (value) => {
  clearInterval(timer)
  if (value) {
    now.value = Date.now()
    timer = setInterval(() => (now.value = Date.now()), 5_000)
    void generate()
  } else {
    // El código no se conserva en pantalla al cerrar.
    enrollment.value = null
    emit('closed')
  }
})
onBeforeUnmount(() => clearInterval(timer))
</script>
