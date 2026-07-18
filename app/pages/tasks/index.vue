<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import type { Task, TaskStatus } from '~/types/garden'

const store = useGardenStore()
const { tasks, plotById, pendingTasks } = store
const { relTime } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('tasks.title')} · GardenOS` })

const columns = computed(() => [
  { key: 'todo', label: t('tasks.todo'), status: 'todo' as TaskStatus },
  { key: 'in_progress', label: t('tasks.inProgress'), status: 'in_progress' as TaskStatus },
  { key: 'done', label: t('tasks.done'), status: 'done' as TaskStatus }
])
function tasksFor(status: TaskStatus) { return tasks.value.filter((tk) => tk.status === status) }
const priorityColor: Record<string, string> = { high: 'negative', medium: 'warning', low: 'neutral' }
const catIcon: Record<string, string> = { planting: 'i-lucide-sprout', irrigation: 'i-lucide-droplets', harvest: 'i-lucide-shopping-basket', pest: 'i-lucide-bug', maintenance: 'i-lucide-wrench', other: 'i-lucide-circle-dot' }
const nextStatus: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
const nextLabel = (s: TaskStatus) => s === 'todo' ? t('tasks.start') : s === 'in_progress' ? t('tasks.complete') : t('tasks.reopen')

const open = ref(false); const editingId = ref<string | null>(null)
const emptyForm = () => ({ title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high', assignee: '', category: 'maintenance' as string, dueAt: '' })
const form = reactive(emptyForm())
const prioItems = computed(() => [{ label: t('enums.priority.low'), value: 'low' }, { label: t('enums.priority.medium'), value: 'medium' }, { label: t('enums.priority.high'), value: 'high' }])
const catItems = computed(() => ['planting', 'irrigation', 'harvest', 'pest', 'maintenance', 'other'].map((c) => ({ label: t('enums.taskCat.' + c), value: c })))
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(tk: Task) { editingId.value = tk.id; Object.assign(form, { title: tk.title, description: tk.description || '', priority: tk.priority, assignee: tk.assignee || '', category: tk.category, dueAt: tk.dueAt ? tk.dueAt.slice(0, 10) : '' }); open.value = true }
function save() {
  if (!form.title.trim()) return
  const payload = { ...form, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined }
  if (editingId.value) { store.updateTask(editingId.value, payload); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addTask({ ...payload, status: 'todo' }); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeTask(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }
function rowActions(tk: Task) {
  return [[
    { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(tk) },
    { label: nextLabel(tk.status) + ' →', icon: 'i-lucide-arrow-right', onSelect: () => store.updateTask(tk.id, { status: nextStatus[tk.status] }) },
    { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(tk.id) }
  ]]
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.operations')" :title="t('tasks.title')" :subtitle="t('tasks.subtitle', { n: pendingTasks.length })">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('tasks.add') }}</span></button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div v-for="col in columns" :key="col.key">
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="flex items-center gap-2"><span class="text-sm font-semibold">{{ col.label }}</span><span class="text-xs px-2 py-0.5 rounded-md bg-surface-2 text-muted">{{ tasksFor(col.status).length }}</span></div>
        </div>
        <div class="space-y-3">
          <GlassCard v-for="tk in tasksFor(col.status)" :key="tk.id" class="p-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0"><UIcon :name="catIcon[tk.category] ?? 'i-lucide-circle-dot'" class="text-accent text-sm" /></div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm leading-snug">{{ tk.title }}</div>
                <div class="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span v-if="tk.assignee"><UIcon name="i-lucide-user" class="inline text-[10px]" /> {{ tk.assignee }}</span>
                  <span v-if="tk.dueAt"><UIcon name="i-lucide-calendar" class="inline text-[10px]" /> {{ relTime(tk.dueAt) }}</span>
                  <span v-if="tk.plotId"><UIcon name="i-lucide-map-pin" class="inline text-[10px]" /> {{ plotById[tk.plotId]?.name }}</span>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <UBadge variant="subtle" :color="priorityColor[tk.priority]">{{ t('enums.priority.' + tk.priority) }}</UBadge>
                  <button class="text-[11px] text-accent font-semibold hover:underline" @click="store.updateTask(tk.id, { status: nextStatus[tk.status] })">{{ nextLabel(tk.status) }} →</button>
                </div>
              </div>
              <UDropdownMenu :items="rowActions(tk)" :content="{ align: 'end' }"><button class="w-7 h-7 rounded-md flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition shrink-0"><UIcon name="i-lucide-ellipsis-vertical" class="text-xs" /></button></UDropdownMenu>
            </div>
          </GlassCard>
          <div v-if="!tasksFor(col.status).length" class="text-center text-xs text-muted-2 py-8 border border-dashed border-app rounded-2xl">{{ t('tasks.nothing') }}</div>
        </div>
      </div>
    </div>

    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('tasks.addTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('tasks.titleLabel')"><UInput v-model="form.title" class="w-full" /></UFormField>
          <UFormField :label="t('tasks.descOpt')"><UTextarea v-model="form.description" :rows="2" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('tasks.priority')"><USelect v-model="form.priority" :items="prioItems" class="w-full" /></UFormField>
            <UFormField :label="t('tasks.category')"><USelect v-model="form.category" :items="catItems" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('tasks.assignee')"><UInput v-model="form.assignee" class="w-full" /></UFormField>
            <UFormField :label="t('tasks.dueDate')"><UInput v-model="form.dueAt" type="date" class="w-full" /></UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="open = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="save">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <ConfirmModal v-model:open="delOpen" @confirm="doDelete" />
  </div>
</template>
