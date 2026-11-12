<template>
  <div ref="root" class="relative">
    <BaseInput
      :id="id"
      v-model="query"
      type="search"
      autocomplete="off"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-autocomplete="list"
      :placeholder="placeholder"
      :invalid="invalid"
      :disabled="disabled"
      @focus="onFocus"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="pickActive"
      @keydown.esc="open = false"
    />
    <ul
      v-if="open"
      :id="listId"
      role="listbox"
      class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-lumia-ink/10 bg-white py-1 shadow-soft-lg"
    >
      <li v-if="loading" class="px-3 py-2 text-[13px] text-lumia-ink/55">Buscando…</li>
      <li v-else-if="error" class="px-3 py-2 text-[13px] text-status-danger">{{ error }}</li>
      <li v-else-if="!options.length" class="px-3 py-2 text-[13px] text-lumia-ink/55">Sin resultados</li>
      <li
        v-for="(option, index) in options"
        v-else
        :id="`${listId}-${index}`"
        :key="option.value"
        role="option"
        :aria-selected="index === active"
        class="cursor-pointer px-3 py-2 text-[13px]"
        :class="index === active ? 'bg-lumia-cream text-lumia-ink' : 'text-lumia-ink/80 hover:bg-lumia-cream/60'"
        @mousedown.prevent="pick(option)"
      >
        <span class="block font-medium">{{ option.label }}</span>
        <span v-if="option.hint" class="block text-[11px] text-lumia-ink/50">{{ option.hint }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts" generic="T extends { value: string; label: string; hint?: string }">
/**
 * Buscador con lista desplegable (combobox). `search` consulta el BFF con el texto escrito
 * (con espera de 300 ms) y devuelve las opciones; al elegir una se emite `pick`.
 */
const props = withDefaults(
  defineProps<{ id: string; search: (term: string) => Promise<T[]>; placeholder?: string; invalid?: boolean; disabled?: boolean }>(),
  { placeholder: 'Buscar…', invalid: false, disabled: false },
)
const emit = defineEmits<{ pick: [option: T] }>()

const root = ref<HTMLElement | null>(null)
const listId = `${props.id}-list`
const query = ref('')
const open = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const options = shallowRef<T[]>([])
const active = ref(-1)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

async function run(term: string) {
  const current = ++seq
  loading.value = true
  error.value = null
  try {
    const result = await props.search(term)
    if (current === seq) {
      options.value = result
      active.value = result.length ? 0 : -1
    }
  } catch (e) {
    if (current === seq) error.value = toUiError(e).message
  } finally {
    if (current === seq) loading.value = false
  }
}

let suppressNext = false
watch(query, (term) => {
  if (suppressNext) {
    suppressNext = false
    return
  }
  open.value = true
  clearTimeout(timer)
  timer = setTimeout(() => run(term.trim()), 300)
})

function onFocus() {
  open.value = true
  if (!options.value.length && !loading.value) void run(query.value.trim())
}

function move(step: number) {
  if (!options.value.length) return
  open.value = true
  active.value = (active.value + step + options.value.length) % options.value.length
}

function pick(option: T) {
  emit('pick', option)
  if (query.value !== '') suppressNext = true
  query.value = ''
  open.value = false
}

function pickActive() {
  const option = options.value[active.value]
  if (open.value && option) pick(option)
}

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
  clearTimeout(timer)
})
</script>
