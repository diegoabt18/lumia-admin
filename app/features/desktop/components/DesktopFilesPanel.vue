<template>
  <section aria-labelledby="files-title">
    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="files-title" class="font-display text-xl leading-tight text-lumia-ink">Archivos</h2>
        <p class="mt-0.5 max-w-prose text-[13px] text-lumia-ink/60">
          Solo las carpetas autorizadas en el propio equipo. Máximo 100 MB por archivo; nunca se reemplaza un archivo existente.
        </p>
      </div>
      <div v-if="roots.length" class="flex flex-wrap items-center gap-2">
        <BaseSelect
          :id="selectId"
          v-model="rootId"
          class="min-w-[12rem]"
          :options="roots.map((r) => ({ value: r.id, label: r.name }))"
          aria-label="Carpeta autorizada"
        />
        <BaseButton variant="ghost" size="sm" :loading="listing" @click="loadList">
          <template #icon><IconRefresh class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
          Actualizar
        </BaseButton>
        <template v-if="canWrite">
          <input ref="fileInput" type="file" class="sr-only" tabindex="-1" aria-hidden="true" @change="onFileChosen">
          <BaseButton size="sm" :disabled="busy" :loading="uploader.phase.value !== 'idle'" @click="fileInput?.click()">
            <template #icon><IconUpload class="h-4 w-4" stroke-width="1.75" aria-hidden="true" /></template>
            Enviar archivo
          </BaseButton>
        </template>
      </div>
    </div>

    <BaseCard :padded="false">
      <div v-if="rootsLoading" class="space-y-2 p-5">
        <BaseSkeleton v-for="n in 3" :key="n" class="h-9 w-full" />
      </div>
      <ErrorState v-else-if="rootsError" class="p-5" :message="rootsError" @retry="loadRoots" />
      <div v-else-if="!roots.length" class="p-5">
        <EmptyState
          compact
          title="Sin carpetas autorizadas"
          description="En el equipo, abre Lumia Desktop Agent → Ajustes → Carpetas autorizadas y añade las que Lumia puede usar."
        />
      </div>
      <template v-else>
        <nav class="flex flex-wrap items-center gap-1 border-b border-lumia-ink/[0.06] px-5 py-3 text-[13px]" aria-label="Ubicación">
          <button type="button" class="rounded-md px-1.5 py-0.5 font-medium text-lumia-ink hover:bg-lumia-cream" @click="go('')">
            {{ currentRoot?.name }}
          </button>
          <template v-for="(crumb, i) in crumbs" :key="crumb.path">
            <IconChevronRight class="h-3.5 w-3.5 text-lumia-ink/35" stroke-width="1.75" aria-hidden="true" />
            <button
              type="button"
              class="rounded-md px-1.5 py-0.5 hover:bg-lumia-cream"
              :class="i === crumbs.length - 1 ? 'font-medium text-lumia-ink' : 'text-lumia-ink/65'"
              :aria-current="i === crumbs.length - 1 ? 'location' : undefined"
              @click="go(crumb.path)"
            >
              {{ crumb.name }}
            </button>
          </template>
        </nav>

        <div v-if="uploader.phase.value !== 'idle'" class="flex items-center gap-3 border-b border-lumia-ink/[0.06] bg-lumia-cream/40 px-5 py-3 text-[13px]" role="status">
          <span class="min-w-0 flex-1 truncate">
            {{ uploader.phase.value === 'hashing' ? 'Calculando huella de' : 'Enviando' }} «{{ uploadingName }}»
            <template v-if="uploader.phase.value === 'uploading'"> · {{ Math.round(uploader.progress.value * 100) }}%</template>
          </span>
          <div class="h-1.5 w-32 overflow-hidden rounded-full bg-lumia-ink/10" aria-hidden="true">
            <div class="h-full bg-lumia-gold transition-[width]" :style="{ width: `${Math.round(uploader.progress.value * 100)}%` }" />
          </div>
          <BaseButton variant="ghost" size="sm" @click="uploader.cancel()">Cancelar</BaseButton>
        </div>

        <ErrorState v-if="listError && !entries.length" class="p-5" :message="listError" @retry="loadList" />
        <div v-else-if="listing && !entries.length" class="space-y-2 p-5">
          <BaseSkeleton v-for="n in 4" :key="n" class="h-9 w-full" />
        </div>
        <p v-else-if="!entries.length" class="px-5 py-6 text-[13px] text-lumia-ink/55">Carpeta vacía.</p>
        <ul v-else class="divide-y divide-lumia-ink/[0.05]" :class="listing && 'opacity-60'">
          <li v-for="entry in entries" :key="entry.name" class="flex items-center gap-3 px-5 py-2.5">
            <IconFolder v-if="entry.kind === 'dir'" class="h-5 w-5 shrink-0 text-lumia-gold" stroke-width="1.5" aria-hidden="true" />
            <IconFile v-else class="h-5 w-5 shrink-0 text-lumia-ink/45" stroke-width="1.5" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <button
                v-if="entry.kind === 'dir'"
                type="button"
                class="max-w-full truncate text-left text-[14px] text-lumia-ink hover:underline"
                @click="go(join(path, entry.name))"
              >
                {{ entry.name }}
              </button>
              <p v-else class="truncate text-[14px] text-lumia-ink">{{ entry.name }}</p>
              <p class="text-[12px] text-lumia-ink/50">
                <template v-if="entry.kind === 'file' && entry.size !== null">{{ formatBytes(entry.size) }} · </template>
                {{ entry.modified ? formatDateTime(entry.modified) : '' }}
              </p>
            </div>
            <a
              v-if="entry.kind === 'file' && entry.size !== null && entry.size <= DESKTOP_MAX_FILE_BYTES"
              :href="downloadUrl(entry.name)"
              download
              class="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] text-lumia-ink/75 hover:bg-lumia-cream hover:text-lumia-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lumia-gold/70"
            >
              <IconDownload class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
              Descargar
            </a>
            <span v-else-if="entry.kind === 'file'" class="text-[12px] text-lumia-ink/45">Más de 100 MB</span>
          </li>
        </ul>
        <p v-if="list?.truncated || list?.skipped" class="border-t border-lumia-ink/[0.06] px-5 py-2.5 text-[12px] text-lumia-ink/50">
          <template v-if="list?.truncated">Se muestran los primeros 500 elementos. </template>
          <template v-if="list?.skipped">{{ list.skipped }} elemento(s) ocultos: accesos directos o vínculos, o nombres que no se pueden usar.</template>
        </p>
      </template>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
