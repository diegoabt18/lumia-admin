<template>
  <!-- Sin referencias (mensajes antiguos, respuestas en curso): el texto se muestra igual que siempre. -->
  <template v-if="!references.length">{{ content }}</template>

  <template v-else>
    <span class="block">
      <span v-for="line in layout.lines" :key="line.key" class="block">
        <template v-if="line.indent || line.marker">{{ line.indent }}{{ line.marker }}</template>
        <template v-for="(part, i) in line.parts" :key="i">
          <template v-if="part.kind === 'text'">{{ part.text }}</template>
          <a
            v-else-if="part.source?.url"
            :href="part.source.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            referrerpolicy="no-referrer"
            class="mx-px inline-flex -translate-y-1 items-center rounded bg-lumia-beige/70 px-1 py-0.5 text-[10.5px] font-semibold leading-none text-lumia-ink transition-colors hover:bg-lumia-gold/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
            :title="sourceTitle(part.source)"
            :aria-label="`Fuente ${part.index}: ${sourceTitle(part.source)} (se abre en una pestaña nueva)`"
          >[{{ part.index }}]</a>
          <span
            v-else-if="part.source"
            class="mx-px inline-flex -translate-y-1 text-[10.5px] font-semibold leading-none text-lumia-ink/55"
            :title="`${sourceTitle(part.source)} (sin enlace disponible)`"
          >[{{ part.index }}]</span>
          <template v-else>[{{ part.index }}]</template>
        </template>
        <LumiReferenceEye v-if="line.entity" :link="resolveEntity(line.entity, auth.can)" />
        <template v-if="!line.parts.length && !line.marker">&#8203;</template>
      </span>
    </span>

    <span v-if="extraLinks.length || moduleLinks.length" class="mt-2.5 flex flex-wrap items-center gap-1.5 whitespace-normal">
      <span v-for="link in extraLinks" :key="link.key" class="inline-flex max-w-full items-center gap-1 rounded-full border border-lumia-ink/10 bg-lumia-cream/50 py-0.5 pl-2.5 pr-1 text-[12px] text-lumia-ink/80">
        <span class="truncate">{{ link.label }}</span>
        <LumiReferenceEye :link="link" />
      </span>
      <component
        :is="link.to ? NuxtLink : 'span'"
        v-for="link in moduleLinks"
        :key="link.key"
        v-bind="link.to ? { to: link.to } : { 'aria-disabled': 'true' }"
        :title="link.title"
        class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
        :class="link.to ? 'border-lumia-gold/40 text-lumia-ink/80 hover:border-lumia-gold hover:bg-lumia-cream/70 hover:text-lumia-ink' : 'cursor-not-allowed border-lumia-ink/10 text-lumia-ink/40'"
      >
        <IconLayoutGrid v-if="link.to" class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
        <IconLock v-else class="h-3.5 w-3.5" stroke-width="1.75" aria-hidden="true" />
        {{ link.to ? `Ver en ${link.label}` : link.label }}
      </component>
    </span>

    <span v-if="layout.sources.length" class="mt-3 block whitespace-normal border-t border-lumia-ink/[0.08] pt-2.5">
      <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-lumia-ink/60">Fuentes consultadas</span>
      <ol class="space-y-1.5" aria-label="Fuentes consultadas">
        <li v-for="source in layout.sources" :key="source.index" :class="source.cited ? '' : 'opacity-75'">
          <component
            :is="source.url ? 'a' : 'div'"
            v-bind="source.url ? { href: source.url, target: '_blank', rel: 'noopener noreferrer nofollow', referrerpolicy: 'no-referrer' } : {}"
            class="group flex gap-2 rounded-lg px-1.5 py-1 text-left"
            :class="source.url ? 'hover:bg-lumia-cream/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70' : ''"
          >
            <span class="mt-px shrink-0 text-[11px] font-semibold tabular-nums text-lumia-ink/70">[{{ source.index }}]</span>
            <span class="min-w-0 flex-1">
              <span class="flex items-start gap-1">
                <span class="min-w-0 break-words text-[12.5px] font-medium leading-snug text-lumia-ink" :class="source.url ? 'group-hover:underline' : ''">
                  {{ sourceTitle(source) }}
                </span>
                <IconExternalLink v-if="source.url" class="mt-0.5 h-3 w-3 shrink-0 text-lumia-ink/45" stroke-width="2" aria-hidden="true" />
                <span v-if="source.url" class="sr-only">(se abre en una pestaña nueva)</span>
              </span>
              <span class="block text-[11px] text-lumia-ink/55">
                {{ source.domain || 'Dominio desconocido' }}<template v-if="!source.url"> · sin enlace disponible</template><template v-if="!source.cited"> · consultada, no citada</template>
              </span>
              <span v-if="source.snippet" class="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-lumia-ink/65">{{ source.snippet }}</span>
            </span>
          </component>
        </li>
      </ol>
    </span>
  </template>
</template>

<script setup lang="ts">
import { IconExternalLink, IconLayoutGrid, IconLock } from '@tabler/icons-vue'
import type { LumiReference } from '#shared/schemas/lumi'
import { layoutMessage, resolveEntity, resolveModuleLink, type WebSourceRef } from '~/features/lumi/utils/references'

/**
 * Respuesta de Lumi con sus referencias: icono de ojo en cada registro, accesos a los módulos,
 * citas [n] que abren su fuente y la sección «Fuentes consultadas».
 *
 * Seguridad: el contenido se sigue mostrando como texto (sin v-html). Las rutas internas salen de
 * la lista cerrada de utils/references.ts; las URLs externas ya llegan filtradas a http(s) y se
 * abren con noopener/noreferrer.
 */
const props = defineProps<{ content: string; references: readonly LumiReference[] }>()

const NuxtLink = resolveComponent('NuxtLink')
const auth = useAuth()

const layout = computed(() => layoutMessage(props.content, props.references))
const extraLinks = computed(() => layout.value.extraEntities.map((e) => resolveEntity(e, auth.can)))
const moduleLinks = computed(() => {
  const seen = new Set<string>()
  return layout.value.modules
    .map((m) => resolveModuleLink(m, auth.can))
    .filter((link) => (seen.has(link.key) ? false : (seen.add(link.key), true)))
})

function sourceTitle(source: WebSourceRef): string {
  return source.title?.trim() || source.domain || `Fuente ${source.index}`
}
</script>
