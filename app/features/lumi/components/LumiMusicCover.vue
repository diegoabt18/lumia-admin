<template>
  <div class="relative shrink-0 overflow-hidden bg-lumia-cream" :class="rounded">
    <img
      v-if="src && !failed"
      :key="src"
      :src="src"
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      class="h-full w-full scale-[1.34] object-cover"
      @error="failed = true"
    />
    <div v-else class="flex h-full w-full items-center justify-center text-lumia-ink/35">
      <IconMusic class="h-1/2 w-1/2 max-h-8 max-w-8" stroke-width="1.5" aria-hidden="true" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { IconMusic } from '@tabler/icons-vue'

/**
 * Portada de una canción: la miniatura pública de YouTube (solo i.ytimg.com, validada en el contrato).
 * Las miniaturas son 4:3 con franjas: se amplían para recortarlas en el cuadrado.
 */
const props = withDefaults(defineProps<{ src: string | null | undefined; rounded?: string }>(), { rounded: 'rounded-lg' })
const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)
</script>
