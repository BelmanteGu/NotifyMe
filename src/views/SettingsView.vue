<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'
import Switch from '@/components/ui/Switch.vue'

const { settings, set } = useSettings()
</script>

<template>
  <div class="max-w-2xl mx-auto px-8 py-10">
    <h2 class="text-3xl font-bold font-heading tracking-tight mb-2">
      Configurações
    </h2>
    <p class="text-muted-foreground text-sm mb-8">
      Customize como o NotifyMe funciona.
    </p>

    <!-- Widget flutuante -->
    <section class="glass rounded-lg p-6 mb-4">
      <h3 class="text-base font-bold mb-4 tracking-tight">Widget flutuante</h3>

      <div class="flex items-start gap-4">
        <div class="flex-1">
          <div class="font-medium text-foreground">
            Mostrar widget quando algo estiver rodando
          </div>
          <p class="text-sm text-muted-foreground mt-1 leading-relaxed">
            Janela pequena sempre por cima de tudo que mostra o tempo
            do timer ou cronômetro. Aparece automaticamente quando você
            inicia algum, some quando ambos param. Pode mover e
            redimensionar livremente.
          </p>
        </div>
        <Switch
          :model-value="settings.showWidget"
          @update:model-value="(v) => set('showWidget', v)"
          aria-label="Mostrar widget flutuante"
        />
      </div>
    </section>

    <!-- Sobre / informacao adicional -->
    <section class="glass rounded-lg p-6">
      <h3 class="text-base font-bold mb-2 tracking-tight">Sobre</h3>
      <p class="text-sm text-muted-foreground leading-relaxed">
        O NotifyMe é open source (licença MIT) e roda 100% offline.
        Todos os dados ficam no seu PC. Visite o repositório no GitHub
        pra contribuir ou reportar problemas.
      </p>
    </section>
  </div>
</template>
