import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { Chip, SectionLabel, Sparkline } from '../components/ui';
import { Sheet } from '../components/Overlays';
import { kg, num, plural, relativeDay, shortDate, uid } from '../lib/format';

export const MEASURES = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'bodyFat', label: 'Gordura', unit: '%' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'hip', label: 'Quadril', unit: 'cm' },
  { key: 'chest', label: 'Peito', unit: 'cm' },
  { key: 'arm', label: 'Braço', unit: 'cm' },
  { key: 'thigh', label: 'Coxa', unit: 'cm' },
  { key: 'calf', label: 'Panturrilha', unit: 'cm' },
];

/** Peso corporal e medidas: registro, gráfico do peso e variação de cada medida. */
export default function Body() {
  const body = useStore((s) => s.body);
  const withUndo = useStore((s) => s.withUndo);
  const deleteBody = useStore((s) => s.deleteBody);
  const [editing, setEditing] = useState(null);

  const weights = body.filter((b) => b.weight != null).reverse(); // antigo → recente
  const latest = (key) => body.find((b) => b[key] != null);
  const first = (key) => [...body].reverse().find((b) => b[key] != null);
  const tracked = MEASURES.filter((m) => m.key !== 'weight' && latest(m.key));

  const lastW = weights.at(-1)?.weight, firstW = weights[0]?.weight;

  return (
    <>
      <section className="prose intro">
        <p>Corpo,</p>
        {body.length ? (
          <p>
            Seu último registro foi <b>{relativeDay(body[0].date)}</b>
            {lastW != null && <> com <Chip>{kg(lastW)} kg</Chip></>}
            {weights.length > 1 && lastW !== firstW && <>, {lastW > firstW ? 'mais' : 'menos'} <b>{kg(Math.abs(lastW - firstW))} kg</b> que no primeiro</>}.
          </p>
        ) : (
          <p>Registre seu <b>peso</b> e suas <b>medidas</b> de vez em quando — uma vez por semana já mostra a tendência.</p>
        )}
      </section>

      <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary wide" onClick={() => setEditing({ id: uid(), date: Date.now() })}>
        <Plus size={16} /> Registrar medidas
      </motion.button>

      {weights.length > 0 && (
        <div className="tile-card body-weight">
          <div className="tile tile-progress">
            <div className="progress-top">
              <span className="progress-value mono">{kg(lastW)}<small>kg</small></span>
              {weights.length > 1 && lastW !== firstW && (
                <span className="delta mono neutral">
                  {lastW > firstW ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {lastW > firstW ? '+' : ''}{kg(lastW - firstW)}
                </span>
              )}
            </div>
            <Sparkline values={weights.slice(-30).map((w) => w.weight)} empty="registre mais uma vez para ver a curva" />
            <div className="progress-axis mono">
              <span>{shortDate(weights.at(-Math.min(30, weights.length)).date)}</span>
              <span>{shortDate(weights.at(-1).date)}</span>
            </div>
          </div>
          <div className="tile-caption"><div><h3>Peso corporal</h3><p className="muted small">{plural(weights.length, 'registro')}</p></div></div>
        </div>
      )}

      {tracked.length > 0 && (
        <>
          <SectionLabel>Medidas</SectionLabel>
          <div className="measure-grid">
            {tracked.map((m) => {
              const cur = latest(m.key)[m.key], start = first(m.key)[m.key], d = cur - start;
              return (
                <div key={m.key} className="stat">
                  <span>{m.label}</span>
                  <b className="mono">{kg(cur)}<small> {m.unit}</small></b>
                  <span className="mono">{d ? `${d > 0 ? '+' : ''}${kg(d)} ${m.unit}` : '—'}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {body.length > 0 && (
        <>
          <SectionLabel>Registros</SectionLabel>
          <ul className="list">
            {body.map((b) => (
              <li key={b.id}>
                <button className="list-row" onClick={() => setEditing(b)}>
                  <span className="list-main">
                    <b>{b.weight != null ? `${kg(b.weight)} kg` : 'Medidas'}</b>
                    <span className="muted small">
                      {MEASURES.filter((m) => m.key !== 'weight' && b[m.key] != null).map((m) => `${m.label.toLowerCase()} ${kg(b[m.key])}`).join(' · ') || 'só peso'}
                    </span>
                  </span>
                  <span className="mono muted small">{shortDate(b.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Medidas">
        {editing && (
          <BodyForm
            entry={editing}
            onClose={() => setEditing(null)}
            onDelete={body.some((b) => b.id === editing.id) ? () => {
              withUndo('Registro excluído', () => deleteBody(editing.id));
              setEditing(null);
            } : null}
          />
        )}
      </Sheet>
    </>
  );
}

function BodyForm({ entry, onClose, onDelete }) {
  const saveBody = useStore((s) => s.saveBody);
  const showToast = useStore((s) => s.showToast);
  const [draft, setDraft] = useState(entry);
  const dateValue = new Date(draft.date - new Date(draft.date).getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  const save = (e) => {
    e.preventDefault();
    if (!MEASURES.some((m) => draft[m.key] != null)) return showToast('Preencha pelo menos um campo');
    saveBody(draft);
    showToast('Medidas salvas ✓');
    onClose();
  };

  return (
    <form onSubmit={save}>
      <label className="body-date">
        <span className="stepper-label">Data</span>
        <input
          type="date"
          className="date-input mono"
          value={dateValue}
          onChange={(e) => e.target.value && setDraft({ ...draft, date: new Date(`${e.target.value}T12:00`).getTime() })}
        />
      </label>
      <div className="body-fields">
        {MEASURES.map((m) => (
          <label key={m.key} className="stepper">
            <span className="stepper-label">{m.label} <em>· {m.unit}</em></span>
            <input
              className="mono body-input"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={draft[m.key] ?? ''}
              placeholder="—"
              onChange={(e) => setDraft({ ...draft, [m.key]: num(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className="sheet-actions">
        {onDelete ? <button type="button" className="btn btn-text danger" onClick={onDelete}>Excluir</button> : <button type="button" className="btn" onClick={onClose}>Cancelar</button>}
        <button type="submit" className="btn btn-primary">Salvar</button>
      </div>
    </form>
  );
}
