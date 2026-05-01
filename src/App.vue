<script setup lang="ts">
import { ref } from 'vue'
import TitleBar from '@/components/TitleBar.vue'
import Sidebar, { type View } from '@/components/Sidebar.vue'
import RemindersView from '@/views/RemindersView.vue'
import TimerView from '@/views/TimerView.vue'
import StopwatchView from '@/views/StopwatchView.vue'
import NotesView from '@/views/NotesView.vue'
import SettingsView from '@/views/SettingsView.vue'
import AboutModal from '@/components/AboutModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const currentView = ref<View>('reminders')
const aboutOpen = ref(false)
</script>

<template>
  <div class="h-screen flex flex-col bg-app overflow-hidden">
    <TitleBar />

    <div class="flex-1 flex overflow-hidden">
      <Sidebar
        v-model:current="currentView"
        @open-about="aboutOpen = true"
      />

      <main class="flex-1 overflow-hidden">
        <RemindersView v-if="currentView === 'reminders'" class="h-full overflow-y-auto scroll-overlay" />
        <TimerView v-else-if="currentView === 'timer'" class="h-full overflow-y-auto scroll-overlay" />
        <StopwatchView v-else-if="currentView === 'stopwatch'" class="h-full overflow-y-auto scroll-overlay" />
        <NotesView v-else-if="currentView === 'notes'" />
        <SettingsView v-else-if="currentView === 'settings'" class="h-full overflow-y-auto scroll-overlay" />
      </main>
    </div>

    <AboutModal v-model:open="aboutOpen" />
    <ConfirmDialog />
  </div>
</template>
