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
    if (active?.workoutId === id) return navigate('/sessao');
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
          {/* a fita sugerida fica em destaque; as outras vão para a estante, que rola para o lado */}
          <SectionLabel>{active?.workoutId === next.id ? 'Tocando agora' : 'Próxima fita'}</SectionLabel>
          <WorkoutTape w={next} index={workouts.indexOf(next)} sessions={sessions} active={active} onStart={start} hero />

          {workouts.length > 1 && (
            <>
              <SectionLabel action={<Link to="/editar/novo" className="chip chip-action"><Plus size={13} /> novo</Link>}>
                Sua estante · {plural(workouts.length, 'fita')}
              </SectionLabel>
              <div className="shelf">
                {workouts.map((w, i) => w !== next && (
                  <WorkoutTape key={w.id} w={w} index={i} sessions={sessions} active={active} onStart={start} delay={0.05 * i} />
                ))}
              </div>
            </>
          )}
          {workouts.length === 1 && (
            <div className="row-actions">
              <Link to="/editar/novo" className="btn"><Plus size={16} /> Gravar outra fita</Link>
            </div>
          )}
        </>
      )}
    </Page>
  );
}

/** Uma fita da lista: grande (destaque) ou pequena (estante). */
function WorkoutTape({ w, index, sessions, active, onStart, hero = false, delay = 0 }) {
  const lastDone = sessions.find((s) => s.workoutId === w.id);
  const names = w.exercises.map((e) => e.name).filter(Boolean);
  const playing = active?.workoutId === w.id;
  return (
    <motion.article
      className={hero ? 'tile-card' : 'tile-card shelf-item'}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button className={`tile tile-workout ${hero ? '' : 'tile-sm'}`} onClick={() => onStart(w.id)} whileTap={{ scale: 0.98 }} aria-label={`${playing ? 'Continuar' : 'Iniciar'} ${w.name}`}>
        <motion.div whileHover={{ y: -4, rotate: -1.5 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
          <Cassette
            letter={workoutLetter(w.name)}
            title={workoutFocus(w.name)}
            tracks={names.length}
            footnote={lastDone ? `última vez ${relativeDay(lastDone.start)}` : 'nunca tocada'}
            color={TAPE_COLORS[index % TAPE_COLORS.length]}
            playing={playing}
            width={hero ? 260 : 150}
          />
        </motion.div>
        <span className="tile-play"><Play size={hero ? 14 : 12} fill="currentColor" /></span>
      </motion.button>
      <div className="tile-caption">
        <div className="grow">
          <h3>
            {hero ? w.name : workoutFocus(w.name)}
            {playing && <span className="now-playing">tocando</span>}
          </h3>
          <p className="muted small tile-tracks">{hero ? names.join(' · ') : `${workoutLetter(w.name)} · ${plural(names.length, 'exercício')}`}</p>
        </div>
        <Link to={`/editar/${w.id}`} className="icon-btn" aria-label={`Editar ${w.name}`}>
          <Pencil size={15} />
        </Link>
      </div>
    </motion.article>
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
