<script setup lang="ts">
/**
 * Toggle switch estilo iOS/macOS — substitui `<input type="checkbox">`
 * nativo (visual feio do navegador).
 *
 * Trilho colorido com bola que desliza. Cor primary quando ativo.
 */

defineProps<{
  modelValue: boolean
  ariaLabel?: string
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    @click="$emit('update:modelValue', !modelValue)"
    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    :class="modelValue ? 'bg-primary' : 'bg-muted'"
  >
    <span
      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-soft ring-0 transition duration-200"
      :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>
