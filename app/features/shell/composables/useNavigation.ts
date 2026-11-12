import type { NavGroup } from '~/types/ui'
import { NAVIGATION } from '../navigation'

/** Navegación filtrada por los permisos efectivos de la sesión (solo presentación). */
export function useNavigation() {
  const auth = useAuth()

  const groups = computed<NavGroup[]>(() =>
    NAVIGATION.map((group) => ({
      label: group.label,
      items: group.items.filter((item) => auth.canAny(item.anyOf)),
    })).filter((group) => group.items.length > 0),
  )

  return { groups }
}
