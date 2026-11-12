<template>
  <BaseCard title="Referencias del pedido">
    <dl class="grid gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-[12px] text-lumia-ink/50">Referencia del cliente</dt>
        <dd class="mt-1 flex flex-wrap items-center gap-2">
          <span class="font-display text-xl tracking-wide text-lumia-ink select-all">{{ customerReference }}</span>
          <BaseButton variant="secondary" size="sm" @click="copy(customerReference)">Copiar</BaseButton>
        </dd>
      </div>
      <div>
        <dt class="text-[12px] text-lumia-ink/50">Identificador interno</dt>
        <dd class="mt-1 flex flex-wrap items-center gap-2">
          <span class="font-mono text-[13px] text-lumia-ink/80 select-all break-all">{{ internalId }}</span>
          <BaseButton variant="secondary" size="sm" @click="copy(internalId)">Copiar</BaseButton>
        </dd>
      </div>
    </dl>
  </BaseCard>
</template>

<script setup lang="ts">
const props = defineProps<{ customerReference: string; internalId: string }>()

const toast = useToast()

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success('Copiado al portapapeles', value)
  } catch {
    toast.error('No se pudo copiar', 'Selecciona el texto y cópialo manualmente.')
  }
}
</script>
