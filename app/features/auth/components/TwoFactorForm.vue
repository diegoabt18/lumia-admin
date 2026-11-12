<template>
  <form novalidate class="space-y-5" @submit="onSubmit">
    <FormField
      id="two-factor-code"
      label="Código de verificación"
      :error="errors.code"
      hint="Código de 6 dígitos de tu app de autenticación o un código de respaldo."
      required
    >
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          :id="id"
          v-model="code"
          v-bind="codeAttrs"
          autocomplete="one-time-code"
          inputmode="text"
          maxlength="8"
          class="text-center font-mono text-lg tracking-[0.35em]"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="isSubmitting"
        />
      </template>
    </FormField>

    <p
      v-if="formError"
      role="alert"
      class="flex items-start gap-2 rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger"
    >
      <IconAlertCircle class="mt-px h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
      <span>{{ formError }}</span>
    </p>

    <div class="flex flex-col gap-2">
      <BaseButton type="submit" block :loading="isSubmitting">
        {{ isSubmitting ? 'Verificando…' : 'Verificar' }}
      </BaseButton>
      <BaseButton variant="ghost" block :disabled="isSubmitting" @click="emit('cancel')">
        Volver al inicio de sesión
      </BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { IconAlertCircle } from '@tabler/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { twoFactorInputSchema } from '#shared/schemas/auth'
import type { LoginResult } from '#shared/types/auth'

const emit = defineEmits<{ done: [result: LoginResult]; cancel: []; expired: [] }>()
const auth = useAuth()
const formError = ref<string | null>(null)

const { defineField, errors, handleSubmit, isSubmitting, setFieldError } = useForm({
  validationSchema: toTypedSchema(twoFactorInputSchema),
  initialValues: { code: '' },
})
const [code, codeAttrs] = defineField('code', { validateOnModelUpdate: false })

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    emit('done', await auth.verifyTwoFactor(values))
  } catch (error) {
    const ui = toUiError(error)
    if (ui.code === 'TWO_FACTOR_EXPIRED') {
      emit('expired')
      return
    }
    const fieldMessage = ui.fieldErrors.code?.[0]
    if (fieldMessage) setFieldError('code', fieldMessage)
    else formError.value = ui.message
    code.value = ''
  }
})
</script>
