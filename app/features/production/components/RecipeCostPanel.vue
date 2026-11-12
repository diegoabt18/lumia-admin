<template>
  <BaseCard title="Costo">
    <template v-if="canCalculate" #actions>
      <BaseButton size="sm" variant="secondary" :loading="calculating" @click="emit('calculate')">
        <template #icon>
          <IconCalculator class="h-4 w-4" stroke-width="1.75" aria-hidden="true" />
        </template>
        Calcular
      </BaseButton>
    </template>

    <p v-if="calculationError" role="alert" class="mb-4 rounded-xl border border-status-danger/20 bg-status-danger-soft/50 px-3 py-2.5 text-[13px] text-status-danger">
      No se pudo calcular: {{ calculationError }}
    </p>
    <p v-else-if="recipe.costsOutdated" class="mb-4 rounded-xl border border-status-warning/20 bg-status-warning-soft/50 px-3 py-2.5 text-[13px] text-status-warning">
      Desactualizado: cambió la receta o el precio de un material. Calcula de nuevo.
    </p>

    <dl class="space-y-2.5 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-lumia-ink/60">Materiales</dt>
        <dd class="tabular-nums">{{ formatUnitCost(breakdown?.materialsCost ?? materialsFallback) }}</dd>
      </div>
      <template v-if="breakdown">
        <div v-for="cost in breakdown.indirectCosts" :key="cost.name" class="flex justify-between gap-3 pl-3 text-[13px]">
          <dt class="text-lumia-ink/55">{{ cost.name }}<template v-if="cost.type === 'percentage'"> ({{ cost.value }} %)</template></dt>
          <dd class="tabular-nums text-lumia-ink/70">{{ formatUnitCost(cost.calculatedAmount) }}</dd>
        </div>
      </template>
      <div class="flex justify-between gap-3">
        <dt class="text-lumia-ink/60">Indirectos</dt>
        <dd class="tabular-nums">{{ formatUnitCost(breakdown?.indirectCostTotal ?? indirectFallback) }}</dd>
      </div>
      <div class="flex justify-between gap-3 border-t border-lumia-ink/[0.08] pt-2.5">
        <dt class="font-medium text-lumia-ink">Costo total</dt>
        <dd class="font-display text-[1.5rem] leading-none tabular-nums text-lumia-ink">{{ formatUnitCost(breakdown?.totalCost ?? recipe.totalCost) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-lumia-ink/60">Precio sugerido<template v-if="margin !== null"> ({{ margin }} %)</template></dt>
        <dd class="tabular-nums font-medium text-lumia-ink">{{ suggested !== null ? formatCurrency(suggested) : '—' }}</dd>
      </div>
    </dl>
    <p class="mt-4 text-[12px] text-lumia-ink/50">
      {{ recipe.costsLastCalculatedAt ? `Calculado ${formatDateTime(recipe.costsLastCalculatedAt)}.` : 'Aún sin calcular.' }}
      Solo materiales e indirectos: el servidor no incluye mano de obra ni empaque en este cálculo.
    </p>
  </BaseCard>
</template>

<script setup lang="ts">
import { IconCalculator } from '@tabler/icons-vue'
import type { CostBreakdown, RecipeDetail } from '#shared/schemas/recipes'

const props = defineProps<{
  recipe: RecipeDetail
  breakdown: CostBreakdown | null
  calculationError: string | null
  canCalculate: boolean
  calculating: boolean
}>()
const emit = defineEmits<{ calculate: [] }>()

// Sin desglose reciente se muestran los totales guardados en la receta.
const materialsFallback = computed(() => props.recipe.materialsCost)
const indirectFallback = computed(() => props.recipe.indirectCost)
const margin = computed(() => props.breakdown?.marginPercentage ?? props.recipe.marginPercentage)
const suggested = computed(() => props.breakdown?.suggestedPrice ?? props.recipe.suggestedPrice)
</script>
