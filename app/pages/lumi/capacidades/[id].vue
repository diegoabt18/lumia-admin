<template>
  <div>
    <div v-if="loading && !detail" class="space-y-4">
      <BaseSkeleton class="h-10 w-72" />
      <BaseSkeleton class="h-72 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError && !detail"
      :title="loadError.status === 404 ? 'Capacidad no encontrada' : 'No se pudo cargar la capacidad'"
      :message="loadError.message"
      :request-id="loadError.requestId"
      :retryable="loadError.status !== 404"
      @retry="refresh"
    />

    <template v-else-if="detail && capability">
      <PageHeader
        :eyebrow="`Lumi · ${CAPABILITY_MODULE_LABELS[capability.module]}`"
        :title="capability.title"
        :description="`Pedida ${capability.requestCount} ${capability.requestCount === 1 ? 'vez' : 'veces'} · última ${formatDateTime(capability.lastSeenAt)}`"
      >
        <template #actions>
          <BaseBadge :tone="CAPABILITY_STATUS_META[capability.status].tone">{{ CAPABILITY_STATUS_META[capability.status].label }}</BaseBadge>
          <template v-if="canManage && !isMerged">
            <BaseButton
              v-for="next in transitions"
              :key="next"
              :variant="next === 'rejected' ? 'ghost' : next === transitions[0] ? 'primary' : 'secondary'"
              size="sm"
              :loading="pendingStatus === next"
              :disabled="Boolean(pendingStatus)"
              @click="onChangeStatus(next)"
            >
              {{ CAPABILITY_TRANSITION_LABELS[next] ?? CAPABILITY_STATUS_META[next].label }}
            </BaseButton>
          </template>
        </template>
      </PageHeader>

      <!-- Fusionada: todo vive en la capacidad destino -->
      <div v-if="isMerged" role="status" class="mb-6 rounded-2xl border border-lumia-ink/[0.08] bg-lumia-cream/60 p-5 text-sm text-lumia-ink/75">
        Esta capacidad se fusionó con otra. Sus peticiones y su contador están en la capacidad destino.
        <NuxtLink v-if="capability.mergedInto" :to="`/lumi/capacidades/${capability.mergedInto}`" class="ml-1 font-medium text-lumia-ink underline decoration-lumia-gold/60 underline-offset-4 hover:text-lumia-gold">
          Ver la capacidad destino
        </NuxtLink>
      </div>

      <!-- Posible duplicado: la decisión es del administrador -->
      <div
        v-else-if="capability.possibleDuplicateOf"
        role="status"
        class="mb-6 flex flex-col gap-3 rounded-2xl border border-status-warning/20 bg-status-warning-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="flex items-start gap-2 text-sm text-lumia-ink/80">
          <IconAlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-status-warning" stroke-width="1.75" aria-hidden="true" />
          <span>
            Puede ser la misma petición que otra capacidad ya registrada.
            <NuxtLink :to="`/lumi/capacidades/${capability.possibleDuplicateOf}`" class="font-medium text-lumia-ink underline decoration-lumia-gold/60 underline-offset-4 hover:text-lumia-gold">Compararla</NuxtLink>
          </span>
        </p>
        <BaseButton v-if="canMerge" variant="secondary" size="sm" @click="mergeOpen = true">Fusionar…</BaseButton>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <BaseCard title="Lo que pidieron" :description="requestsCaption">
            <EmptyState
              v-if="!detail.recentRequests.length"
              compact
              :title="isMerged ? 'Las frases están en la capacidad destino' : 'Sin frases registradas'"
            />
            <ul v-else class="divide-y divide-lumia-ink/[0.06]">
              <li v-for="(req, index) in detail.recentRequests" :key="`${req.createdAt}-${index}`" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <p class="text-sm leading-relaxed text-lumia-ink/85">«{{ req.message }}»</p>
                <p class="shrink-0 text-[12px] text-lumia-ink/45">{{ formatDateTime(req.createdAt) }}</p>
              </li>
            </ul>
          </BaseCard>

          <BaseCard title="Especificación" description="Lo que necesita quien programe la herramienta. Lumi no la crea ni la habilita sola.">
            <template v-if="canManage && !isMerged">
              <CapabilitySpecForm :capability="capability" @saved="onSaved" />
            </template>
            <dl v-else class="space-y-3 text-sm">
              <div v-for="field in CAPABILITY_SPEC_FIELDS" :key="field.key">
                <dt class="text-[12px] text-lumia-ink/50">{{ field.label }}</dt>
                <dd class="whitespace-pre-line text-lumia-ink">{{ capability.spec[field.key] || '—' }}</dd>
              </div>
            </dl>
          </BaseCard>

          <template v-if="!isMerged">
            <BaseCard
              title="Frases de prueba"
              description="Qué debería pasar con cada frase. Las de validación deciden la batería; las de control solo las usa el banco de medición."
            >
              <CapabilityPhrases :capability="capability" :requested="requestedPhrases" :can-manage="canManage" @changed="onPhrasesChanged" />
            </BaseCard>

            <BaseCard
              title="Probar"
              description="Mismo camino que el chat (reglas, selector y Server) con tus permisos. Solo se ejecutan consultas de lectura: nada se crea, registra ni envía."
            >
              <CapabilityTesting
                :capability-id="capability.id"
                :can-test="canTest"
                :runnable-phrases="runnablePhrases"
                :decides-status="decidesStatus"
                :capability-status="capability.status"
                :validation-count="validationCount"
                @finished="refresh"
              />
            </BaseCard>
          </template>
        </div>

        <div class="space-y-6">
          <BaseCard v-if="!isMerged" title="Activación" description="Habilitar es manual y solo con la batería aprobada.">
            <CapabilityActivation :capability="capability" @changed="onSaved" />
          </BaseCard>

          <BaseCard title="Resumen">
            <dl class="space-y-2.5 text-sm">
              <div v-if="capability.toolName">
                <dt class="text-[12px] text-lumia-ink/50">Herramienta</dt>
                <dd class="font-mono text-[12px] text-lumia-ink/80">{{ capability.toolName }}</dd>
              </div>
              <div><dt class="text-[12px] text-lumia-ink/50">Prioridad</dt><dd class="text-lumia-ink">{{ CAPABILITY_PRIORITY_META[capability.priority].label }}</dd></div>
              <div v-if="capability.lastTest">
                <dt class="text-[12px] text-lumia-ink/50">Última batería</dt>
                <dd class="flex flex-wrap items-center gap-2 text-lumia-ink">
                  <BaseBadge :tone="capability.lastTest.passed === true ? 'positive' : capability.lastTest.passed === false ? 'danger' : 'neutral'">
                    {{ capability.lastTest.passed === true ? 'Pasa' : capability.lastTest.passed === false ? 'No pasa' : 'Sin validación' }}
                  </BaseBadge>
                  <span class="text-[13px] text-lumia-ink/65">
                    <template v-if="capability.lastTest.validationAccuracy !== null">{{ Math.round(capability.lastTest.validationAccuracy * 100) }} % · </template>{{ formatDateTime(capability.lastTest.at) }}
                  </span>
                </dd>
              </div>
              <div><dt class="text-[12px] text-lumia-ink/50">Personas distintas</dt><dd class="tabular-nums text-lumia-ink">{{ detail.distinctUsers }}</dd></div>
              <div><dt class="text-[12px] text-lumia-ink/50">Detectada</dt><dd class="text-lumia-ink">{{ formatDateTime(capability.firstSeenAt) }}</dd></div>
              <div v-if="capability.description"><dt class="text-[12px] text-lumia-ink/50">Descripción</dt><dd class="whitespace-pre-line text-lumia-ink">{{ capability.description }}</dd></div>
              <div><dt class="text-[12px] text-lumia-ink/50">Clave</dt><dd class="break-all font-mono text-[12px] text-lumia-ink/70">{{ capability.key }}</dd></div>
              <div v-if="capability.keywords.length">
                <dt class="text-[12px] text-lumia-ink/50">Palabras clave (agrupación)</dt>
                <dd class="mt-1 flex flex-wrap gap-1.5">
                  <BaseBadge v-for="word in capability.keywords" :key="word">{{ word }}</BaseBadge>
                </dd>
              </div>
            </dl>
            <div class="mt-5 flex flex-wrap gap-2 border-t border-lumia-ink/[0.06] pt-4">
              <BaseButton v-if="canManage && !isMerged" variant="secondary" size="sm" @click="generalOpen = true">
                <template #icon><IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                Editar
              </BaseButton>
              <BaseButton v-if="canMerge" variant="ghost" size="sm" @click="mergeOpen = true">
                <template #icon><IconGitMerge class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                Fusionar
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="copyMarkdown">
                <template #icon><IconCopy class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                Copiar en Markdown
              </BaseButton>
            </div>
          </BaseCard>

          <BaseCard title="Historial">
            <ol class="space-y-3">
              <li v-for="(entry, index) in historyNewestFirst" :key="`${entry.at}-${index}`" class="text-sm">
                <p class="text-lumia-ink/85">{{ historyLabel(entry) }}</p>
                <p class="text-[12px] text-lumia-ink/45">{{ entry.by === 'system' ? 'Lumi' : 'Administrador' }} · {{ formatDateTime(entry.at) }}</p>
              </li>
            </ol>
          </BaseCard>
        </div>
      </div>

      <CapabilityGeneralDialog v-model:open="generalOpen" :capability="capability" @saved="onSaved" />
      <CapabilityMergeDialog v-model:open="mergeOpen" :capability="capability" @merged="onMerged" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconCopy, IconGitMerge, IconPencil } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import {
  CAPABILITY_MANUAL_TRANSITIONS,
  CAPABILITY_MODULE_LABELS,
  CAPABILITY_PRIORITY_META,
  CAPABILITY_SPEC_FIELDS,
  CAPABILITY_STATUS_META,
  CAPABILITY_STATUSES,
  CAPABILITY_TRANSITION_LABELS,
  capabilityDetailSchema,
  capabilityResponseSchema,
  capabilityToMarkdown,
  type Capability,
  type CapabilityDetail,
  type CapabilityStatus,
} from '#shared/schemas/lumi-capabilities'
import type { CapabilityPhrase } from '#shared/schemas/lumi-capability-tests'
import { formatDateTime } from '~/features/lumi-admin/utils/format'

