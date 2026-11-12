<template>
  <div>
    <div class="mb-8 text-center">
      <span class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lumia-ink font-display text-2xl text-lumia-cream shadow-soft">
        L
      </span>
      <p class="lumia-eyebrow">Lumia Admin</p>
      <h1 class="mt-1 font-display text-3xl text-lumia-ink">
        {{ step === 'credentials' ? 'Inicia sesión' : 'Verificación en dos pasos' }}
      </h1>
      <p class="mt-2 text-sm text-lumia-ink/55">
        {{ step === 'credentials' ? 'Acceso exclusivo para el equipo administrativo.' : 'Tu cuenta tiene 2FA activo.' }}
      </p>
    </div>

    <BaseCard class="bg-white/90 sm:p-8">
      <p
        v-if="notice"
        role="status"
        class="mb-5 rounded-xl border px-4 py-3 text-[13px]"
        :class="notice.tone === 'danger' ? 'border-status-danger/20 bg-status-danger-soft/50 text-status-danger' : 'border-status-info/20 bg-status-info-soft/60 text-status-info'"
      >
        {{ notice.text }}
      </p>

      <LoginForm v-if="step === 'credentials'" @done="onResult" />
      <TwoFactorForm v-else @done="onResult" @cancel="backToCredentials()" @expired="backToCredentials('expired')" />
    </BaseCard>

    <p class="mt-6 text-center text-[12px] text-lumia-ink/40">
      Tu sesión aquí es independiente de la tienda Lumia.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { LoginResult } from '#shared/types/auth'

definePageMeta({ layout: 'auth', public: true, title: 'Iniciar sesión' })
useHead({ title: 'Iniciar sesión · Lumia Admin' })

const route = useRoute()
const auth = useAuth()
const toast = useToast()
const step = ref<'credentials' | 'two_factor'>('credentials')
const twoFactorExpired = ref(false)

const notice = computed<{ tone: 'info' | 'danger'; text: string } | null>(() => {
  if (twoFactorExpired.value) return { tone: 'info', text: 'La verificación expiró. Inicia sesión de nuevo.' }
  switch (auth.signedOutReason.value) {
    case 'expired':
      return { tone: 'info', text: 'Tu sesión expiró. Inicia sesión de nuevo.' }
    case 'no_admin_access':
      return { tone: 'danger', text: 'Tu cuenta no tiene acceso al panel administrativo.' }
    case 'signed_out':
      return { tone: 'info', text: 'Cerraste sesión correctamente.' }
    default:
      return null
  }
})

async function onResult(result: LoginResult) {
  if (result.status === 'two_factor_required') {
    twoFactorExpired.value = false
    step.value = 'two_factor'
    return
  }
  toast.success(`Hola, ${result.session.user.displayName}`)
  await navigateTo(safeRedirect(route.query.redirect))
}

function backToCredentials(reason?: 'expired') {
  twoFactorExpired.value = reason === 'expired'
  step.value = 'credentials'
}
</script>
