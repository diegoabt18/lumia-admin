<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <label
        :for="inputId"
        class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-lumia-ink/25 bg-white/60 px-4 py-2.5 text-[13px] font-medium text-lumia-ink/75 transition-colors hover:border-lumia-ink/45 hover:text-lumia-ink"
        :class="disabled || full ? 'pointer-events-none opacity-50' : ''"
      >
        <IconUpload class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
        {{ multiple ? 'Añadir imágenes' : model.length ? 'Cambiar imagen' : 'Elegir imagen' }}
      </label>
      <input
        :id="inputId"
        ref="input"
        type="file"
        class="sr-only"
        :accept="IMAGE_ACCEPT"
        :multiple="multiple"
        :disabled="disabled || full"
        :aria-describedby="`${inputId}-hint`"
        @change="onChange"
      >
      <span :id="`${inputId}-hint`" class="text-[12px] text-lumia-ink/50">
        JPEG, PNG, WebP, AVIF, GIF o TIFF · hasta 12 MB<template v-if="multiple"> · máximo {{ max }}</template>
      </span>
    </div>

    <p v-if="error" role="alert" class="mt-2 text-[12px] text-status-danger">{{ error }}</p>

    <ul v-if="model.length" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <li v-for="(file, index) in model" :key="`${file.name}-${index}`" class="relative overflow-hidden rounded-xl border border-lumia-ink/[0.08] bg-white">
        <img :src="previews[index]" :alt="file.name" class="aspect-square w-full object-contain bg-lumia-cream/40">
        <div class="flex items-center justify-between gap-2 px-2 py-1.5">
          <span class="min-w-0 truncate text-[11px] text-lumia-ink/70" :title="file.name">{{ file.name }}</span>
          <button
            type="button"
            class="shrink-0 rounded p-0.5 text-lumia-ink/50 hover:text-status-danger"
            :disabled="disabled"
            :aria-label="`Quitar ${file.name}`"
            @click="remove(index)"
          >
            <IconX class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { IconUpload, IconX } from '@tabler/icons-vue'
import { detectImageType, IMAGE_ACCEPT, IMAGE_MAX_FILE_BYTES } from '#shared/schemas/images'

/** Selección de imágenes con validación previa (tamaño y tipo real por bytes). El BFF vuelve a validar. */
const props = withDefaults(defineProps<{ multiple?: boolean; max?: number; disabled?: boolean }>(), {
  multiple: false,
  max: 1,
  disabled: false,
})
const model = defineModel<File[]>({ required: true })

const inputId = useId()
const input = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)
const full = computed(() => props.multiple && model.value.length >= props.max)

// Vistas previas locales (object URLs), liberadas al cambiar o desmontar.
const previews = ref<string[]>([])
watch(
  model,
  (files, _old, onCleanup) => {
    const urls = files.map((f) => URL.createObjectURL(f))
    previews.value = urls
    onCleanup(() => urls.forEach((u) => URL.revokeObjectURL(u)))
  },
  { immediate: true },
)

async function validate(file: File): Promise<string | null> {
  if (file.size > IMAGE_MAX_FILE_BYTES) return `${file.name}: supera 12 MB.`
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!detectImageType(head)) return `${file.name}: formato no permitido.`
  return null
}

async function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  const picked = [...(target.files ?? [])]
  target.value = ''
  error.value = null
  const accepted: File[] = []
  for (const file of picked) {
    const problem = await validate(file)
    if (problem) error.value = problem
    else accepted.push(file)
  }
  if (!props.multiple) {
    if (accepted[0]) model.value = [accepted[0]]
    return
  }
  const room = props.max - model.value.length
  if (accepted.length > room) error.value = `Máximo ${props.max} imágenes.`
  model.value = [...model.value, ...accepted.slice(0, Math.max(0, room))]
}

function remove(index: number) {
  model.value = model.value.filter((_, i) => i !== index)
}
</script>
