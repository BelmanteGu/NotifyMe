<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggle } = useTheme()
</script>

<template>
  <button
    @click="toggle"
    class="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-border/60 bg-card/50 hover:bg-card transition-all"
    :title="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
    :aria-label="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
  >
    <Sun v-if="isDark" class="w-4 h-4" />
    <Moon v-else class="w-4 h-4" />
  </button>
</template>
