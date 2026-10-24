import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Dumbbell, CalendarDays, TrendingUp, Settings2 } from 'lucide-react';
import { EASE } from './ui';

const ITEMS = [
  { to: '/', label: 'Treinos', icon: Dumbbell, match: (p) => p === '/' || p.startsWith('/editar') },
  { to: '/historico', label: 'Histórico', icon: CalendarDays, match: (p) => p.startsWith('/historico') },
  { to: '/progresso', label: 'Progresso', icon: TrendingUp, match: (p) => p.startsWith('/progresso') },
  { to: '/ajustes', label: 'Ajustes', icon: Settings2, match: (p) => p.startsWith('/ajustes') },
];

// Tudo no dock anda junto, com a mesma curva: a pílula, os ícones e a largura.
const MOVE = { duration: 0.34, ease: EASE };
const MotionLink = motion.create(NavLink);

/** Cápsula flutuante de navegação; o item ativo se expande e mostra o nome. */
export default function Dock() {
  const { pathname } = useLocation();
  // Durante o treino a navegação some e dá lugar à barra do treino (Session.jsx).
  if (pathname.startsWith('/sessao')) return null;
  return (
    <motion.nav layout transition={MOVE} className="dock" aria-label="Navegação" style={{ borderRadius: 999 }}>
      {ITEMS.map(({ to, label, icon: Icon, match }) => {
        const on = match(pathname);
        return (
          <MotionLink layout="position" transition={MOVE} key={to} to={to} className={`dock-item ${on ? 'on' : ''}`} aria-label={label}>
            {on && <motion.span layoutId="dock-pill" className="dock-pill" transition={MOVE} style={{ borderRadius: 999 }} />}
            <Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
            <AnimatePresence initial={false}>
              {on && (
                <motion.span
                  className="dock-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ ...MOVE, opacity: { duration: 0.2 } }}
                >
                  <span>{label}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </MotionLink>
        );
      })}
    </motion.nav>
  );
}