import { IconChevronRight, IconDownload, IconFile, IconFolder, IconRefresh, IconUpload } from '@tabler/icons-vue'
import {
  DESKTOP_MAX_FILE_BYTES,
  desktopFileNameSchema,
  type DesktopFileList,
  type DesktopFileRoot,
} from '#shared/schemas/desktop'

/**
 * Explorador de las carpetas autorizadas de un equipo. Cada listado es una operación firmada en el
 * equipo (queda en su historial). Descargar es un enlace normal: el navegador recibe el archivo en
 * streaming. Enviar pide confirmación y nunca reemplaza un archivo existente.
 */
const props = defineProps<{ deviceId: string; deviceName: string; canWrite: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { request } = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const uploader = useDesktopUpload()
const selectId = useId()

const roots = ref<DesktopFileRoot[]>([])
const rootsLoading = ref(false)
const rootsError = ref<string | null>(null)
const rootId = ref('')
const path = ref('')
const list = ref<DesktopFileList | null>(null)
const listing = ref(false)
const listError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingName = ref('')

const currentRoot = computed(() => roots.value.find((r) => r.id === rootId.value))
const entries = computed(() => list.value?.entries ?? [])
const busy = computed(() => listing.value || uploader.phase.value !== 'idle')
const crumbs = computed(() => {
  const parts = path.value ? path.value.split('/') : []
  return parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join('/') }))
})

function join(dir: string, name: string) {
  return dir ? `${dir}/${name}` : name
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function downloadUrl(name: string) {
  const query = new URLSearchParams({ root: rootId.value, path: join(path.value, name) })
  return `/api/admin/desktop/devices/${props.deviceId}/files/download?${query}`
}

async function loadRoots() {
  rootsLoading.value = true
  rootsError.value = null
  try {
    const data = await request<{ roots: DesktopFileRoot[] }>(`/api/admin/desktop/devices/${props.deviceId}/files/roots`)
    roots.value = data.roots
    if (!roots.value.some((r) => r.id === rootId.value)) {
      rootId.value = roots.value[0]?.id ?? ''
      path.value = ''
    }
  } catch (e) {
    rootsError.value = toUiError(e).message
  } finally {
    rootsLoading.value = false
  }
}

let listSeq = 0
async function loadList() {
  if (!rootId.value) return
  const seq = ++listSeq
  listing.value = true
  listError.value = null
  try {
    const data = await request<DesktopFileList>(`/api/admin/desktop/devices/${props.deviceId}/files`, {
      query: { root: rootId.value, path: path.value },
    })
    if (seq === listSeq) list.value = data
  } catch (e) {
    if (seq !== listSeq) return
    const ui = toUiError(e)
    listError.value = ui.message
    // La carpeta abierta ya no existe: volver al inicio de la carpeta autorizada.
    if (ui.code === 'FILE_NOT_FOUND' && path.value) go('')
    if (ui.code === 'PATH_NOT_ALLOWED') void loadRoots()
  } finally {
    if (seq === listSeq) listing.value = false
  }
}

function go(target: string) {
  path.value = target
  list.value = null
  void loadList()
}

watch(rootId, () => go(''))

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > DESKTOP_MAX_FILE_BYTES) {
    toast.error('Archivo demasiado grande', 'El máximo es 100 MB.')
    return
  }
  if (!desktopFileNameSchema.safeParse(file.name).success) {
    toast.error('Nombre no válido', 'Renombra el archivo: no puede contener \\ / : * ? " < > |.')
    return
  }
  if (entries.value.some((e) => e.name.toLowerCase() === file.name.toLowerCase())) {
    toast.error('Ya existe', `En esta carpeta ya hay «${file.name}». Lumia nunca reemplaza archivos.`)
    return
  }
  const where = [currentRoot.value?.name, ...crumbs.value.map((c) => c.name)].join(' / ')
  const ok = await confirm({
    title: `¿Enviar «${file.name}»?`,
    description: `${formatBytes(file.size)} a «${where}» en «${props.deviceName}». Se comprobará con SHA-256 y no se reemplazará ningún archivo.`,
    confirmLabel: 'Enviar',
  })
  if (!ok) return
  uploadingName.value = file.name
  try {
    await uploader.upload({ deviceId: props.deviceId, root: rootId.value, dir: path.value, file })
    toast.success('Archivo enviado', `«${file.name}» está en el equipo y su SHA-256 coincide.`)
    emit('changed')
    await loadList()
  } catch (e) {
    const ui = toUiError(e)
    if (ui.code !== 'CANCELLED') toast.error('No se pudo enviar', ui.message)
  }
}

onMounted(loadRoots)
</script>
