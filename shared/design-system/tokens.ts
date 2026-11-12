/**
 * Tokens visuales de Lumia Admin.
 *
 * Base: lumia2.0/shared/design-system/tokens.ts (referencia visual principal del ecosistema).
 * La paleta `lumia`, la tipografía, las sombras, los radios y las transiciones son idénticos
 * a Lumia 2.0. Si cambian allí, actualiza este archivo para conservar la coherencia.
 *
 * `adminStatus` es la única extensión propia: los estados semánticos que un panel necesita
 * (error, advertencia, información) y que la tienda no define. Se eligieron tonos apagados
 * que conviven con la paleta cálida en lugar de los rojos/azules saturados de una plantilla.
 */

export const lumiaColors = {
  black: '#0F0F0F',
  cream: '#F6F1E7',
  gold: '#C9A24A',
  beige: '#E8DCC8',
  ink: '#2B2B2B',
  canvas: '#FAF8F5',
  success: '#D6E5DA',
} as const

export const adminStatus = {
  'danger': '#B4473B',
  'danger-soft': '#F4DEDA',
  'warning': '#A9741C',
  'warning-soft': '#F5E7CC',
  'info': '#3F6683',
  'info-soft': '#DCE6EE',
  'positive': '#3E7A55',
  'positive-soft': '#D6E5DA',
} as const

/**
 * Color de las marcas de datos (barras). El dorado de la marca (#C9A24A) tiene 2,4:1 sobre blanco,
 * por debajo del 3:1 que necesita una marca gráfica; este tono del mismo matiz pasa (validado con
 * el validador de paletas de la guía dataviz).
 */
export const adminChart = {
  bar: '#A8833A',
} as const

export const lumiaFonts = {
  display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
  sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
} as const

export const lumiaLayout = {
  maxContent: '1280px',
  sidebarWidth: '256px',
} as const

export const lumiaShadows = {
  soft: '0 4px 24px -4px rgba(43, 43, 43, 0.08), 0 8px 32px -8px rgba(43, 43, 43, 0.06)',
  softLg: '0 12px 40px -12px rgba(43, 43, 43, 0.12)',
} as const

export const lumiaTransitions = {
  fast: '150ms',
  normal: '200ms',
} as const
