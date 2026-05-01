<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggle } = useTheme()
</script>

<template>
  <button
    @click="toggle"
    class="w-9 h-9 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition"
    :title="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
    :aria-label="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
  >
    <Sun v-if="isDark" class="w-4 h-4" />
    <Moon v-else class="w-4 h-4" />
  </button>
</template>
