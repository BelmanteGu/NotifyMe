import { reactive } from 'vue'

/**
 * Composable global de confirmação — substitui `window.confirm()` nativo
 * (visual feio de browser) e `dialog.showMessageBox` do Electron (visual
 * datado do Win32) por um modal próprio estilo Windows 11 Fluent.
 *
 * Estado singleton: só um dialog visível por vez. Se um novo `confirm()`
 * for chamado enquanto outro tá aberto, o anterior é resolvido como
 * `false` (cancela) e o novo abre.
 */

export interface ConfirmOptions {
  message: string
  detail?: string
  confirmText?: string
  cancelText?: string
  /** Botão de confirmação fica vermelho (destrutivo) e ícone vira warning. */
  destructive?: boolean
}

interface DialogState {
  open: boolean
  options: ConfirmOptions | null
}

let resolver: ((value: boolean) => void) | null = null

const state = reactive<DialogState>({
  open: false,
  options: null,
})

function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Se tem um dialog aberto, resolve o anterior como false antes de abrir o novo
    if (state.open && resolver) {
      resolver(false)
    }
    resolver = resolve
    state.options = options
    state.open = true
  })
}

function close(result: boolean) {
  resolver?.(result)
  resolver = null
  state.open = false
  // Mantém options durante a animação de saída — limpa só quando reabrir
}

function handleConfirm() {
  close(true)
}

function handleCancel() {
  close(false)
}

export function useConfirm() {
  return {
    state,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
