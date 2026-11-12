<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
      <div class="w-full sm:max-w-xs">
        <label :for="searchId" class="sr-only">{{ searchLabel }}</label>
        <BaseInput
          :id="searchId"
          v-model="draft"
          type="search"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          maxlength="120"
        >
          <template #leading>
            <IconSearch class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
          </template>
        </BaseInput>
      </div>
      <div v-if="$slots.filters" class="flex flex-wrap items-center gap-2">
        <slot name="filters" />
      </div>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconSearch } from '@tabler/icons-vue'

/** Barra de búsqueda (con debounce) + filtros + acciones para tablas administrativas. */
const props = withDefaults(
  defineProps<{ searchLabel?: string; searchPlaceholder?: string; debounceMs?: number }>(),
  { searchLabel: 'Buscar', searchPlaceholder: 'Buscar…', debounceMs: 350 },
)

const search = defineModel<string>('search', { default: '' })
const searchId = useId()
const draft = ref(search.value)

let timer: ReturnType<typeof setTimeout> | undefined
watch(draft, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, props.debounceMs)
})
watch(search, (value) => {
  if (value !== draft.value.trim()) draft.value = value
})
onBeforeUnmount(() => clearTimeout(timer))
</script>
