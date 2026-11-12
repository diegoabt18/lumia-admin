<template>
  <NuxtLink v-if="to && !isDisabled" :to="to" :class="classes">
    <slot name="icon" />
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :class="classes"
  >
    <BaseSpinner v-if="loading" size="sm" :tone="variant === 'primary' || variant === 'danger' ? 'light' : 'dark'" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
/**
 * Botón base. Mismo lenguaje visual que lumia2.0/app/components/ui/BaseButton.vue
 * (rounded-xl, tracking-wide, foco dorado) con variantes y tamaños propios del admin.
 * `loading` deshabilita el botón: evita envíos duplicados.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    to?: string
    type?: 'button' | 'submit'
    block?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    to: undefined,
    type: 'button',
    block: false,
    disabled: false,
    loading: false,
  },
)

const isDisabled = computed(() => props.disabled || props.loading)

const classes = computed(() => {
  const size = {
    sm: 'min-h-9 px-3.5 py-1.5 text-[13px] gap-1.5',
    md: 'min-h-11 px-5 py-2.5 text-sm gap-2',
  }[props.size]
  const variant = {
    primary: 'bg-lumia-ink text-lumia-cream shadow-soft hover:bg-lumia-ink/90 hover:shadow-soft-lg active:scale-[0.99]',
    secondary:
      'border border-lumia-ink/12 bg-white/70 text-lumia-ink hover:border-lumia-gold/40 hover:bg-lumia-cream/70',
    ghost: 'bg-transparent text-lumia-ink/75 hover:bg-lumia-beige/50 hover:text-lumia-ink',
    danger: 'bg-status-danger text-white shadow-soft hover:bg-status-danger/90 active:scale-[0.99]',
  }[props.variant]
  return [
    'inline-flex shrink-0 items-center justify-center rounded-xl font-medium tracking-wide transition-all duration-200',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumia-gold/60',
    'disabled:pointer-events-none disabled:opacity-45',
    size,
    variant,
    props.block ? 'w-full' : '',
  ].join(' ')
})
</script>
