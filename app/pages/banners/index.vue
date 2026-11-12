<template>
  <div>
    <PageHeader eyebrow="Catálogo" title="Banners" description="Piezas visuales de la tienda por posición y vigencia.">
      <template v-if="canUpdate" #actions>
        <BaseButton @click="openForm(null)">
          <template #icon><IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" /></template>
          Nuevo banner
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="loading && !banners.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <BaseSkeleton v-for="n in 3" :key="n" class="h-64 w-full" />
    </div>
    <ErrorState v-else-if="errorMessage && !banners.length" :message="errorMessage" @retry="refresh" />
    <BaseCard v-else-if="!banners.length">
      <EmptyState title="Aún no hay banners" description="Crea uno para destacar promociones o categorías en la tienda." />
    </BaseCard>

    <div v-else class="space-y-8">
      <section v-for="group in groups" :key="group.position" :aria-label="group.label">
        <h2 class="lumia-eyebrow mb-3">{{ group.label }}</h2>
        <ul class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <li v-for="b in group.items" :key="b.id" class="overflow-hidden rounded-2xl border border-lumia-ink/[0.07] bg-white/80 shadow-soft">
            <div class="relative aspect-[21/9] bg-lumia-cream/50">
              <img v-if="b.imageUrl" :src="b.imageUrl" :alt="b.title ?? 'Banner'" loading="lazy" referrerpolicy="no-referrer" class="h-full w-full object-cover">
              <span v-else class="flex h-full items-center justify-center text-[12px] text-lumia-ink/40">Imagen no https</span>
              <div class="absolute left-3 top-3 flex gap-1.5">
                <BaseBadge :tone="timingTone(b)">{{ timingLabel(b) }}</BaseBadge>
              </div>
            </div>
            <div class="space-y-2 p-4">
              <p class="font-medium text-lumia-ink">{{ b.title || 'Sin título' }}</p>
              <p class="text-[12px] text-lumia-ink/50">{{ formatDateTime(b.startsAt) }} → {{ formatDateTime(b.endsAt) }} · prioridad {{ b.priority }}</p>
              <p class="truncate text-[12px] text-lumia-ink/60">
                Destino: {{ b.ctaHref || (b.promotionId ? 'promoción' : b.categorySlug ? `categoría ${b.categorySlug}` : b.collectionSlug ? `colección ${b.collectionSlug}` : 'catálogo') }}
              </p>
              <div v-if="canUpdate" class="flex justify-end gap-1 pt-1">
                <BaseButton variant="ghost" size="sm" :disabled="deletingId === b.id" @click="openForm(b)">
                  <template #icon><IconPencil class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
                  Editar
                </BaseButton>
                <BaseButton variant="ghost" size="sm" :loading="deletingId === b.id" :disabled="Boolean(deletingId)" @click="onDelete(b)">
                  <template #icon><IconTrash class="h-4 w-4 text-status-danger" stroke-width="1.75" aria-hidden="true" /></template>
                  <span class="sr-only">Eliminar</span>
                </BaseButton>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <BannerFormDialog v-model:open="formOpen" :banner="editing" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-vue'
import { PERMISSIONS } from '#shared/auth/permissions'
import { BANNER_POSITIONS, type BannerRow } from '#shared/schemas/banners'

definePageMeta({
  layout: 'admin',
  title: 'Banners',
  permissions: [PERMISSIONS.PRODUCTS_READ],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Banners' }],
})

const auth = useAuth()
const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const canUpdate = computed(() => auth.can(PERMISSIONS.PRODUCTS_UPDATE))

const { data, status, error, refresh } = useAsyncData('admin-banners', () => request<{ items: BannerRow[] }>('/api/admin/banners'))
const banners = computed(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending')
const errorMessage = computed(() => (error.value ? toUiError(error.value).message : null))

/** Agrupa por posición en el orden del Server; posiciones desconocidas al final. */
const groups = computed(() => {
  const order = [...BANNER_POSITIONS, ...new Set(banners.value.map((b) => b.position))]
  return [...new Set(order)]
    .map((position) => ({
      position,
      label: banners.value.find((b) => b.position === position)?.positionLabel ?? position,
      items: banners.value.filter((b) => b.position === position).sort((a, b) => a.priority - b.priority),
    }))
    .filter((g) => g.items.length)
})

function timingLabel(b: BannerRow) {
  if (!b.active) return 'Inactivo'
  return { live: 'Visible', scheduled: 'Programado', expired: 'Vencido' }[b.timing]
}
function timingTone(b: BannerRow) {
  if (!b.active) return 'neutral' as const
  return ({ live: 'positive', scheduled: 'info', expired: 'neutral' } as const)[b.timing]
}

const formOpen = ref(false)
const editing = ref<BannerRow | null>(null)
function openForm(b: BannerRow | null) {
  editing.value = b
  formOpen.value = true
}

const deletingId = ref<string | null>(null)
async function onDelete(b: BannerRow) {
  const ok = await confirm({
    title: 'Eliminar banner',
    description: `${b.title || b.positionLabel}: se eliminará de forma permanente.`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  deletingId.value = b.id
  try {
    await request(`/api/admin/banners/${b.id}`, { method: 'DELETE' })
    toast.success('Banner eliminado')
    await refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', toUiError(e).message)
  } finally {
    deletingId.value = null
  }
}
</script>
