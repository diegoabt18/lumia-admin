<template>
  <form novalidate class="space-y-5" @submit="onSubmit">
    <FormField id="login-email" label="Correo electrónico" :error="errors.email" required>
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          :id="id"
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          autocomplete="username"
          inputmode="email"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="isSubmitting"
        />
      </template>
    </FormField>

    <FormField id="login-password" label="Contraseña" :error="errors.password" required>
      <template #default="{ id, invalid, describedBy }">
        <BaseInput
          :id="id"
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          autocomplete="current-password"
          :invalid="invalid"
          :described-by="describedBy"
          :disabled="isSubmitting"
        />
      </template>
    </FormField>

    <BaseCheckbox id="login-remember" v-model="rememberMe">Mantener la sesión iniciada</BaseCheckbox>

    <p
      v-if="formError"
      role="alert"
      class="flex items-start gap-2 rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-4 py-3 text-[13px] text-status-danger"
    >
      <IconAlertCircle class="mt-px h-4 w-4 shrink-0" stroke-width="1.75" aria-hidden="true" />
      <span>{{ formError }}</span>
    </p>

    <BaseButton type="submit" block :loading="isSubmitting">
      {{ isSubmitting ? 'Verificando…' : 'Iniciar sesión' }}
    </BaseButton>
  </form>
</template>

<script setup lang="ts">
import { IconAlertCircle } from '@tabler/icons-vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { loginInputSchema } from '#shared/schemas/auth'
import type { LoginResult } from '#shared/types/auth'

const emit = defineEmits<{ done: [result: LoginResult] }>()
const auth = useAuth()
const formError = ref<string | null>(null)

const { defineField, errors, handleSubmit, isSubmitting, setErrors } = useForm({
  validationSchema: toTypedSchema(loginInputSchema),
  initialValues: { email: '', password: '', rememberMe: false },
})

const [email, emailAttrs] = defineField('email', { validateOnModelUpdate: false })
const [password, passwordAttrs] = defineField('password', { validateOnModelUpdate: false })
const [rememberMe] = defineField('rememberMe')

// isSubmitting deshabilita el botón y los campos: un solo envío a la vez.
const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    emit('done', await auth.login(values))
  } catch (error) {
    const ui = toUiError(error)
    if (Object.keys(ui.fieldErrors).length) setErrors(firstMessages(ui.fieldErrors))
    formError.value = ui.message
    password.value = ''
  }
})

function firstMessages(fieldErrors: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0] ?? '']))
}
</script>
