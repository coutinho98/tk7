import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pencil, Plus, Play, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { Page, Chip, SectionLabel } from '../components/ui';
import Cassette, { TAPE_COLORS } from '../components/Cassette';
import { useNow } from '../lib/hooks';
import { clock, plural, relativeDay, workoutFocus, workoutLetter, doneSets, totalSets } from '../lib/format';
import { confirmDialog } from '../lib/confirm';
import { nextWorkout } from '../lib/records';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Boa madrugada,' : h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : 'Boa noite,';
}

export default function Workouts() {
  const workouts = useStore((s) => s.workouts);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const startWorkout = useStore((s) => s.startWorkout);
  const loadSample = useStore((s) => s.loadSample);
  const showToast = useStore((s) => s.showToast);
  const navigate = useNavigate();

  const start = async (id) => {
    if (active && !(await confirmDialog({
      title: 'Já tem um treino rolando',
      body: `“${active.name}” ainda está em andamento. Descartar e começar este?`,
      confirmLabel: 'Descartar e começar',
      danger: true,
    }))) return;
    if (startWorkout(id)) navigate('/sessao');
    else showToast('Adicione exercícios a este treino primeiro');
  };

  const week = sessions.filter((s) => s.start >= Date.now() - 7 * 864e5).length;
  const last = sessions[0];
  const next = nextWorkout(workouts, sessions);
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });

  return (
    <Page>
      <div className="brand" aria-label="TK7">
        <svg viewBox="0 0 24 16" width="22" height="15" aria-hidden="true">
          <rect x="0.5" y="0.5" width="23" height="15" rx="2.5" fill="currentColor" />
          <rect x="3" y="2.5" width="18" height="8" rx="1.2" fill="var(--bg)" />
          <circle cx="8" cy="6.5" r="1.8" fill="currentColor" />
          <circle cx="16" cy="6.5" r="1.8" fill="currentColor" />
          <path d="M6 15.5 L7.5 12 H16.5 L18 15.5" fill="var(--bg)" opacity=".35" />
        </svg>
        <span>TK7</span>
      </div>
      <section className="prose intro">
        <p>{greeting()}</p>
        {workouts.length === 0 ? (
          <p>
            Esse é o <b>TK7</b>, seus treinos em fita. Monte seus treinos, marque cada série e deixe o cronômetro cuidar
            do descanso.
          </p>
        ) : (
          <>
            <p>
              Hoje é {today}. {week ? <>Você treinou <Chip>{plural(week, 'vez', 'vezes')}</Chip> nos últimos 7 dias</> : <>Você ainda <b>não treinou</b> nos últimos 7 dias</>}
              {last && (
                <>
                  {' '}— o último foi <b>{workoutFocus(last.name)}</b>, {relativeDay(last.start)}
                </>
              )}
              .
            </p>
            {next && !active && (
              <p>
                Que tal o{' '}
                <motion.button whileTap={{ scale: 0.95 }} className="chip chip-action" onClick={() => start(next.id)}>
                  {next.name.split('—')[0].trim()} <ArrowRight size={13} />
                </motion.button>{' '}
                hoje?
              </p>
            )}
          </>
        )}
      </section>

      {active && <ActiveBanner active={active} />}

      {workouts.length === 0 ? (
        <div className="empty-tile">
          <div className="tile tile-hero">
            <Cassette letter="+" title="sua primeira fita" tracks={0} footnote="grave seu primeiro treino" color="#9a9a9f" playing width={250} />
          </div>
          <div className="row-actions">
            <Link to="/editar/novo" className="btn btn-primary"><Plus size={16} /> Criar treino</Link>
            <button className="btn" onClick={loadSample}>Usar modelo A/B/C</button>
          </div>
        </div>
      ) : (
        <>
          <SectionLabel action={<Link to="/editar/novo" className="chip chip-action"><Plus size={13} /> novo</Link>}>
            Seus treinos · {workouts.length}
          </SectionLabel>
          <div className="tiles">
            {workouts.map((w, i) => {
              const lastDone = sessions.find((s) => s.workoutId === w.id);
              const names = w.exercises.map((e) => e.name).filter(Boolean);
              return (
                <motion.article
                  key={w.id}
                  className="tile-card"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.button className="tile tile-workout" onClick={() => start(w.id)} whileTap={{ scale: 0.98 }} aria-label={`Iniciar ${w.name}`}>
                    <motion.div whileHover={{ y: -4, rotate: -1.5 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
                      <Cassette
                        letter={workoutLetter(w.name)}
                        title={workoutFocus(w.name)}
                        tracks={names.length}
                        footnote={lastDone ? `última vez ${relativeDay(lastDone.start)}` : 'nunca tocada'}
                        color={TAPE_COLORS[i % TAPE_COLORS.length]}
                        playing={active?.workoutId === w.id}
                      />
                    </motion.div>
                    <span className="tile-play"><Play size={14} fill="currentColor" /></span>
                  </motion.button>
                  <div className="tile-caption">
                    <div className="grow">
                      <h3>
                        {w.name}
                        {active?.workoutId === w.id && <span className="now-playing">tocando</span>}
                      </h3>
                      <p className="muted small tile-tracks">{names.join(' · ')}</p>
                    </div>
                    <Link to={`/editar/${w.id}`} className="icon-btn" aria-label={`Editar ${w.name}`}>
                      <Pencil size={15} />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </>
      )}
    </Page>
  );
}

function ActiveBanner({ active }) {
  const now = useNow(1000);
  const done = doneSets(active), total = totalSets(active);
  return (
    <Link to="/sessao" className="active-banner">
      <span className="pulse" aria-hidden="true" />
      <div className="grow">
        <span className="small muted">em andamento</span>
        <b>{active.name}</b>
      </div>
      <div className="active-meta mono">
        <span>{clock((now - active.start) / 1000, { pad: true })}</span>
        <span className="muted">{done}/{total} séries</span>
      </div>
      <ArrowRight size={16} />
    </Link>
  );
}
