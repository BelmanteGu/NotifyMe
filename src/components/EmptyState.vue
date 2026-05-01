<script setup lang="ts">
import { computed } from 'vue'
import { BellOff, CheckCheck } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'pending' | 'completed'
  }>(),
  { variant: 'pending' }
)

defineEmits<{
  create: []
}>()

const Icon = computed(() =>
  props.variant === 'completed' ? CheckCheck : BellOff
)
const title = computed(() =>
  props.variant === 'completed'
    ? 'Nenhum concluído ainda'
    : 'Nenhum lembrete ainda'
)
const description = computed(() =>
  props.variant === 'completed'
    ? 'Quando você marcar um lembrete como concluído, ele aparece aqui pra consulta — e você pode apagar a qualquer momento.'
    : 'Crie seu primeiro lembrete e ele vai te avisar na hora certa — e não vai sumir até você confirmar.'
)
const showCreateButton = computed(() => props.variant === 'pending')
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-12 text-center">
    <div
      class="w-16 h-16 rounded-lg bg-accent text-accent-foreground mx-auto mb-6 flex items-center justify-center"
    >
      <component :is="Icon" class="w-8 h-8" />
    </div>

    <h2 class="text-2xl font-bold mb-2">{{ title }}</h2>
    <p class="text-muted-foreground max-w-md mx-auto mb-6">
      {{ description }}
    </p>

    <button
      v-if="showCreateButton"
      @click="$emit('create')"
      class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
    >
      Criar primeiro lembrete
    </button>
  </div>
</template>
