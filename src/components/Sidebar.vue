<script setup lang="ts">
import { Bell, Timer, Clock4, StickyNote, Settings as SettingsIcon, Info } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'

export type View = 'reminders' | 'timer' | 'stopwatch' | 'notes' | 'settings'

defineProps<{
  current: View
}>()

const emit = defineEmits<{
  'update:current': [value: View]
  'open-about': []
}>()

const items = [
  { id: 'reminders' as const, label: 'Lembretes', icon: Bell },
  { id: 'timer' as const, label: 'Timer', icon: Timer },
  { id: 'stopwatch' as const, label: 'Cronômetro', icon: Clock4 },
  { id: 'notes' as const, label: 'Notas', icon: StickyNote },
  { id: 'settings' as const, label: 'Configurações', icon: SettingsIcon },
]
</script>

<template>
  <aside
    class="w-52 flex-shrink-0 border-r border-border/60 bg-card/60 dark:bg-card/30 backdrop-blur-sm flex flex-col py-4 px-2"
  >
    <nav class="flex flex-col gap-1 flex-1">
      <button
        v-for="item in items"
        :key="item.id"
        @click="emit('update:current', item.id)"
        class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all"
        :class="
          current === item.id
            ? 'bg-card text-foreground shadow-soft'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
        "
      >
        <component :is="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="flex items-center gap-1 px-1">
      <button
        @click="emit('open-about')"
        class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
      >
        <Info class="w-3.5 h-3.5" />
        Sobre
      </button>
      <ThemeToggle />
    </div>
  </aside>
</template>
