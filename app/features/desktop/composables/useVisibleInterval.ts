/**
 * Ejecuta `task` cada `ms` mientras la pestaña está visible (y una vez al volver a ella). Para el
 * estado en línea de los equipos: el Server no publica eventos de dispositivos, así que se consulta.
 */
export function useVisibleInterval(task: () => unknown, ms: number) {
  let timer: ReturnType<typeof setInterval> | undefined
  const tick = () => {
    if (document.visibilityState === 'visible') void task()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void task()
  }
  onMounted(() => {
    timer = setInterval(tick, ms)
    document.addEventListener('visibilitychange', onVisibility)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })
}
