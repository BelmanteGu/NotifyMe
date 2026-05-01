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
    : 'Tudo limpo por aqui'
)
const description = computed(() =>
  props.variant === 'completed'
    ? 'Quando você marcar um lembrete como concluído, ele aparece aqui pra consulta — e você pode apagar a qualquer momento.'
    : 'Crie seu primeiro lembrete e ele vai te avisar na hora certa — e não vai sumir até você confirmar.'
)
const showCreateButton = computed(() => props.variant === 'pending')
</script>

<template>
  <div class="glass rounded-xl p-16 text-center">
    <div class="relative inline-flex mb-6">
      <!-- Glow atrás do ícone -->
      <div class="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl"></div>

      <div
        class="relative w-20 h-20 rounded-2xl icon-badge text-primary-foreground flex items-center justify-center"
      >
        <component :is="Icon" class="w-10 h-10" />
      </div>
    </div>

    <h2 class="text-2xl font-bold mb-2 tracking-tight">{{ title }}</h2>
    <p class="text-muted-foreground max-w-md mx-auto mb-7 leading-relaxed">
      {{ description }}
    </p>

    <button
      v-if="showCreateButton"
      @click="$emit('create')"
      class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-primary-foreground font-semibold text-sm"
    >
      Criar primeiro lembrete
    </button>
  </div>
</template>
