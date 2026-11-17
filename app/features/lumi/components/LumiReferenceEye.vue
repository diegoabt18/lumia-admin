<template>
  <NuxtLink
    v-if="link.to"
    :to="link.to"
    :title="link.title"
    :aria-label="link.title"
    class="ml-1 inline-flex h-5 w-5 translate-y-[3px] items-center justify-center rounded-md text-lumia-ink/45 transition-colors hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
  >
    <IconEye class="h-3.5 w-3.5" stroke-width="1.9" aria-hidden="true" />
  </NuxtLink>
  <span
    v-else
    role="img"
    :title="link.title"
    :aria-label="link.title"
    class="ml-1 inline-flex h-5 w-5 translate-y-[3px] cursor-not-allowed items-center justify-center text-lumia-ink/25"
  >
    <IconEyeOff class="h-3.5 w-3.5" stroke-width="1.9" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
import { IconEye, IconEyeOff } from '@tabler/icons-vue'
import type { ResolvedLink } from '~/features/lumi/utils/references'

/** Icono de ojo de un registro. Sin permiso se muestra tachado y no navega. */
defineProps<{ link: ResolvedLink }>()
</script>
