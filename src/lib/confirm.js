import { create } from 'zustand';

/** Substitui o confirm() e o prompt() do navegador por folhas no estilo do app. */
export const useConfirm = create(() => ({ request: null }));

const ask = (request) =>
  new Promise((resolve) => {
    useConfirm.setState({
      request: { ...request, resolve: (value) => { useConfirm.setState({ request: null }); resolve(value); } },
    });
  });

/** Resolve true/false. */
export const confirmDialog = ({ title, body = '', confirmLabel = 'Confirmar', danger = false }) =>
  ask({ kind: 'confirm', title, body, confirmLabel, danger });

/** Resolve o texto digitado, ou null se cancelar. */
export const promptDialog = ({ title, body = '', initial = '', placeholder = '', confirmLabel = 'Salvar', multiline = false, suggestions = null }) =>
  ask({ kind: 'prompt', title, body, initial, placeholder, confirmLabel, multiline, suggestions });
