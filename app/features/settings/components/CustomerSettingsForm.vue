<template>
  <div>
    <BaseSkeleton v-if="loading" class="h-96 w-full" />
    <ErrorState v-else-if="loadError && !form" :message="loadError.message" @retry="refresh" />
    <form v-else-if="form" novalidate @submit.prevent="save">
      <p class="mb-6 rounded-xl border border-status-info/20 bg-status-info-soft/50 px-4 py-3 text-[13px] text-status-info">
        Estos datos los publica el servidor en <code>/api/store/customer-settings</code>. La versión actual de la tienda (Lumia 2.0) todavía no los muestra.
      </p>

      <div class="grid gap-6 lg:grid-cols-2">
        <BaseCard title="Contacto">
          <div class="space-y-5">
            <FormField id="cs-whatsapp" label="WhatsApp de soporte" :error="errors.supportWhatsappPhone" hint="Solo dígitos con indicativo, sin + (ej. 573001234567).">
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.supportWhatsappPhone" inputmode="numeric" maxlength="15" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cs-email" label="Correo de contacto" :error="errors.contactEmail">
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.contactEmail" type="email" maxlength="254" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
          </div>
        </BaseCard>

        <BaseCard title="Catálogo">
          <div class="space-y-5">
            <FormField id="cs-promo-delay" label="Retardo del tooltip de promoción (ms)" :error="errors.promotionTooltipDelayMs" hint="Tiempo que muestra el spinner antes de revelar el nombre de la promoción. Por defecto 1000 ms (1 s); máximo 5000.">
              <template #default="{ id, invalid, describedBy }">
                <BaseInput
                  :id="id"
                  :model-value="String(form.promotionTooltipDelayMs)"
                  inputmode="numeric"
                  maxlength="4"
                  :invalid="invalid"
                  :described-by="describedBy"
                  :disabled="saving"
                  @update:model-value="setPromoDelay"
                />
              </template>
            </FormField>
          </div>
        </BaseCard>

        <BaseCard title="Políticas y términos">
          <div class="space-y-5">
            <FormField id="cs-policies-url" label="URL de políticas" :error="errors.policiesUrl" hint="Ruta de la tienda (/legal/privacy) o URL https://.">
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.policiesUrl" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
            <FormField id="cs-terms-url" label="URL de términos" :error="errors.termsUrl" hint="Ruta de la tienda o URL https://.">
              <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="form.termsUrl" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
            </FormField>
          </div>
        </BaseCard>

        <BaseCard title="Texto de políticas" class="lg:col-span-1">
          <FormField id="cs-policies" label="Contenido" :error="errors.policiesContent" hint="Texto plano. Máximo 20 000 caracteres.">
            <template #default="{ id, invalid, describedBy }"><BaseTextarea :id="id" v-model="form.policiesContent" :rows="8" maxlength="20000" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
          </FormField>
        </BaseCard>
        <BaseCard title="Texto de términos" class="lg:col-span-1">
          <FormField id="cs-terms" label="Contenido" :error="errors.termsContent" hint="Texto plano. Máximo 20 000 caracteres.">
            <template #default="{ id, invalid, describedBy }"><BaseTextarea :id="id" v-model="form.termsContent" :rows="8" maxlength="20000" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
          </FormField>
        </BaseCard>
      </div>

      <BaseCard class="mt-6" title="Preguntas frecuentes" :description="`${form.faqItems.length} de 30`">
        <template #actions>
          <BaseButton size="sm" variant="secondary" :disabled="saving || form.faqItems.length >= 30" @click="addFaq">
            <template #icon><IconPlus class="h-4 w-4" stroke-width="2" aria-hidden="true" /></template>
            Agregar
          </BaseButton>
        </template>
        <EmptyState v-if="!form.faqItems.length" title="Sin preguntas frecuentes" compact />
        <ol v-else class="space-y-4">
          <li v-for="(item, i) in form.faqItems" :key="item.id" class="rounded-xl border border-lumia-ink/[0.07] p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-[12px] font-semibold text-lumia-ink/45">#{{ i + 1 }}</span>
              <div class="flex gap-1">
                <BaseButton variant="ghost" size="sm" :disabled="saving || i === 0" @click="moveFaq(i, -1)"><IconArrowUp class="h-4 w-4" aria-hidden="true" /><span class="sr-only">Subir</span></BaseButton>
                <BaseButton variant="ghost" size="sm" :disabled="saving || i === form.faqItems.length - 1" @click="moveFaq(i, 1)"><IconArrowDown class="h-4 w-4" aria-hidden="true" /><span class="sr-only">Bajar</span></BaseButton>
                <BaseButton variant="ghost" size="sm" :disabled="saving" @click="form.faqItems.splice(i, 1)"><IconTrash class="h-4 w-4 text-status-danger" aria-hidden="true" /><span class="sr-only">Quitar pregunta {{ i + 1 }}</span></BaseButton>
              </div>
            </div>
            <div class="space-y-3">
              <FormField :id="`faq-q-${item.id}`" label="Pregunta" :error="errors[`faqItems.${i}.question`]" required>
                <template #default="{ id, invalid, describedBy }"><BaseInput :id="id" v-model="item.question" maxlength="300" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
              </FormField>
              <FormField :id="`faq-a-${item.id}`" label="Respuesta" :error="errors[`faqItems.${i}.answer`]" required>
                <template #default="{ id, invalid, describedBy }"><BaseTextarea :id="id" v-model="item.answer" :rows="3" maxlength="2000" :invalid="invalid" :described-by="describedBy" :disabled="saving" /></template>
              </FormField>
            </div>
          </li>
        </ol>
      </BaseCard>

      <SettingsFormFooter :dirty="dirty" :saving="saving" :form-error="formError" @discard="discard" />
    </form>
  </div>
</template>

<script setup lang="ts">
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-vue'
import { customerSettingsSchema, type CustomerSettings } from '#shared/schemas/settings'

const { loading, loadError, refresh, form, errors, formError, saving, dirty, save, discard } = useSettingsForm<CustomerSettings, CustomerSettings>({
  key: 'admin-settings-customer',
  url: '/api/admin/settings/customer',
  method: 'PATCH',
  successMessage: 'Atención al cliente guardada',
  toForm: (v) => ({ ...v, faqItems: v.faqItems.map((f) => ({ ...f })) }),
  build: (f) => customerSettingsSchema.safeParse(f),
})

function setPromoDelay(raw: string) {
  if (!form.value) return
  form.value.promotionTooltipDelayMs = Number(raw.replace(/\D/g, '')) || 0
}

function addFaq() {
  if (!form.value || form.value.faqItems.length >= 30) return
  const id = `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  form.value.faqItems.push({ id, question: '', answer: '' })
}

function moveFaq(index: number, delta: number) {
  const items = form.value?.faqItems
  if (!items) return
  const target = index + delta
  if (target < 0 || target >= items.length) return
  const [item] = items.splice(index, 1)
  if (item) items.splice(target, 0, item)
}
</script>
