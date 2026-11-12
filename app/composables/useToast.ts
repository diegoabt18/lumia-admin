import { toast } from 'vue-sonner'

/** Notificaciones (vue-sonner, mismo sistema que Lumia 2.0). */
export function useToast() {
  return {
    success: (message: string, description?: string) => toast.success(message, { description }),
    error: (message: string, description?: string) => toast.error(message, { description }),
    info: (message: string, description?: string) => toast.info(message, { description }),
    warning: (message: string, description?: string) => toast.warning(message, { description }),
  }
}
