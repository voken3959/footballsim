import { useEffect, useState } from 'react';
import { useCareerStore } from './store/careerStore';
import Layout, { NavKey } from './components/Layout';
import CareerWizard from './screens/CareerWizard';
import Dashboard from './screens/Dashboard';
import SquadScreen from './screens/SquadScreen';
import TrainingScreen from './screens/TrainingScreen';
import MatchScreen from './screens/MatchScreen';
import LeagueScreen from './screens/LeagueScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoadScreen from './screens/LoadScreen';

type Screen = NavKey | 'wizard' | 'load';

export default function App() {
  const save = useCareerStore((s) => s.save);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [bootDone, setBootDone] = useState(false);
  const listCareers = useCareerStore((s) => s.listCareers);

  // On boot, if there's no active save but there are stored careers, show the load screen
  useEffect(() => {
    (async () => {
      const careers = await listCareers();
      if (!save && careers.length > 0) setScreen('load');
      else if (!save) setScreen('wizard');
      setBootDone(true);
    })();
  }, []);

  // Whenever a save appears, drop back to the dashboard
  useEffect(() => {
    if (save && (screen === 'wizard' || screen === 'load')) {
      setScreen('dashboard');
    }
  }, [save]);

  if (!bootDone) {
    return (
      <div className="flex items-center justify-center h-full text-txt-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!save) {
    if (screen === 'load') return <LoadScreen onBack={() => setScreen('wizard')} />;
    return <CareerWizard onComplete={() => setScreen('dashboard')} />;
  }

  return (
    <Layout active={screen as NavKey} onNavigate={(k) => setScreen(k)}>
      {screen === 'dashboard' && <Dashboard onNavigate={setScreen} />}
      {screen === 'squad' && <SquadScreen />}
      {screen === 'training' && <TrainingScreen />}
      {screen === 'match' && <MatchScreen />}
      {screen === 'league' && <LeagueScreen />}
      {screen === 'profile' && <ProfileScreen />}
      {screen === 'settings' && (
        <div className="panel p-6">
          <div className="label">Settings</div>
          <p className="text-txt-muted text-sm mt-2">
            Not implemented in this build. Save management is on the Load screen.
          </p>
        </div>
      )}
      {screen === 'load' && <LoadScreen onBack={() => setScreen('dashboard')} />}
    </Layout>
  );
}
