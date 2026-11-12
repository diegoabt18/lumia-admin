<template>
  <BaseCard title="Resultado" :description="`Clave: ${result.imageKey} · ${variantCount} archivos (AVIF + WebP). El servidor no guarda nada: descárgalos y súbelos al repositorio de imágenes.`">
    <template #actions>
      <BaseButton size="sm" @click="downloadAll">
        <template #icon>
          <IconFileZip class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
        </template>
        Descargar ZIP
      </BaseButton>
    </template>

    <div class="space-y-6">
      <section v-for="group in result.groups" :key="group.label">
        <h3 class="lumia-eyebrow mb-3">{{ group.label }}</h3>
        <div class="grid gap-4 md:grid-cols-[180px_1fr]">
          <img
            v-if="previewOf(group.variants)"
            :src="previewOf(group.variants)!"
            :alt="`Vista previa: ${group.label}`"
            class="aspect-square w-full rounded-xl border border-lumia-ink/[0.08] bg-[repeating-conic-gradient(#f3efe7_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] object-contain"
          >
          <div class="overflow-x-auto rounded-xl border border-lumia-ink/[0.07]">
            <table class="w-full text-[12px]">
              <caption class="sr-only">Variantes de {{ group.label }}</caption>
              <thead class="bg-lumia-cream/70 text-left text-lumia-ink/60">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">Archivo</th>
                  <th scope="col" class="px-3 py-2 font-medium">Uso</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">Tamaño</th>
                  <th scope="col" class="px-3 py-2 text-right font-medium">Peso</th>
                  <th scope="col" class="px-3 py-2"><span class="sr-only">Descargar</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-lumia-ink/[0.05]">
                <tr v-for="variant in group.variants" :key="variant.exportPath">
                  <td class="px-3 py-1.5"><code class="break-all text-lumia-ink/80">{{ variant.exportPath }}</code></td>
                  <td class="px-3 py-1.5 text-lumia-ink/60">{{ variant.usage }}</td>
                  <td class="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-lumia-ink/70">{{ variant.width }} × {{ variant.height }}</td>
                  <td class="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-lumia-ink/70" :title="`${variant.compressionPercent} % menos que el original`">{{ formatBytes(variant.outputBytes) }}</td>
                  <td class="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      class="rounded p-1 text-lumia-ink/55 hover:text-lumia-ink"
                      :aria-label="`Descargar ${variant.filename}`"
                      @click="downloadOne(variant)"
                    >
                      <IconDownload class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { IconDownload, IconFileZip } from '@tabler/icons-vue'
import type { ImageGenerationResult, ImageVariant } from '#shared/schemas/images'

const props = defineProps<{ result: ImageGenerationResult; zipName: string }>()

const variantCount = computed(() => props.result.groups.reduce((n, g) => n + g.variants.length, 0))

/** Vista previa con la variante WebP más grande (compatibilidad); no se generan URLs remotas. */
function previewOf(variants: ImageVariant[]): string | null {
  const webp = variants.filter((v) => v.format === 'webp').sort((a, b) => b.width - a.width)[0]
  return webp ? `data:image/webp;base64,${webp.base64}` : null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function downloadOne(variant: ImageVariant) {
  const type = variant.format === 'avif' ? 'image/avif' : 'image/webp'
  downloadBlob(new Blob([base64ToBytes(variant.base64) as BlobPart], { type }), variant.filename)
}

function downloadAll() {
  const entries = props.result.groups.flatMap((g) => g.variants.map((v) => ({ path: v.exportPath, data: base64ToBytes(v.base64) })))
  downloadBlob(createZip(entries), props.zipName)
}
</script>
