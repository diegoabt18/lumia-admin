<template>
  <nav v-if="items.length" aria-label="Migas de pan" class="min-w-0 text-sm text-lumia-ink/55">
    <ol class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <li v-for="(crumb, i) in items" :key="`${i}-${crumb.label}`" class="flex min-w-0 items-center gap-2">
        <span v-if="i > 0" class="text-lumia-ink/25" aria-hidden="true">/</span>
        <NuxtLink
          v-if="crumb.to && i < items.length - 1"
          :to="crumb.to"
          class="truncate transition-colors duration-200 hover:text-lumia-ink"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="truncate font-medium text-lumia-ink" :aria-current="i === items.length - 1 ? 'page' : undefined">
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import type { Crumb } from '~/types/ui'

/** Igual que lumia2.0/app/components/ui/AppBreadcrumbs.vue, con aria-current y truncado. */
defineProps<{ items: Crumb[] }>()
</script>
