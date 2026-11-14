<template>
  <BaseDialog
    v-model:open="open"
    :title="routine ? 'Editar rutina' : 'Nueva rutina'"
    description="Avisos diarios a una hora fija, en la zona horaria de la tienda."
    size="md"
    :busy="saving"
  >
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="onSubmit">
      <FormField :id="`${formId}-title`" label="Título" :error="errors.title" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.title" maxlength="120" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>

      <FormField v-if="!routine" :id="`${formId}-kind`" label="Tipo" :error="errors.taskKind" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseSelect :id="id" v-model="form.taskKind" :options="kindOptions" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>

      <FormField :id="`${formId}-time`" label="Hora del aviso" :error="errors.time" required>
        <template #default="{ id, invalid, describedBy }">
          <BaseInput :id="id" v-model="form.time" type="time" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
        </template>
      </FormField>

      <template v-if="!routine">
        <BaseCheckbox :id="`${formId}-follow`" v-model="form.withFollowUp" :disabled="saving">
          Enviar un segundo aviso si todavía no lo confirmas
        </BaseCheckbox>
        <FormField
          v-if="form.withFollowUp"
          :id="`${formId}-follow-time`"
          label="Hora del segundo aviso"
          :error="errors.followUpTime"
          required
        >
          <template #default="{ id, invalid, describedBy }">
            <BaseInput :id="id" v-model="form.followUpTime" type="time" :invalid="invalid" :described-by="describedBy" :disabled="saving" />
          </template>
        </FormField>
      </template>

      <p v-if="routine" class="text-[12px] text-lumia-ink/50">
        El segundo aviso se mantiene como está. Para cambiarlo, pídeselo a Lumi en el chat.
      </p>

      <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
        {{ formError }}
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">{{ routine ? 'Guardar cambios' : 'Crear rutina' }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import {
  DEFAULT_LUMI_TIMEZONE,
  createLumiRoutineInputSchema,
  updateLumiTaskInputSchema,
  type LumiRoutineKind,
  type LumiTaskRow,
} from '#shared/schemas/lumi-automation'
import type { z } from 'zod'

const props = defineProps<{ routine: LumiTaskRow | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()

const saving = ref(false)
const formError = ref<string | null>(null)
const errors = reactive<Record<string, string>>({})

const kindOptions: { value: LumiRoutineKind; label: string }[] = [
  { value: 'reminder', label: 'Recordatorio diario' },
  { value: 'initiative_review', label: 'Revisión diaria de iniciativas' },
]

const form = reactive({
  title: '',
  taskKind: 'reminder' as LumiRoutineKind,
  time: '08:00',
  withFollowUp: false,
  followUpTime: '14:00',
})

/** Al abrir, el formulario refleja la rutina que se edita (o queda en blanco para una nueva). */
watch(open, (value) => {
  if (!value) return
  const daily = props.routine?.schedule.type === 'daily' ? props.routine.schedule : null
  form.title = props.routine?.title ?? ''
  form.taskKind = 'reminder'
  form.time = daily?.time ?? '08:00'
  form.withFollowUp = false
  form.followUpTime = '14:00'
  for (const key of Object.keys(errors)) delete errors[key]
  formError.value = null
})

function collectErrors(issues: z.ZodIssue[]) {
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !errors[key]) errors[key] = issue.message
  }
}

async function onSubmit() {
  for (const key of Object.keys(errors)) delete errors[key]
  formError.value = null

  saving.value = true
  try {
    if (props.routine) {
      const daily = props.routine.schedule.type === 'daily' ? props.routine.schedule : null
      const parsed = updateLumiTaskInputSchema.safeParse({
        title: form.title,
        schedule: { type: 'daily', time: form.time, timezone: daily?.timezone ?? DEFAULT_LUMI_TIMEZONE },
      })
      if (!parsed.success) return collectErrors(parsed.error.issues)
      await request(`/api/admin/lumi/automation/tasks/${props.routine.id}`, { method: 'PATCH', body: parsed.data })
      toast.success('Rutina actualizada')
    } else {
      const parsed = createLumiRoutineInputSchema.safeParse({
        title: form.title,
        taskKind: form.taskKind,
        time: form.time,
        timezone: DEFAULT_LUMI_TIMEZONE,
        followUpTime: form.withFollowUp ? form.followUpTime : undefined,
      })
      if (!parsed.success) return collectErrors(parsed.error.issues)
      await request('/api/admin/lumi/automation/routines', { method: 'POST', body: parsed.data })
      toast.success('Rutina creada')
    }
    open.value = false
    emit('saved')
  } catch (e) {
    formError.value = toUiError(e).message
  } finally {
    saving.value = false
  }
}
</script>