/** Espejo de BATTERY_STATUSES del Server (solo para el texto de ayuda). */
const BATTERY_STATUSES: readonly CapabilityStatus[] = ['ready_for_testing', 'testing', 'failed', 'validated']

definePageMeta({
  layout: 'admin',
  title: 'Capacidad de Lumi',
  permissions: [PERMISSIONS.LUMI_CAPABILITIES_READ],
  breadcrumbs: [{ label: 'Lumi' }, { label: 'Capacidades', to: '/lumi/capacidades' }, { label: 'Detalle' }],
})

const route = useRoute()
const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const canManage = computed(() => auth.can(PERMISSIONS.LUMI_CAPABILITIES_MANAGE))
const canTest = computed(() => auth.can(PERMISSIONS.LUMI_CAPABILITIES_TEST))
/** Una capacidad con herramienta no se fusiona en otra (el Server lo rechaza): se fusionan las demás en ella. */
const canMerge = computed(() => canManage.value && !isMerged.value && !capability.value?.toolName)

// Fase D: la batería decide el estado si la capacidad está en pruebas y hay frases de validación.
const phrases = ref<CapabilityPhrase[]>([])
const runnablePhrases = computed(() => phrases.value.filter((p) => p.role !== 'control').length)
const decidesStatus = computed(
  () =>
    Boolean(capability.value && BATTERY_STATUSES.includes(capability.value.status)) &&
    phrases.value.some((p) => p.role === 'validation'),
)
const validationCount = computed(() => phrases.value.filter((p) => p.role === 'validation').length)
/** Frases que se pidieron en el chat (las más recientes primero), para añadirlas a las pruebas con un clic. */
const requestedPhrases = computed(() => [...(detail.value?.recentRequests.map((r) => r.message) ?? []), ...(capability.value?.samples ?? [])])

