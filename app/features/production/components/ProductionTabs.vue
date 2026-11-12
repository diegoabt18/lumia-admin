<template>
  <nav class="mb-5 flex gap-1 overflow-x-auto border-b border-lumia-ink/[0.08]" aria-label="Secciones de producción">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[14px] font-medium transition-colors"
      :class="route.path.startsWith(item.to) ? 'border-lumia-ink text-lumia-ink' : 'border-transparent text-lumia-ink/55 hover:text-lumia-ink'"
      :aria-current="route.path.startsWith(item.to) ? 'page' : undefined"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { PRODUCTION_SECTIONS } from '~/features/production/sections'

const route = useRoute()
const auth = useAuth()
const items = computed(() => PRODUCTION_SECTIONS.filter((s) => auth.can(s.permission)))
</script>
