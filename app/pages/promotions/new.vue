<template>
  <div>
    <PageHeader eyebrow="Catálogo" title="Nueva promoción" description="Las fechas se interpretan en la hora de la tienda." />
    <PromotionEditor :promotion="null" @saved="(id) => navigateTo(`/promotions/${id}`)" />
  </div>
</template>

<script setup lang="ts">
import { PERMISSIONS } from '#shared/auth/permissions'

definePageMeta({
  layout: 'admin',
  title: 'Nueva promoción',
  permissions: [PERMISSIONS.PRODUCTS_UPDATE],
  breadcrumbs: [{ label: 'Catálogo' }, { label: 'Promociones', to: '/promotions' }, { label: 'Nueva' }],
})
</script>
