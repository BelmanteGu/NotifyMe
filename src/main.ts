import { createApp } from 'vue'
import App from './App.vue'
import AlertView from './views/AlertView.vue'
import './style.css'

/**
 * Entry point do Renderer.
 *
 * O Electron carrega o mesmo index.html em duas situações:
 *   - Janela principal: sem query string → renderiza App.vue
 *   - Janela de alerta: ?view=alert&id=xxx → renderiza AlertView.vue
 *
 * A escolha aqui evita ter que configurar 2 entry HTML separados no
 * Vite (mais simples) e reaproveita o mesmo bundle CSS/Tailwind.
 */
const params = new URLSearchParams(window.location.search)

if (params.get('view') === 'alert') {
  const reminderId = params.get('id') ?? ''
  createApp(AlertView, { reminderId }).mount('#app')
} else {
  createApp(App).mount('#app')
}
