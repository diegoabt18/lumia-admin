import {
  LUMI_DEFAULT_OFFSET,
  LUMI_POSITION_STORAGE_KEY,
  clampOffset,
  parseOffset,
  readSafeAreaInsets,
  type LumiOffset,
  type ViewportSize,
} from '~/features/lumi/utils/position'

/** Movimiento mínimo (px) para considerar un gesto como arrastre y no como clic. */
const DRAG_THRESHOLD_PX = 5
const KEYBOARD_STEP_PX = 16

function viewport(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * Posición del icono de Lumi: arrastre con pointer events (ratón, táctil y lápiz),
 * límites del viewport y áreas seguras, y persistencia en localStorage.
 * Todo acceso a localStorage va protegido: en modo privado o con datos bloqueados se usa la posición por defecto.
 */
export function useLumiPosition() {
  const offset = useState<LumiOffset>('lumi-offset', () => ({ ...LUMI_DEFAULT_OFFSET }))
  const dragging = ref(false)

  let start: { x: number; y: number; offset: LumiOffset; pointerId: number } | null = null
  let moved = false

  function currentInsets() {
    return readSafeAreaInsets()
  }

  function restore() {
    let saved: LumiOffset | null = null
    try {
      saved = parseOffset(JSON.parse(window.localStorage.getItem(LUMI_POSITION_STORAGE_KEY) ?? 'null'))
    } catch {
      saved = null
    }
    offset.value = clampOffset(saved ?? LUMI_DEFAULT_OFFSET, viewport(), currentInsets())
  }

  function persist() {
    try {
      window.localStorage.setItem(LUMI_POSITION_STORAGE_KEY, JSON.stringify(offset.value))
    } catch {
      // Sin almacenamiento disponible la posición solo dura la sesión de la página.
    }
  }

  /** Vuelve a encajar el icono si cambia el tamaño de la ventana (o el móvil gira). */
  function refit() {
    offset.value = clampOffset(offset.value, viewport(), currentInsets())
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    start = { x: event.clientX, y: event.clientY, offset: { ...offset.value }, pointerId: event.pointerId }
    moved = false
    const target = event.currentTarget as HTMLElement | null
    target?.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!start || event.pointerId !== start.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    moved = true
    dragging.value = true
    // Arrastrar a la derecha reduce "right"; hacia abajo reduce "bottom".
    offset.value = clampOffset(
      { right: start.offset.right - dx, bottom: start.offset.bottom - dy },
      viewport(),
      currentInsets(),
    )
  }

  /** Devuelve true si el gesto fue un arrastre (y por tanto no debe abrir el panel). */
  function onPointerUp(event: PointerEvent): boolean {
    if (!start || event.pointerId !== start.pointerId) return false
    const wasDrag = moved
    start = null
    dragging.value = false
    moved = false
    if (wasDrag) persist()
    return wasDrag
  }

  /** Alternativa de teclado: flechas mueven el icono sin ratón. */
  function nudge(direction: 'up' | 'down' | 'left' | 'right') {
    const delta = {
      up: { right: 0, bottom: KEYBOARD_STEP_PX },
      down: { right: 0, bottom: -KEYBOARD_STEP_PX },
      left: { right: KEYBOARD_STEP_PX, bottom: 0 },
      right: { right: -KEYBOARD_STEP_PX, bottom: 0 },
    }[direction]
    offset.value = clampOffset(
      { right: offset.value.right + delta.right, bottom: offset.value.bottom + delta.bottom },
      viewport(),
      currentInsets(),
    )
    persist()
  }

  /** Estilo CSS: las áreas seguras se suman en el propio CSS, así el valor guardado no depende del dispositivo. */
  const style = computed(() => ({
    right: `calc(env(safe-area-inset-right, 0px) + ${offset.value.right}px)`,
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${offset.value.bottom}px)`,
  }))

  return { offset, style, dragging, restore, refit, persist, nudge, onPointerDown, onPointerMove, onPointerUp }
}
