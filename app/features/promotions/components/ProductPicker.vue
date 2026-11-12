<template>
  <div class="space-y-3">
    <label :for="searchId" class="sr-only">Buscar productos para agregar</label>
    <BaseInput :id="searchId" v-model="draft" type="search" placeholder="Buscar producto por nombre o slug…" maxlength="120" autocomplete="off" :disabled="disabled">
      <template #leading><IconSearch class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
    </BaseInput>

    <div v-if="term" class="max-h-64 overflow-y-auto rounded-xl border border-lumia-ink/[0.08] bg-white/70">
      <p v-if="loading" class="flex items-center gap-2 px-4 py-3 text-[13px] text-lumia-ink/55"><BaseSpinner size="sm" /> Buscando…</p>
      <p v-else-if="errorMessage" class="px-4 py-3 text-[13px] text-status-danger" role="alert">{{ errorMessage }}</p>
      <p v-else-if="!results.length" class="px-4 py-3 text-[13px] text-lumia-ink/55">Sin coincidencias.</p>
      <ul v-else class="divide-y divide-lumia-ink/[0.05]">
        <li v-for="p in results" :key="p.id" class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span class="min-w-0">
            <span class="block truncate text-lumia-ink">{{ p.name }}</span>
            <span class="block font-mono text-[11px] text-lumia-ink/45">{{ p.slug }}<template v-if="p.status === 'inactive'"> · inactivo</template></span>
          </span>
          <BaseButton size="sm" variant="secondary" :disabled="disabled || selected.includes(p.slug)" @click="emit('add', { slug: p.slug, name: p.name })">
            {{ selected.includes(p.slug) ? 'Agregado' : 'Agregar' }}
          </BaseButton>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconSearch } from '@tabler/icons-vue'
import type { ProductList, ProductRow } from '#shared/schemas/products'

/** Busca productos en el BFF (GET /api/admin/products) para añadirlos a una promoción. */
defineProps<{ selected: string[]; disabled?: boolean }>()
const emit = defineEmits<{ add: [product: { slug: string; name: string }] }>()

const { request } = useAdminApi()
const searchId = useId()
const draft = ref('')
const term = ref('')
const results = ref<ProductRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

let timer: ReturnType<typeof setTimeout> | undefined
let sequence = 0
watch(draft, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    term.value = value.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

watch(term, async (value) => {
  if (!value) {
    results.value = []
    return
  }
  const current = ++sequence
  loading.value = true
  errorMessage.value = null
  try {
    const data = await request<ProductList>('/api/admin/products', { query: { search: value, limit: 20 } })
    if (current === sequence) results.value = data.items
  } catch (error) {
    if (current === sequence) errorMessage.value = toUiError(error).message
  } finally {
    if (current === sequence) loading.value = false
  }
})
</script>
