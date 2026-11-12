<template>
  <component
    :is="as"
    :class="[
      'rounded-2xl border border-lumia-ink/[0.07] bg-white/80 shadow-soft',
      padded && 'p-5 sm:p-6',
    ]"
  >
    <header v-if="title || $slots.header || $slots.actions" class="mb-4 flex items-start justify-between gap-3">
      <slot name="header">
        <div>
          <h2 class="text-sm font-semibold text-lumia-ink">{{ title }}</h2>
          <p v-if="description" class="mt-0.5 text-[13px] text-lumia-ink/55">{{ description }}</p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </component>
</template>

<script setup lang="ts">
/** Superficie base. Deriva de BaseCard de Lumia 2.0 con fondo blanco para lectura densa de datos. */
withDefaults(
  defineProps<{ as?: string; title?: string; description?: string; padded?: boolean }>(),
  { as: 'section', title: undefined, description: undefined, padded: true },
)
</script>
