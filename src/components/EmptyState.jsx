import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play, Plus } from 'lucide-react';
import { useStore } from '../store';

/** Tela vazia: um estojo de fita sem fita dentro, e o botão para começar. */
export default function EmptyState({ label }) {
  const hasWorkouts = useStore((s) => s.workouts.length > 0);
  return (
    <div className="empty-tile">
      <motion.div
        className="tile tile-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <EmptyCase label={label} />
      </motion.div>
      <div className="row-actions">
        {hasWorkouts ? (
          <Link to="/iniciar" className="btn btn-primary"><Play size={15} fill="currentColor" /> Começar treino</Link>
        ) : (
          <Link to="/editar/novo" className="btn btn-primary"><Plus size={16} /> Criar treino</Link>
        )}
      </div>
    </div>
  );
}

function EmptyCase({ label }) {
  return (
    <svg className="empty-case" viewBox="0 0 300 196" width="250" style={{ maxWidth: '100%', height: 'auto' }} aria-hidden="true">
      {/* estojo de acrílico */}
      <rect x="6" y="8" width="288" height="182" rx="10" className="case-body" />
      <rect x="6" y="8" width="288" height="22" rx="10" className="case-hinge" />
      <line x1="6" y1="30" x2="294" y2="30" className="case-line" />
      {/* lombada de papel */}
      <rect x="16" y="40" width="14" height="140" rx="2" className="case-spine" />
      {/* lugar vazio da fita */}
      <rect x="46" y="44" width="234" height="132" rx="10" className="case-slot" />
      <circle cx="116" cy="104" r="13" className="case-spindle" />
      <circle cx="210" cy="104" r="13" className="case-spindle" />
      <circle cx="116" cy="104" r="4" className="case-dot" />
      <circle cx="210" cy="104" r="4" className="case-dot" />
      <text x="163" y="156" textAnchor="middle" className="case-label">{label}</text>
      {/* reflexo */}
      <path d="M40 186 L110 12 H140 L70 186 Z" className="case-shine" />
    </svg>
  );
}
