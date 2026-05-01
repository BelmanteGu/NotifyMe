<script setup lang="ts">
import { computed } from 'vue'
import { Bell, Clock, Repeat, MoreVertical } from 'lucide-vue-next'
import type { Reminder } from '@/types/reminder'
import { RECURRENCE_LABELS } from '@/types/reminder'
import { formatRelative } from '@/utils/formatDate'

const props = defineProps<{
  reminder: Reminder
}>()

const recurrenceLabel = computed(() => RECURRENCE_LABELS[props.reminder.recurrence])
const triggerLabel = computed(() => formatRelative(props.reminder.triggerAt))
</script>

<template>
  <article
    class="rounded-lg border border-border bg-card p-5 flex items-start gap-4 hover:bg-muted/30 transition"
  >
    <div
      class="w-11 h-11 rounded-md bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0"
    >
      <Bell class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold text-foreground truncate">
            {{ reminder.title }}
          </h3>
          <p
            v-if="reminder.description"
            class="text-sm text-muted-foreground mt-0.5 truncate"
          >
            {{ reminder.description }}
          </p>
        </div>

        <button
          class="p-1 rounded hover:bg-muted text-muted-foreground transition flex-shrink-0"
          aria-label="Mais opções"
        >
          <MoreVertical class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1">
          <Clock class="w-3.5 h-3.5" />
          {{ triggerLabel }}
        </span>

        <span
          v-if="reminder.recurrence !== 'once'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent text-accent-foreground font-medium"
        >
          <Repeat class="w-3 h-3" />
          {{ recurrenceLabel }}
        </span>
      </div>
    </div>
  </article>
</template>
