import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, ChevronRight, Download, Upload, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { Page, SectionLabel, Switch } from '../components/ui';
import { confirmDialog } from '../lib/confirm';
import PlateCalc from '../components/PlateCalc';

const THEMES = [['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']];
const BADGES = [['off', 'Nada'], ['streak', 'Sequência 🔥'], ['week', 'Na semana']];
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
// No iPhone, o app aberto pelo ícone e o site no Safari guardam dados separados.
const inSafariTab = isIOS && navigator.standalone === false;

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const showToast = useStore((s) => s.showToast);
  const fileRef = useRef(null);
  const [plates, setPlates] = useState(false);
  const [notif, setNotif] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const [persisted, setPersisted] = useState(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => {}); }, []);

  const askNotif = async () => setNotif(await Notification.requestPermission());

  const exportData = () => {
    const blob = new Blob([useStore.getState().exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tk7-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.workouts) || !Array.isArray(data.sessions)) throw new Error();
      const ok = await confirmDialog({
        title: 'Importar backup?',
        body: `${data.workouts.length} treinos e ${data.sessions.length} registros. Isso substitui os dados atuais.`,
        confirmLabel: 'Importar',
      });
      if (!ok) return;
      useStore.getState().importData(data);
      showToast('Backup importado ✓');
    } catch {
      showToast('Arquivo inválido');
    }
  };

  const wipe = async () => {
    const ok = await confirmDialog({
      title: 'Apagar tudo?',
      body: 'Todos os treinos e o histórico serão apagados deste aparelho. Isso não pode ser desfeito.',
      confirmLabel: 'Apagar tudo',
      danger: true,
    });
    if (!ok) return;
    useStore.getState().wipe();
    showToast('Dados apagados');
  };

  return (
    <Page>
      <section className="prose intro">
        <p>Ajustes,</p>
        <p>Seus dados ficam <b>só neste aparelho</b>. Exporte um backup de vez em quando para não perder nada.</p>
      </section>

      {inSafariTab && (
        <div className="warn-card">
          <b>Você está no Safari.</b> Os dados daqui são separados dos do app na tela de início. Use sempre pelo ícone — e
          não apague o ícone para atualizar: o app se atualiza sozinho ao abrir.
        </div>
      )}

      <SectionLabel>Aparência</SectionLabel>
      <div className="seg seg-wide" role="radiogroup" aria-label="Tema">
        {THEMES.map(([key, label]) => (
          <button key={key} role="radio" aria-checked={settings.theme === key} className={settings.theme === key ? 'on' : ''} onClick={() => setSetting('theme', key)}>
            {settings.theme === key && <motion.span layoutId="theme-seg" className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <SectionLabel>Número no ícone</SectionLabel>
      <div className="seg seg-wide" role="radiogroup" aria-label="Número no ícone">
        {BADGES.map(([key, label]) => (
          <button key={key} role="radio" aria-checked={settings.badge === key} className={settings.badge === key ? 'on' : ''} onClick={() => setSetting('badge', key)}>
            {settings.badge === key && <motion.span layoutId="badge-seg" className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="small muted hint">
        {!('setAppBadge' in navigator)
          ? 'Este navegador não mostra número no ícone.'
          : isIOS
            ? 'No iPhone, precisa do app na tela de início e das notificações ativadas (logo abaixo).'
            : 'Aparece com o app instalado; alguns celulares mostram só uma bolinha.'}
      </p>

      <SectionLabel>Descanso</SectionLabel>
      <div className="card settings-list">
        <Row title="Som ao terminar" hint="Bipe quando o descanso acaba">
          <Switch label="Som" checked={settings.sound} onChange={(v) => setSetting('sound', v)} />
        </Row>
        <Row title="Vibrar ao terminar" hint="Funciona no Android">
          <Switch label="Vibrar" checked={settings.vibrate} onChange={(v) => setSetting('vibrate', v)} />
        </Row>
        <Row title="Manter tela ligada" hint="Durante o treino em andamento">
          <Switch label="Tela ligada" checked={settings.wakeLock} onChange={(v) => setSetting('wakeLock', v)} />
        </Row>
        <Row title="Notificações" hint="Avisa mesmo com o app em segundo plano">
          {notif === 'default' ? (
            <button className="chip chip-action" onClick={askNotif}>ativar</button>
          ) : (
            <span className="small muted">
              {notif === 'granted' ? 'ativadas' : notif === 'denied' ? 'bloqueadas no navegador' : 'indisponível'}
            </span>
          )}
        </Row>
      </div>

      <SectionLabel>Ferramentas</SectionLabel>
      <div className="card settings-list">
        <button className="settings-row settings-link" onClick={() => setPlates(true)}>
          <Calculator size={17} />
          <div className="grow">
            <div>Calculadora de anilhas</div>
            <div className="small muted">Quanto colocar de cada lado da barra</div>
          </div>
          <ChevronRight size={16} className="faint" />
        </button>
      </div>
      <PlateCalc open={plates} onClose={() => setPlates(false)} />

      <SectionLabel>Backup</SectionLabel>
      <p className="small muted hint-block">
        {persisted
          ? <>Armazenamento <b>protegido</b>: o navegador não apaga seus dados para liberar espaço.</>
          : <>O navegador pode apagar os dados se faltar espaço ou se o app ficar muito tempo sem uso. Mantenha um backup.</>}
      </p>
      <div className="row-actions">
        <button className="btn" onClick={exportData}><Download size={15} /> Exportar</button>
        <button className="btn" onClick={() => fileRef.current.click()}><Upload size={15} /> Importar</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
      </div>

      <div className="stack-actions">
        <button className="btn btn-text danger" onClick={wipe}><Trash2 size={15} /> Apagar todos os dados</button>
      </div>
    </Page>
  );
}

function Row({ title, hint, children }) {
  return (
    <div className="settings-row">
      <div>
        <div>{title}</div>
        <div className="small muted">{hint}</div>
      </div>
      {children}
    </div>
  );
}
