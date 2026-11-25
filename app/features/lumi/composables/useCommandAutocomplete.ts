/**
 * Composable para autocompletado de comandos en Lumi chat.
 * Detecta comandos con / y muestra sugerencias.
 */

export interface CommandSuggestion {
  prefix: string
  label: string
  description: string
  example: string
}

const COMMAND_SUGGESTIONS: readonly CommandSuggestion[] = [
  {
    prefix: 'play',
    label: 'Reproducir música',
    description: 'Busca y reproduce música en YouTube',
    example: '/play Numb de Linkin Park',
  },
  {
    prefix: 'reproduce',
    label: 'Reproducir (Spanish)',
    description: 'Busca y reproduce música en YouTube',
    example: '/reproduce Imagine John Lennon',
  },
  {
    prefix: 'music',
    label: 'Music (English)',
    description: 'Search and play music on YouTube',
    example: '/music Bohemian Rhapsody',
  },
]

export interface AutocompleteState {
  isOpen: boolean
  filteredSuggestions: CommandSuggestion[]
  selectedIndex: number
  triggerPosition: number
}

export function useCommandAutocomplete() {
  const state = reactive<AutocompleteState>({
    isOpen: false,
    filteredSuggestions: [],
    selectedIndex: 0,
    triggerPosition: 0,
  })

  /**
   * Detecta si la posición actual está en un comando y retorna la parte del comando.
   * Ej: "/pl" retorna "pl", "/play Numb" retorna "play"
   */
  function getCommandAtCursor(text: string, cursorPos: number): { prefix: string; fullText: string } | null {
    // Find the last / before cursor
    const lastSlashIndex = text.lastIndexOf('/', cursorPos - 1)
    if (lastSlashIndex === -1 || lastSlashIndex === cursorPos - 1) return null

    // Check if there's already a space (we're past the command)
    const textAfterSlash = text.substring(lastSlashIndex + 1, cursorPos)
    const spaceIndex = textAfterSlash.indexOf(' ')

    if (spaceIndex !== -1) {
      // User has already typed the command and space, show nothing
      return null
    }

    // Extract the command prefix being typed
    const prefix = textAfterSlash.toLowerCase()

    // Only show suggestions if prefix is valid (starts with letter, no special chars)
    if (!/^[a-z]*$/.test(prefix)) return null

    return { prefix, fullText: textAfterSlash }
  }

  /**
   * Actualiza las sugerencias basadas en el texto actual.
   */
  function updateSuggestions(text: string, cursorPos: number) {
    const command = getCommandAtCursor(text, cursorPos)

    if (!command) {
      state.isOpen = false
      state.filteredSuggestions = []
      state.selectedIndex = 0
      return
    }

    // Filter suggestions by prefix
    const filtered = COMMAND_SUGGESTIONS.filter((s) => s.prefix.startsWith(command.prefix))

    if (filtered.length === 0) {
      state.isOpen = false
      return
    }

    state.isOpen = true
    state.filteredSuggestions = filtered
    state.selectedIndex = 0
    state.triggerPosition = text.lastIndexOf('/')
  }

  /**
   * Completa el comando con la sugerencia seleccionada.
   */
  function completeCommand(text: string, cursorPos: number, suggestion: CommandSuggestion): string {
    const command = getCommandAtCursor(text, cursorPos)
    if (!command) return text

    const slashIndex = text.lastIndexOf('/', cursorPos - 1)
    if (slashIndex === -1) return text

    // Replace the partial command with the full command and a space
    const before = text.substring(0, slashIndex)
    const after = text.substring(cursorPos)
    return `${before}/${suggestion.prefix} ${after}`
  }

  /**
   * Maneja teclas especiales para navegación de sugerencias.
   */
  function handleKeydown(event: KeyboardEvent, text: string, cursorPos: number): boolean {
    if (!state.isOpen) return false

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        state.selectedIndex = (state.selectedIndex + 1) % state.filteredSuggestions.length
        return true

      case 'ArrowUp':
        event.preventDefault()
        state.selectedIndex =
          (state.selectedIndex - 1 + state.filteredSuggestions.length) % state.filteredSuggestions.length
        return true

      case 'Tab':
      case 'Enter':
        event.preventDefault()
        return true // Parent should handle completion

      case 'Escape':
        event.preventDefault()
        state.isOpen = false
        return true

      default:
        return false
    }
  }

  /**
   * Obtiene la sugerencia seleccionada actualmente.
   */
  function getSelectedSuggestion(): CommandSuggestion | null {
    if (!state.isOpen || state.selectedIndex >= state.filteredSuggestions.length) return null
    return state.filteredSuggestions[state.selectedIndex] ?? null
  }

  return {
    state,
    updateSuggestions,
    completeCommand,
    handleKeydown,
    getSelectedSuggestion,
  }
}
