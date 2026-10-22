import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../store';
import { useConfirm } from '../lib/confirm';

/** Aviso flutuante no topo. Quando a ação pode ser desfeita, mostra "Desfazer". */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const undo = useStore((s) => s.undo);
  const clear = () => useStore.setState({ toast: null });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, toast.snapshot ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="toast-host" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ y: -24, opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -16, opacity: 0, filter: 'blur(6px)' }}
            onClick={toast.snapshot ? undefined : clear}
          >
            <span>{toast.msg}</span>
            {toast.snapshot && <button className="toast-undo" onClick={undo}>Desfazer</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Folha que sobe de baixo, com fundo desfocado. */
export function Sheet({ open, onClose, title, children, label }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // portal: fica fora de elementos animados (com transform), senão o "position: fixed" quebra
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : label}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h3 id={titleId}>{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Atende confirmDialog() e promptDialog(). */
export function DialogHost() {
  const req = useConfirm((s) => s.request);
  return (
    <Sheet open={!!req} onClose={() => req?.resolve(req.kind === 'prompt' ? null : false)} title={req?.title}>
      {req?.body && <p className="muted">{req.body}</p>}
      {req?.kind === 'prompt' ? <PromptBody req={req} /> : req && (
        <div className="sheet-actions">
          <button className="btn" onClick={() => req.resolve(false)}>Cancelar</button>
          <button className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => req.resolve(true)} autoFocus>
            {req.confirmLabel}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function PromptBody({ req }) {
  const [value, setValue] = useState(req.initial);
  const listId = useId();
  const Field = req.multiline ? 'textarea' : 'input';
  const submit = (e) => { e.preventDefault(); req.resolve(value); };
  return (
    <form onSubmit={submit}>
      <Field
        className="sheet-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={req.placeholder}
        list={req.suggestions ? listId : undefined}
        rows={req.multiline ? 3 : undefined}
        autoFocus
        aria-label={req.title}
      />
      {req.suggestions && <datalist id={listId}>{req.suggestions.map((n) => <option key={n} value={n} />)}</datalist>}
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={() => req.resolve(null)}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{req.confirmLabel}</button>
      </div>
    </form>
  );
}
