import { useEffect, useState } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { LoginScreen } from './components/LoginScreen';
import RepertoiresList from './components/RepertoiresList';
import RepertoireDetailsContainer from './components/RepertoireDetailsContainer';
import { TeamsList } from './components/TeamsList';
import { AdminDashboard } from './components/AdminDashboard';

import { useAuth } from './hooks/useAuth';
import { useAppStore } from './store/useAppStore'; 
import { useGlobalSongs } from './hooks/useGlobalSongs';
import { syncAllDataForOffline } from './services/repertoireService';
import { signInWithGoogle, logout } from './services/authService';

import Header from './components/Header';
import NavigationTabs from './components/NavigationTabs';

const APP_VERSION = '2.0.1';
const ADMIN_EMAIL = 'joselaurindofilho000@gmail.com';

function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Zustand Store
  const setGlobalSongs = useAppStore(state => state.setGlobalSongs);
  const globalSongsData = useGlobalSongs(user);
  
  useEffect(() => {
    setGlobalSongs(globalSongsData);
  }, [globalSongsData, setGlobalSongs]);

  // Lógica de instalação PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const [_error, setError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const isAdmin = user && user.email === ADMIN_EMAIL;
  
  const currentView = location.pathname.includes('/teams') ? 'teams' : location.pathname.includes('/admin') ? 'admin' : 'repertoires';
  const isDetailsRoute = location.pathname.includes('/repertoire/');

  const handleCopyUid = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      toast.success('UID copiado!');
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  async function handleSyncOffline() {
    if (!user) return;
    toast.promise(
      syncAllDataForOffline(user.uid),
      {
        loading: 'Baixando músicas para offline...',
        success: 'Pronto! Pode desligar a internet.',
        error: (err) => 'Erro: ' + err.message,
      },
    );
  }

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sessão terminada.');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#666' }}>
        <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', marginBottom: '10px' }}></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} error={_error} version={APP_VERSION} />;

  return (
    <div className="app-container">
      <Toaster position="top-center" reverseOrder={false} />

      <Header
        user={user}
        copiedUid={copiedUid}
        onCopyUid={handleCopyUid}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
        onSyncOffline={handleSyncOffline}
        onLogout={handleLogout}
      />

      <div className="content-wrapper">
        <NavigationTabs
          view={currentView}
          onChangeView={(v) => {
             if (v === 'teams') navigate('/teams');
             else if (v === 'admin') navigate('/admin');
             else navigate('/');
          }}
          isAdmin={!!isAdmin}
          hidden={isDetailsRoute || currentView === 'admin'}
        />

        <Routes>
           <Route path="/" element={<RepertoiresList />} />
           <Route path="/teams" element={<TeamsList />} />
           <Route path="/admin" element={isAdmin ? <AdminDashboard onBack={() => navigate('/')} /> : <Navigate to="/" />} />
           <Route path="/repertoire/:id" element={<RepertoireDetailsContainer />} />
        </Routes>
      </div>

      <div className="footer">
        MySetList &copy; {new Date().getFullYear()} — v{APP_VERSION}
      </div>
    </div>
  );
}

export default App;