function onPhrasesChanged(value: CapabilityPhrase[]) {
  phrases.value = value
}

const { data: detail, status, error, refresh } = useAsyncData<CapabilityDetail>(
  () => `admin-lumi-capability-${id.value}`,
  () => request<unknown>(`/api/admin/lumi/capabilities/${id.value}`).then((raw) => capabilityDetailSchema.parse(raw)),
  { watch: [id] },
)
const capability = computed(() => detail.value?.capability ?? null)
const loading = computed(() => status.value === 'pending')
const loadError = computed(() => (error.value ? toUiError(error.value) : null))
const isMerged = computed(() => capability.value?.status === 'duplicate')

useHead({ title: () => (capability.value ? `${capability.value.title} · Capacidades · Lumia Admin` : 'Capacidad · Lumia Admin') })

const transitions = computed<CapabilityStatus[]>(() =>
  capability.value ? [...(CAPABILITY_MANUAL_TRANSITIONS[capability.value.status] ?? [])] : [],
)

const generalOpen = ref(false)
const mergeOpen = ref(false)
const pendingStatus = ref<CapabilityStatus | null>(null)

function onSaved(updated: Capability) {
  if (detail.value) detail.value = { ...detail.value, capability: updated }
}

async function onMerged() {
  await refresh()
}

