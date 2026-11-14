<template>
  <div>
    <LumiLauncher />
    <LumiPanel />
  </div>
</template>

<script setup lang="ts">
/**
 * Raíz de Lumi. Montado en el layout admin solo para quien tiene `lumi.use`.
 * Al desmontarse (cierre de sesión, cambio de usuario) se borra todo el estado de la conversación.
 */
const lumi = useLumi()
const position = useLumiPosition()
const reviews = useLumiReviews()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && lumi.open.value) lumi.close()
}

onMounted(() => {
  position.restore()
  reviews.init()
  window.addEventListener('resize', position.refit)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', position.refit)
  window.removeEventListener('keydown', onKeydown)
  reviews.dispose()
  lumi.reset()
})
</script>
