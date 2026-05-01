<script setup lang="ts">
import { BellOff } from 'lucide-vue-next'

defineEmits<{
  create: []
}>()
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-12 text-center">
    <div
      class="w-16 h-16 rounded-lg bg-accent text-accent-foreground mx-auto mb-6 flex items-center justify-center"
    >
      <BellOff class="w-8 h-8" />
    </div>

    <h2 class="text-2xl font-bold mb-2">Nenhum lembrete ainda</h2>
    <p class="text-muted-foreground max-w-md mx-auto mb-6">
      Crie seu primeiro lembrete e ele vai te avisar na hora certa —
      e não vai sumir até você confirmar.
    </p>

    <button
      @click="$emit('create')"
      class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
    >
      Criar primeiro lembrete
    </button>
  </div>
</template>
