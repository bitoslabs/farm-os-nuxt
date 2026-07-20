<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => `${t('knowledge.title')} · GardenOS` })

const articles = [
  { id: 'k1', titleKey: 'Growing Sticky Rice in the Wet Season', category: 'Field Crops', read: 6, icon: 'i-lucide-wheat', excerpt: 'Soak, nursery, and transplanting timelines tuned for Lao lowland paddies.' },
  { id: 'k2', titleKey: 'Identifying Common Tomato Pests', category: 'Pests', read: 4, icon: 'i-lucide-bug', excerpt: 'Aphids, fruit fly, and powdery mildew — early signs and organic controls.' },
  { id: 'k3', titleKey: 'Composting for Home Gardens', category: 'Soil', read: 5, icon: 'i-lucide-recycle', excerpt: 'Turn kitchen and crop waste into rich soil amendment in 6 weeks.' },
  { id: 'k4', titleKey: 'Drip Irrigation Basics', category: 'Water', read: 7, icon: 'i-lucide-droplets', excerpt: 'Setting up low-cost drip lines for raised beds and greenhouses.' },
  { id: 'k5', titleKey: 'Crop Rotation by Family', category: 'Planning', read: 8, icon: 'i-lucide-repeat', excerpt: 'Avoid depleting soil by rotating Solanaceae, Cucurbitaceae, and legumes.' },
  { id: 'k6', titleKey: 'Saving Your Own Seeds', category: 'Propagation', read: 5, icon: 'i-lucide-sprout', excerpt: 'Selecting, drying, and storing seed from your best plants.' }
]
const catColor: Record<string, string> = { 'Field Crops': 'info', Pests: 'negative', Soil: 'positive', Water: 'info', Planning: 'warning', Propagation: 'neutral' }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.community')" :title="t('knowledge.title')" :subtitle="t('knowledge.subtitle')" />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <GlassCard v-for="a in articles" :key="a.id" hover class="p-5 cursor-pointer">
        <div class="flex items-start justify-between mb-4">
          <div class="icon-box w-10 h-10 rounded-xl flex items-center justify-center"><UIcon :name="a.icon" class="text-accent" /></div>
          <UBadge variant="subtle" :color="catColor[a.category] ?? 'neutral'">{{ a.category }}</UBadge>
        </div>
        <h3 class="font-semibold mb-2 leading-snug">{{ a.titleKey }}</h3>
        <p class="text-sm text-muted leading-relaxed mb-4">{{ a.excerpt }}</p>
        <div class="flex items-center justify-between text-xs text-muted pt-3 border-t border-app">
          <span class="flex items-center gap-1"><UIcon name="i-lucide-clock" class="text-[10px]" /> {{ t('knowledge.readMin', { n: a.read }) }}</span>
          <span class="text-accent font-semibold flex items-center gap-1">{{ t('knowledge.read') }} <UIcon name="i-lucide-arrow-right" class="text-[10px]" /></span>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
