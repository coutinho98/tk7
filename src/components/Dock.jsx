import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Dumbbell, CalendarDays, TrendingUp, Settings2 } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Treinos', icon: Dumbbell, match: (p) => p === '/' || p.startsWith('/editar') },
  { to: '/historico', label: 'Histórico', icon: CalendarDays, match: (p) => p.startsWith('/historico') },
  { to: '/progresso', label: 'Progresso', icon: TrendingUp, match: (p) => p.startsWith('/progresso') },
  { to: '/ajustes', label: 'Ajustes', icon: Settings2, match: (p) => p.startsWith('/ajustes') },
];

/** Cápsula flutuante de navegação; o item ativo se expande e mostra o nome. */
export default function Dock() {
  const { pathname } = useLocation();
  // Durante o treino a navegação some e dá lugar à barra do treino (Session.jsx).
  if (pathname.startsWith('/sessao')) return null;
  return (
    <nav className="dock" aria-label="Navegação">
      {ITEMS.map(({ to, label, icon: Icon, match }) => {
        const on = match(pathname);
        return (
          <NavLink key={to} to={to} className={`dock-item ${on ? 'on' : ''}`} aria-label={label}>
            {on && <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
            {on && (
              <motion.span className="dock-label" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}>
                {label}
              </motion.span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
