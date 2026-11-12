<template>
  <div class="flex h-full flex-col">
    <div class="flex h-16 shrink-0 items-center gap-2.5 border-b border-lumia-ink/[0.06] px-5">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-lumia-ink font-display text-lg text-lumia-cream">L</span>
      <div class="leading-tight">
        <p class="font-display text-lg text-lumia-ink">Lumia</p>
        <p class="lumia-eyebrow -mt-0.5 text-[10px]">Admin</p>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Módulos">
      <div v-for="group in groups" :key="group.label" class="mb-5 last:mb-0">
        <p class="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-lumia-ink/35">
          {{ group.label }}
        </p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              v-if="item.available"
              :to="item.to"
              class="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150"
              :class="
                isActive(item.to)
                  ? 'bg-lumia-ink text-lumia-cream shadow-soft'
                  : 'text-lumia-ink/70 hover:bg-lumia-beige/45 hover:text-lumia-ink'
              "
              :aria-current="isActive(item.to) ? 'page' : undefined"
              @click="emit('navigate')"
            >
              <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" stroke-width="1.5" aria-hidden="true" />
              <span class="truncate">{{ item.label }}</span>
            </NuxtLink>
            <span
              v-else
              class="flex cursor-default items-center gap-3 rounded-xl px-3 py-2 text-sm text-lumia-ink/35"
              :title="`${item.label}: en preparación`"
            >
              <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" stroke-width="1.5" aria-hidden="true" />
              <span class="truncate">{{ item.label }}</span>
              <span class="ml-auto rounded-full bg-lumia-beige/50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-lumia-ink/40">
                Pronto
              </span>
            </span>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { groups } = useNavigation()

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>