async function onChangeStatus(next: CapabilityStatus) {
  if (!capability.value) return
  if (next === 'rejected') {
    const ok = await confirm({
      title: 'Rechazar capacidad',
      description: `«${capability.value.title}» quedará rechazada. Las peticiones nuevas se seguirán contando aquí y podrás reabrirla.`,
      confirmLabel: 'Rechazar',
      tone: 'danger',
    })
    if (!ok) return
  }
  pendingStatus.value = next
  try {
    const { capability: updated } = capabilityResponseSchema.parse(
      await request<unknown>(`/api/admin/lumi/capabilities/${capability.value.id}/status`, { method: 'POST', body: { status: next } }),
    )
    onSaved(updated)
    toast.success(`Estado: ${CAPABILITY_STATUS_META[next].label.toLowerCase()}`)
  } catch (e) {
    toast.error('No se pudo cambiar el estado', toUiError(e).message)
  } finally {
    pendingStatus.value = null
  }
}

const requestsCaption = computed(() => {
  const n = detail.value?.recentRequests.length ?? 0
  if (n === 0) return 'Frases tal como se escribieron, sin autor.'
  return n === 1 ? 'La frase tal como se escribió, sin autor.' : `Las últimas ${n} frases, tal como se escribieron, sin autor.`
})

const historyNewestFirst = computed(() => [...(capability.value?.history ?? [])].reverse())

function statusLabel(value: string | undefined): string {
  return value && (CAPABILITY_STATUSES as readonly string[]).includes(value)
    ? CAPABILITY_STATUS_META[value as CapabilityStatus].label
    : (value ?? '')
}

function historyLabel(entry: Capability['history'][number]): string {
  switch (entry.action) {
    case 'created':
      return 'Registrada desde el chat'
    case 'updated':
      return 'Datos o especificación editados'
    case 'status':
      return `Estado: ${statusLabel(entry.from)} → ${statusLabel(entry.to)}`
    case 'merged_from':
      return 'Absorbió otra capacidad'
    case 'merged_into':
      return 'Fusionada con otra capacidad'
    case 'tested':
      return 'Batería de pruebas ejecutada'
    case 'implemented':
      return `Implementada por la herramienta ${entry.to ?? ''}`.trim()
  }
}

async function copyMarkdown() {
  if (!detail.value) return
  const markdown = capabilityToMarkdown(detail.value.capability, detail.value.recentRequests.map((r) => r.message))
  try {
    await navigator.clipboard.writeText(markdown)
    toast.success('Especificación copiada', 'Pégala donde la necesites.')
  } catch {
    toast.error('No se pudo copiar', 'El navegador no permitió usar el portapapeles.')
  }
}
</script>
