import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Flame, Trophy } from 'lucide-react';
import { useStore } from '../store';
import { Page, Chip } from '../components/ui';
import Heatmap from '../components/Heatmap';
import EmptyState from '../components/EmptyState';
import { clock, doneSets, durationWords, kg, plural, shortDate, volumeOf } from '../lib/format';
import { recordsIn, weekStreak } from '../lib/records';

export default function History() {
  const sessions = useStore((s) => s.sessions);

  if (!sessions.length) {
    return (
      <Page>
        <section className="prose intro">
          <p>Histórico,</p>
          <p>Ainda não tem nada aqui. Quando você <b>finalizar um treino</b>, ele aparece nesta lista com duração, séries e volume.</p>
        </section>
        <EmptyState label="nada gravado ainda" />
      </Page>
    );
  }

  const totalVol = sessions.reduce((v, s) => v + volumeOf(s), 0);
  const totalTime = sessions.reduce((t, s) => t + (s.end - s.start), 0);
  const streak = weekStreak(sessions);

  // agrupa por mês
  const groups = [];
  for (const s of sessions) {
    const label = new Date(s.start).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(s);
  }

  return (
    <Page>
      <section className="prose intro">
        <p>Histórico,</p>
        <p>
          Você já fez <Chip>{plural(sessions.length, 'treino')}</Chip>, somando{' '}
          <b>{totalVol >= 1000 ? `${kg(totalVol / 1000)} toneladas` : `${kg(totalVol)} kg`}</b> levantados em <b>{durationWords(totalTime)}</b> de academia.
          {streak > 1 && <> Está há <Chip><Flame size={13} /> {streak} semanas</Chip> sem falhar.</>}
        </p>
      </section>

      <div className="tile heat-tile">
        <Heatmap sessions={sessions} />
        <div className="heat-foot">
          <span className="streak mono"><Flame size={14} /> {plural(streak, 'semana')} seguida{streak === 1 ? '' : 's'}</span>
          <span className="heat-legend small">menos <i /><i className="l1" /><i className="l2" /> mais</span>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.label} className="list-group">
          <h4 className="list-title">{g.label}</h4>
          <ul className="list">
            {g.items.map((s, i) => {
              const prs = recordsIn(s, sessions).length;
              return (
                <motion.li key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                  <Link to={`/historico/${s.id}`} className="list-row">
                    <span className="list-main">
                      <b>{s.name}</b>
                      <span className="muted small">
                        {plural(doneSets(s), 'série')} · {kg(volumeOf(s))} kg · {clock((s.end - s.start) / 1000)}
                        {prs > 0 && <span className="pr-inline"> · <Trophy size={11} /> {prs}</span>}
                      </span>
                    </span>
                    <span className="mono muted small">{shortDate(s.start)}</span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </section>
      ))}
    </Page>
  );
}
