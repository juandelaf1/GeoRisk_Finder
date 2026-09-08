import { useEffect } from 'react';
import { Topbar } from './components/Topbar/Topbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Globe } from './components/Globe/Globe';
import { DecisionCenter } from './components/DecisionCenter/DecisionCenter';
import { LayerPanel } from './components/LayerPanel/LayerPanel';
import { TimelineBar } from './components/TimelineBar/TimelineBar';
import { CommandBar } from './components/CommandBar/CommandBar';
import { AuthModal } from './components/Auth/AuthModal';
import { useLayers } from './hooks/useLayers';
import { useAlerts } from './hooks/useAlerts';
import { useStore } from './store';

export default function App() {
  useLayers();
  useAlerts();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useStore.getState().openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Topbar />
      <Sidebar />
      <Globe />
      <DecisionCenter />
      <LayerPanel />
      <TimelineBar />
      <CommandBar />
      <AuthModal />
    </>
  );
}
