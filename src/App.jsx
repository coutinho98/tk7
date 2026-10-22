import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { registerSW } from 'virtual:pwa-register';
import Dock from './components/Dock';
import RestDevice from './components/RestDevice';
import Effects from './components/Effects';
import { Toast, DialogHost } from './components/Overlays';
import Workouts from './pages/Workouts';
import Editor from './pages/Editor';
import Session from './pages/Session';
import History from './pages/History';
import SessionDetail from './pages/SessionDetail';
import Progress from './pages/Progress';
import Settings from './pages/Settings';

registerSW({ immediate: true });

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Effects />
        <div className="edge edge-top" aria-hidden="true" />
        <Routes>
          <Route path="/" element={<Workouts />} />
          <Route path="/editar/:id" element={<Editor />} />
          <Route path="/sessao" element={<Session />} />
          <Route path="/historico" element={<History />} />
          <Route path="/historico/:id" element={<SessionDetail />} />
          <Route path="/progresso" element={<Progress />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="edge edge-bottom" aria-hidden="true" />
        <RestDevice />
        <Dock />
        <Toast />
        <DialogHost />
      </HashRouter>
    </MotionConfig>
  );
}
