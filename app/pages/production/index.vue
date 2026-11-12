<template>
  <div>
    <PageHeader eyebrow="Producción" title="Producción y costeo" />
    <EmptyState
      title="Sin secciones disponibles"
      description="Tu cuenta no tiene permisos de lectura para recetas, materiales, proveedores ni unidades. El costeo y la publicación de precios llegarán en una próxima etapa."
    />
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import { PRODUCTION_SECTIONS } from '~/features/production/sections'

definePageMeta({
  layout: 'admin',
  title: 'Producción',
  permissions: [PERMISSIONS.MATERIALS_READ, PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.UNITS_READ, PERMISSIONS.RECIPES_READ, PERMISSIONS.COSTING_READ],
  breadcrumbs: [{ label: 'Producción' }],
})

// Entrada del menú: lleva a la primera sección que la cuenta puede ver.
const auth = useAuth()
const first = PRODUCTION_SECTIONS.find((s) => auth.can(s.permission))
if (first) await navigateTo(first.to, { replace: true })
</script>
