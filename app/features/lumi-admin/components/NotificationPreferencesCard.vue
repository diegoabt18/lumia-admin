<template>
  <BaseCard
    title="Avisos en el teléfono"
    description="Qué avisos llegan a LumiChat. Aquí, en Lumia Admin, los verás siempre."
  >
    <div v-if="status === 'pending' && !form" class="space-y-3">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-10 w-full" />
    </div>
    <ErrorState v-else-if="loadError && !form" :message="loadError" @retry="refresh" />

    <form v-else-if="form" class="space-y-5" @submit.prevent="save">
      <fieldset class="space-y-3">
        <legend class="sr-only">Tipos de aviso</legend>
        <BaseSwitch
          :id="`${uid}-orders`"
          v-model="form.push.orders"
          label="Pedidos nuevos"
          description="Cada pedido de la tienda, con número, total y artículos."
          :disabled="saving"
        />
        <BaseSwitch
          :id="`${uid}-routines`"
          v-model="form.push.routines"
          label="Recordatorios y rutinas"
          description="Los que creaste con Lumi y sus segundos avisos."
          :disabled="saving"
        />
        <BaseSwitch
          :id="`${uid}-initiatives`"
          v-model="form.push.initiatives"
          label="Iniciativas de Lumi"
          description="Stock bajo, pedidos sin despachar, rutinas que fallan y caídas de Redis, la IA u Ollama."
          :disabled="saving"
        />
      </fieldset>

      <div class="space-y-3 border-t border-lumia-ink/[0.06] pt-5">
        <BaseSwitch
          :id="`${uid}-quiet`"
          v-model="form.quietHours.enabled"
          label="Horario de silencio"
          description="En ese horario no suena el teléfono; los avisos siguen guardándose aquí."
          :disabled="saving"
        />
        <div v-if="form.quietHours.enabled" class="grid max-w-sm grid-cols-2 gap-3">
          <FormField :id="`${uid}-start`" label="Desde" :error="errors.start">
            <template #default="{ id, invalid, describedBy }">
              <BaseInput :id="id" v-model="form.quietHours.start" type="time" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
          <FormField :id="`${uid}-end`" label="Hasta" :error="errors.end">
            <template #default="{ id, invalid, describedBy }">
              <BaseInput :id="id" v-model="form.quietHours.end" type="time" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
            </template>
          </FormField>
        </div>
        <p v-if="form.quietHours.enabled" class="text-[12px] text-lumia-ink/55">Hora de la tienda (Bogotá).</p>
      </div>

      <div class="flex justify-end">
        <BaseButton type="submit" size="sm" :loading="saving" :disabled="saving || !dirty">Guardar</BaseButton>
      </div>
    </form>
  </BaseCard>
</template>

<script setup lang="ts">
import { lumiNotificationPreferencesSchema, type LumiNotificationPreferences } from '#shared/schemas/lumi'

/** Preferencias de avisos de Lumi del usuario (Lumi 2.0, Fase 3.1). */
const uid = useId()
const { request } = useAdminApi()
const toast = useToast()

const { data, status, error, refresh } = useAsyncData('admin-lumi-notification-preferences', async () =>
  lumiNotificationPreferencesSchema.parse(await request<unknown>('/api/admin/lumi/notification-preferences')),
)

const form = ref<LumiNotificationPreferences | null>(null)
watch(
  data,
  (value) => {
    if (value) form.value = structuredClone(toRaw(value))
  },
  { immediate: true },
)

const loadError = computed(() => (error.value ? toUiError(error.value).message : null))
const dirty = computed(() => Boolean(form.value && data.value && JSON.stringify(form.value) !== JSON.stringify(data.value)))
const errors = reactive<{ start?: string; end?: string }>({})
const saving = ref(false)

async function save() {
  if (!form.value) return
  errors.start = undefined
  errors.end = undefined
  const parsed = lumiNotificationPreferencesSchema.safeParse(form.value)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.at(-1)
      if (field === 'start' || field === 'end') errors[field] = issue.message
    }
    return
  }
  saving.value = true
  try {
    data.value = lumiNotificationPreferencesSchema.parse(
      await request<unknown>('/api/admin/lumi/notification-preferences', { method: 'PUT', body: parsed.data }),
    )
    toast.success('Preferencias guardadas')
  } catch (e) {
    toast.error('No se pudieron guardar', toUiError(e).message)
  } finally {
    saving.value = false
  }
}
</script>
