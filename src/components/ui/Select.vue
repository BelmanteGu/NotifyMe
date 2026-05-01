<script setup lang="ts">
/**
 * Select customizado — substitui o `<select>` nativo do navegador
 * (que tem dropdown feio com cores do SO e não respeita o tema do app).
 *
 * Trigger: button estilo input, com chevron à direita.
 * Dropdown: glass-strong, lista de opções, item selecionado destacado.
 *
 * Suporta:
 *   - Click fora pra fechar
 *   - Keyboard: Enter/Space pra abrir, ArrowUp/ArrowDown pra navegar,
 *     Escape pra fechar, Enter no item pra selecionar
 *   - aria-expanded, aria-haspopup, role=listbox
 */

import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const highlightedIndex = ref(-1)
const root = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() =>
  props.options.find((o) => o.value === props.modelValue)
)
const selectedLabel = computed(
  () => selectedOption.value?.label ?? props.placeholder ?? 'Selecionar'
)

function toggle() {
  if (open.value) close()
  else openDropdown()
}

function openDropdown() {
  open.value = true
  // Destaca item atual
  highlightedIndex.value = props.options.findIndex(
    (o) => o.value === props.modelValue
  )
  if (highlightedIndex.value === -1) highlightedIndex.value = 0
  nextTick(() => scrollHighlightedIntoView())
}

function close() {
  open.value = false
  highlightedIndex.value = -1
}

function selectOption(option: Option) {
  emit('update:modelValue', option.value)
  close()
}

function scrollHighlightedIntoView() {
  if (!listRef.value || highlightedIndex.value < 0) return
  const items = listRef.value.querySelectorAll('[role="option"]')
  const target = items[highlightedIndex.value] as HTMLElement | undefined
  target?.scrollIntoView({ block: 'nearest' })
}

function handleClickOutside(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    close()
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!open.value) {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault()
      openDropdown()
    }
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedIndex.value = Math.min(
      props.options.length - 1,
      highlightedIndex.value + 1
    )
    scrollHighlightedIntoView()
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedIndex.value = Math.max(0, highlightedIndex.value - 1)
    scrollHighlightedIntoView()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const option = props.options[highlightedIndex.value]
    if (option) selectOption(option)
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="root" class="relative" @keydown="handleKeyDown">
    <button
      type="button"
      @click="toggle"
      class="flex h-10 w-full items-center justify-between rounded-sm border border-input bg-card px-3 py-2 text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary hover:bg-muted/40"
      :class="open && 'border-primary ring-2 ring-ring'"
      :aria-expanded="open"
      aria-haspopup="listbox"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <ChevronDown
        class="w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-2"
        :class="open && 'rotate-180'"
      />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        ref="listRef"
        class="absolute left-0 right-0 top-full mt-1.5 rounded-sm glass-strong shadow-soft z-30 py-1 max-h-60 overflow-y-auto scroll-overlay"
        role="listbox"
      >
        <button
          v-for="(option, idx) in options"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="option.value === modelValue"
          @click="selectOption(option)"
          @mouseenter="highlightedIndex = idx"
          class="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left"
          :class="[
            option.value === modelValue
              ? 'text-primary font-medium'
              : 'text-foreground',
            highlightedIndex === idx ? 'bg-muted' : 'hover:bg-muted/60',
          ]"
        >
          <span>{{ option.label }}</span>
          <Check
            v-if="option.value === modelValue"
            class="w-4 h-4 text-primary flex-shrink-0"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
