<template>
  <div>
    <PageHeader eyebrow="Producción" title="Nueva receta" description="Al crearla se calcula su costo con el precio vigente de cada material." />
    <ProductionTabs />
    <RecipeEditor :recipe="null" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'
import type { RecipeSaveResult } from '#shared/schemas/recipes'

definePageMeta({
  layout: 'admin',
  title: 'Nueva receta',
  permissions: [PERMISSIONS.RECIPES_CREATE],
  breadcrumbs: [{ label: 'Producción', to: '/production' }, { label: 'Recetas', to: '/production/recipes' }, { label: 'Nueva' }],
})

function onSaved(result: RecipeSaveResult) {
  void navigateTo(`/production/recipes/${result.recipe.id}`)
}
</script>
