<template>
  <BaseDialog v-model:open="open" :title="title" :description="description" size="sm" :busy="busy">
    <form :id="formId" novalidate class="space-y-4" @submit.prevent="onSubmit">
      <FormField :id="`${formId}-note`" :label="noteLabel" :error="error ?? undefined" :hint="`Máximo ${maxLength} caracteres.`" :required="noteRequired">
        <template #default="{ id, invalid, describedBy }">
          <BaseTextarea :id="id" v-model="note" :rows="3" :maxlength="maxLength" :invalid="invalid" :described-by="describedBy" :disabled="busy" />
        </template>
      </FormField>
      <slot />
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="open = false">Volver</BaseButton>
      <BaseButton type="submit" :form="formId" :variant="tone === 'danger' ? 'danger' : 'primary'" :loading="busy">{{ confirmLabel }}</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
/** Confirmación con una nota de texto (motivo de cancelación, nota para el cliente…). */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    noteLabel: string
    confirmLabel: string
    tone?: 'default' | 'danger'
    noteRequired?: boolean
    maxLength?: number
    busy?: boolean
  }>(),
  { description: undefined, tone: 'default', noteRequired: false, maxLength: 1000, busy: false },
)

const emit = defineEmits<{ confirm: [note: string] }>()
const open = defineModel<boolean>('open', { default: false })
const formId = useId()
const note = ref('')
const error = ref<string | null>(null)

watch(open, (value) => {
  if (value) {
    note.value = ''
    error.value = null
  }
})

function onSubmit() {
  const value = note.value.trim()
  if (props.noteRequired && !value) {
    error.value = 'Este campo es obligatorio.'
    return
  }
  if (value.length > props.maxLength) {
    error.value = `Máximo ${props.maxLength} caracteres.`
    return
  }
  error.value = null
  emit('confirm', value)
}
</script>
