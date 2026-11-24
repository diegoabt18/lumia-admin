import type { DesktopUploadResult } from '#shared/schemas/desktop'

/**
 * Envía un archivo a una carpeta autorizada de un equipo. Calcula el SHA-256 en el navegador
 * (Web Crypto) y lo sube con XMLHttpRequest para mostrar el progreso real: fetch no lo ofrece.
 * Una sesión caducada cierra la sesión igual que useAdminApi.
 */
export function useDesktopUpload() {
  const auth = useAuth()
  const phase = ref<'idle' | 'hashing' | 'uploading'>('idle')
  /** 0–1 durante la subida al BFF; el equipo confirma al final. */
  const progress = ref(0)
  let current: XMLHttpRequest | null = null

  async function sha256Hex(file: File): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  function send(url: string, file: File): Promise<DesktopUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      current = xhr
      xhr.open('POST', url)
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
      xhr.responseType = 'json'
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) progress.value = e.loaded / e.total
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as DesktopUploadResult)
        // Misma forma que los errores de $fetch, para toUiError.
        else reject({ statusCode: xhr.status, data: xhr.response })
      }
      xhr.onerror = () => reject({ statusCode: 0 })
      xhr.onabort = () => reject({ statusCode: 499, data: { code: 'CANCELLED', message: 'Envío cancelado.' } })
      xhr.send(file)
    })
  }

  async function upload(input: { deviceId: string; root: string; dir: string; file: File }): Promise<DesktopUploadResult> {
    progress.value = 0
    phase.value = 'hashing'
    try {
      const sha256 = await sha256Hex(input.file)
      phase.value = 'uploading'
      const query = new URLSearchParams({
        root: input.root,
        dir: input.dir,
        name: input.file.name,
        size: String(input.file.size),
        sha256,
      })
      return await send(`/api/admin/desktop/devices/${input.deviceId}/files/upload?${query}`, input.file)
    } catch (error) {
      if (isSessionError(toUiError(error))) await auth.handleSessionLost()
      throw error
    } finally {
      phase.value = 'idle'
      current = null
    }
  }

  /** Corta el envío desde el navegador; el Server cancela la tarea y el equipo borra el temporal. */
  function cancel() {
    current?.abort()
  }

  return { phase, progress, upload, cancel }
}
