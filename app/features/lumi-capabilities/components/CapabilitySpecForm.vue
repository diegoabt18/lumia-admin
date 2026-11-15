<template>
  <form :id="formId" novalidate class="space-y-5" @submit="onSubmit">
    <FormField
      v-for="field in CAPABILITY_SPEC_FIELDS"
      :id="`${formId}-${field.key}`"
      :key="field.key"
      :label="field.label"
      :error="errors[field.key]"
      :hint="field.hint"
    >
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          v-if="field.max <= 300"
          :id="id"
          v-model="draft[field.key]"
          :maxlength="field.max"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="readonly || isSubmitting"
        />
        <BaseTextarea
          v-else
          :id="id"
          v-model="draft[field.key]"
          :rows="field.key === 'notes' ? 4 : 2"
          :maxlength="field.max"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="readonly || isSubmitting"
        />
      </template>
    </FormField>

    <p v-if="formError" role="alert" class="rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger">
      {{ formError }}
    </p>

    <div v-if="!readonly" class="flex items-center justify-end gap-3">
      <span v-if="dirty" class="text-[12px] text-lumia-ink/50">Cambios sin guardar</span>
      <BaseButton type="submit" size="sm" :loading="isSubmitting" :disabled="!dirty">Guardar especificación</BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  CAPABILITY_SPEC_FIELDS,
  capabilityResponseSchema,
  capabilitySpecSchema,
  type Capability,
  type CapabilitySpec,
  type CapabilitySpecKey,
} from '#shared/schemas/lumi-capabilities'

/**
 * Especificación para quien programe la herramienta. Se valida con el mismo esquema que el BFF y
 * se envía solo lo que cambió (el Server combina, no reemplaza).
 */
const props = defineProps<{ capability: Capability; readonly?: boolean }>()
const emit = defineEmits<{ saved: [capability: Capability] }>()

const { request } = useAdminApi()
const toast = useToast()
const formId = useId()
const formError = ref<string | null>(null)
const errors = ref<Partial<Record<CapabilitySpecKey, string>>>({})
const isSubmitting = ref(false)
const draft = reactive<CapabilitySpec>({ ...props.capability.spec })

watch(
  () => props.capability.spec,
  (spec) => Object.assign(draft, spec),
)

const changed = computed(() =>
  CAPABILITY_SPEC_FIELDS.map((f) => f.key).filter((key) => draft[key].trim() !== props.capability.spec[key]),
)
const dirty = computed(() => changed.value.length > 0)

async function onSubmit(event: Event) {
  event.preventDefault()
  if (props.readonly || !dirty.value || isSubmitting.value) return
  formError.value = null
  const parsed = capabilitySpecSchema.safeParse(draft)
  if (!parsed.success) {
    errors.value = zodFieldErrors(parsed.error) as Partial<Record<CapabilitySpecKey, string>>
    return
  }
  errors.value = {}
  const spec = Object.fromEntries(changed.value.map((key) => [key, parsed.data[key]]))
  isSubmitting.value = true
  try {
    const { capability } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${props.capability.id}`, { method: 'PATCH', body: { spec } }),
    )
    toast.success('Especificación guardada')
    emit('saved', capability)
  } catch (error) {
    const ui = toUiError(error)
    errors.value = bffFieldErrors(ui.fieldErrors) as Partial<Record<CapabilitySpecKey, string>>
    formError.value = ui.message
  } finally {
    isSubmitting.value = false
  }
}
</script>
