<script setup lang="ts">
/**
 * LivestockTimeline — one chronological history for a single record.
 *
 * Merges movements, health logs, production logs, and linked finance into a
 * single newest-first feed. Drop into the detail page:
 *   <LivestockTimeline :animal-id="id" />
 */
import { useGardenStore } from '~/composables/useGardenStore'

const props = defineProps<{ animalId: string }>()

const store = useGardenStore()
const { currency, relTime } = useFormat()
const { t } = useI18n()

const movIcon: Record<string, string> = {
  purchase: 'i-lucide-shopping-cart', sale: 'i-lucide-hand-coins', birth: 'i-lucide-baby',
  death: 'i-lucide-skull', transfer_in: 'i-lucide-arrow-down-to-line', transfer_out: 'i-lucide-arrow-up-from-line',
  adjustment: 'i-lucide-scale'
}
const movColor: Record<string, string> = {
  purchase: 'text-info', sale: 'text-positive', birth: 'text-positive',
  death: 'text-negative', transfer_in: 'text-info', transfer_out: 'text-warning',
  adjustment: 'text-muted'
}
const healthIcon: Record<string, string> = { vaccination: 'i-lucide-syringe', treatment: 'i-lucide-pill', checkup: 'i-lucide-stethoscope', illness: 'i-lucide-thermometer' }
const prodIcon: Record<string, string> = { eggs: 'i-lucide-egg', milk: 'i-lucide-milk', wool: 'i-lucide-shirt', meat: 'i-lucide-beef', offspring: 'i-lucide-baby', other: 'i-lucide-package' }

interface Row { id: string; at: string; icon: string; tint: string; title: string; detail: string; amount?: number; positive?: boolean }

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const m of store.livestockMovements.value.filter((x) => x.animalId === props.animalId || x.parentAnimalId === props.animalId)) {
    out.push({
      id: `mv_${m.id}`, at: m.date,
      icon: movIcon[m.type] ?? 'i-lucide-arrow-left-right', tint: movColor[m.type] ?? 'text-muted',
      title: `${t('enums.movementType.' + m.type)} · ${m.count} ${t('livestock.head')}`,
      detail: [m.counterparty, m.reference, m.reason, m.notes].filter(Boolean).join(' · ') || t('enums.movementType.' + m.type),
      amount: m.totalAmount, positive: m.type === 'sale'
    })
  }
  for (const h of store.livestockHealth.value.filter((x) => x.animalId === props.animalId)) {
    out.push({
      id: `hl_${h.id}`, at: h.date,
      icon: healthIcon[h.type] ?? 'i-lucide-stethoscope', tint: h.severity === 'high' ? 'text-negative' : h.severity === 'medium' ? 'text-warning' : 'text-accent',
      title: `${t('enums.healthType.' + h.type)}`, detail: `${h.description}${h.vetName ? ' · ' + h.vetName : ''}`,
      amount: h.cost, positive: false
    })
  }
  for (const p of store.livestockProduction.value.filter((x) => x.animalId === props.animalId)) {
    out.push({
      id: `pl_${p.id}`, at: p.date,
      icon: prodIcon[p.product] ?? 'i-lucide-package', tint: 'text-positive',
      title: `${t('enums.product.' + p.product)}`, detail: `${p.quantity} ${t('enums.unit.' + p.unit)}${p.notes ? ' · ' + p.notes : ''}`,
      amount: undefined, positive: true
    })
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
})
</script>

<template>
  <div v-if="rows.length" class="space-y-2">
    <div v-for="r in rows" :key="r.id" class="flex items-start gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
      <div class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
        <UIcon :name="r.icon" class="text-sm" :class="r.tint" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{{ r.title }}</div>
        <div class="text-xs text-muted truncate">{{ r.detail }} · {{ relTime(r.at) }}</div>
      </div>
      <div v-if="r.amount !== undefined" class="text-sm font-semibold whitespace-nowrap" :class="r.positive ? 'text-positive' : 'text-negative'">
        {{ r.positive ? '+' : '−' }}{{ currency(r.amount) }}
      </div>
    </div>
  </div>
  <p v-else class="text-sm text-muted-2 text-center py-4">{{ t('livestock.noHistory') }}</p>
</template>
