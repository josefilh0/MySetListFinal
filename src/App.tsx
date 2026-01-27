import { useEffect, useState } from 'react';
import './App.css';

import toast, { Toaster } from 'react-hot-toast';

import { LoginScreen } from './components/LoginScreen';
import RepertoiresList from './components/RepertoiresList';
import { RepertoireDetails } from './components/RepertoireDetails';
import { TeamsList } from './components/TeamsList';
import { AdminDashboard } from './components/AdminDashboard';

import { useAuth } from './hooks/useAuth';
import { useRepertoires } from './hooks/useRepertoires';
import { useSongs } from './hooks/useSongs';
import { useTeams } from './hooks/useTeams';
import { useGlobalSongs } from './hooks/useGlobalSongs'; // Importado o novo Hook
import { getTeamMembers } from './services/teamService';
import { exportRepertoireToPDF } from './services/pdfService';
import {
  shareRepertoireWithUser,
  unshareRepertoireWithUser,
  getUserNames,
  syncAllDataForOffline,
} from './services/repertoireService';
import { signInWithGoogle, logout } from './services/authService';

// Importa os novos componentes
import Header from './components/Header';
import NavigationTabs from './components/NavigationTabs';

const APP_VERSION = '2.0.1';
const ADMIN_EMAIL = 'joselaurindofilho000@gmail.com';

function App() {
  const { user, loading } = useAuth();
  
  // Hook para carregar todas as músicas do usuário para o Assistente IA
  const globalSongs = useGlobalSongs(user);

  // Lógica de instalação PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const [_error, setError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // Hooks para repertórios, músicas e equipes
  const {
    repertoires: sortedRepertoires,
    selected,
    setSelected,
    searchTerm,
    setSearchTerm,
    showRepForm,
    setShowRepForm,
    newName,
    setNewName,
    newVocal,
    setNewVocal,
    creating,
    editingId,
    setEditingId,
    reloadSelectedRepertoire,
    reloadRepertoireList,
    handleSelectRepertoire,
    handleSaveRepertoire,
    handleStartEdit,
    handleCancelEdit,
    handleDeleteSelected,
    handleLeaveRepertoire,
    handleToggleFavorite,
    handleNewRepertoireClick,
  } = useRepertoires(user);

  const songsHook = useSongs(
    selected,
    reloadSelectedRepertoire,
    reloadRepertoireList,
    setSelected,
  );

  const {
    teamsList,
    newTeamName,
    setNewTeamName,
    teamMemberInput,
    setTeamMemberInput,
    expandedTeamId,
    setExpandedTeamId,
    teamMembersNames,
    handleCreateTeam,
    handleDeleteTeam,
    handleAddMemberToTeam,
    handleRemoveMemberFromTeam,
    handleLeaveTeam,
    reloadTeamsList,
  } = useTeams(user);

  // Persistência do estado da visualização
  const [view, setView] = useState<'repertoires' | 'teams' | 'admin'>(() => {
    const savedView = localStorage.getItem('mysetlist_view');
    return (
      (savedView as 'repertoires' | 'teams' | 'admin') || 'repertoires'
    );
  });

  useEffect(() => {
    if (user) localStorage.setItem('mysetlist_view', view);
  }, [view, user]);

  const [shareUidInput, setShareUidInput] = useState('');
  const [showShareUI, setShowShareUI] = useState(false);
  const [sharedNames, setSharedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) reloadTeamsList();
  }, [user]);

  useEffect(() => {
    const loadNames = async () => {
      if (selected?.repertoire?.sharedWith?.length) {
        try {
          setSharedNames(
            await getUserNames(selected.repertoire.sharedWith),
          );
        } catch (e) {
          console.error(e);
        }
      }
    };
    if (showShareUI && selected) loadNames();
  }, [showShareUI, selected]);

  const handleSelectRepertoireWrapper = async (id: string) => {
    localStorage.setItem('mysetlist_selected_id', id);
    await handleSelectRepertoire(id);
    songsHook.resetSongForm();
    songsHook.setShowSongForm(false);
    songsHook.setVideoPlayingId(null);
    setShowShareUI(false);
  };

  const handleBackWrapper = () => {
    localStorage.removeItem('mysetlist_selected_id');
    setSelected(null);
    setShowRepForm(false);
    setEditingId(null);
    setView('repertoires');
  };

  useEffect(() => {
    const savedRepId = localStorage.getItem('mysetlist_selected_id');
    if (savedRepId && !selected && sortedRepertoires.length > 0) {
      const exists = sortedRepertoires.find((r) => r.id === savedRepId);
      if (exists) handleSelectRepertoireWrapper(savedRepId);
      else localStorage.removeItem('mysetlist_selected_id');
    }
  }, [sortedRepertoires]);

  function handleExportPDF() {
    if (!selected) return;
    try {
      exportRepertoireToPDF(selected.repertoire, selected.songs);
      toast.success('PDF gerado com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + e.message);
    }
  }

  async function handleShareRepertoire() {
    if (!selected || !shareUidInput.trim()) return;
    toast.promise(
      (async () => {
        await shareRepertoireWithUser(
          selected.repertoire.id,
          shareUidInput.trim(),
        );
        setShareUidInput('');
        await reloadSelectedRepertoire(selected.repertoire.id);
      })(),
      {
        loading: 'Adicionando utilizador...',
        success: 'Utilizador adicionado!',
        error: (err) => `Erro: ${err.message}`,
      },
    );
  }

  async function handleShareWithTeam(teamId: string) {
    if (!selected) return;
    toast(
      (t) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span>Deseja partilhar com todos os membros desta equipa?</span>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              className="btn btn-sm"
              onClick={() => toast.dismiss(t.id)}
              style={{ background: '#ccc', color: '#333' }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#007bff', color: '#fff' }}
              onClick={() => {
                toast.dismiss(t.id);
                confirmShareWithTeam(teamId);
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      ),
      { duration: 5000 },
    );
  }

  async function confirmShareWithTeam(teamId: string) {
    if (!selected) return;
    toast.promise(
      (async () => {
        const members = await getTeamMembers(teamId);
        if (members.length === 0) throw new Error('A equipa está vazia.');
        for (const uid of members) {
          if (!selected.repertoire.sharedWith?.includes(uid)) {
            await shareRepertoireWithUser(selected.repertoire.id, uid);
          }
        }
        await reloadSelectedRepertoire(selected.repertoire.id);
      })(),
      {
        loading: 'Processando equipa...',
        success: 'Partilhado com a equipa!',
        error: (e) => 'Erro: ' + e.message,
      },
    );
  }

  async function handleUnshareRepertoire(uidToRemove: string) {
    if (!selected) return;
    toast(
      (t) => (
        <div>
          <p style={{ margin: '0 0 10px 0' }}>
            Remover acesso deste utilizador?
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                toast.dismiss(t.id);
                executeUnshare(uidToRemove);
              }}
            >
              Remover
            </button>
            <button
              className="btn btn-sm"
              onClick={() => toast.dismiss(t.id)}
              style={{ background: '#eee', color: '#333' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ),
      { icon: '⚠️' },
    );
  }

  async function executeUnshare(uidToRemove: string) {
    if (!selected) return;
    try {
      await unshareRepertoireWithUser(
        selected.repertoire.id,
        uidToRemove,
      );
      await reloadSelectedRepertoire(selected.repertoire.id);
      toast.success('Acesso removido.');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  }

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
    localStorage.removeItem('mysetlist_view');
    localStorage.removeItem('mysetlist_selected_id');
    try {
      await logout();
      toast.success('Sessão terminada.');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;
  const isOwner = !!selected?.repertoire?.isOwner;
  const availableTargetRepertoires = sortedRepertoires.filter(
    (r) => r.id !== selected?.repertoire?.id && r.isOwner,
  );
  const isAdmin = user && user.email === ADMIN_EMAIL;

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          color: '#666',
        }}
      >
        <div
          className="spinner"
          style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            animation: 'spin 1s linear infinite',
            marginBottom: '10px',
          }}
        ></div>
        <p>Carregando...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user)
    return (
      <LoginScreen
        onLogin={handleLogin}
        error={_error}
        version={APP_VERSION}
      />
    );

  return (
    <div className="app-container">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Cabeçalho com o componente Header */}
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
        {/* Abas de navegação com o componente NavigationTabs */}
        <NavigationTabs
          view={view}
          onChangeView={(v) => setView(v)}
          isAdmin={!!isAdmin}
          hidden={!!selected || view === 'admin'}
        />

        {/* Painel Admin */}
        {view === 'admin' && !selected && isAdmin && (
          <AdminDashboard onBack={() => setView('repertoires')} />
        )}

        {/* Lista de repertórios */}
        {view === 'repertoires' && !selected && (
          <RepertoiresList
            repertoires={sortedRepertoires}
            /* AJUSTADO: Agora usamos globalSongs para que a IA mostre nomes legíveis */
            allSongs={globalSongs}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelectRepertoire={handleSelectRepertoireWrapper}
            onLeaveRepertoire={handleLeaveRepertoire}
            onNewRepertoireClick={handleNewRepertoireClick}
            showForm={showRepForm}
            editingId={editingId}
            newName={newName}
            setNewName={setNewName}
            newVocal={newVocal}
            setNewVocal={setNewVocal}
            isCreating={creating}
            onSave={handleSaveRepertoire}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {/* Lista de equipes */}
        {view === 'teams' && !selected && (
          <TeamsList
            teamsList={teamsList}
            newTeamName={newTeamName}
            setNewTeamName={setNewTeamName}
            onCreateTeam={handleCreateTeam}
            expandedTeamId={expandedTeamId}
            setExpandedTeamId={setExpandedTeamId}
            teamMembersNames={teamMembersNames}
            teamMemberInput={teamMemberInput}
            setTeamMemberInput={setTeamMemberInput}
            onAddMember={handleAddMemberToTeam}
            onRemoveMember={handleRemoveMemberFromTeam}
            onDeleteTeam={handleDeleteTeam}
            onLeaveTeam={handleLeaveTeam}
            currentUserId={user.uid}
          />
        )}

        {/* Detalhes do repertório selecionado */}
        {selected && (
          <RepertoireDetails
            selected={selected}
            isOwner={isOwner}
            isFavorite={selectedIsFavorite}
            onBack={handleBackWrapper}
            onEditRepertoire={handleStartEdit}
            onDeleteRepertoire={handleDeleteSelected}
            onToggleFavorite={handleToggleFavorite}
            onExportPDF={handleExportPDF}
            showShareUI={showShareUI}
            toggleShareUI={() => setShowShareUI(!showShareUI)}
            shareUidInput={shareUidInput}
            setShareUidInput={setShareUidInput}
            onShareUser={handleShareRepertoire}
            onUnshareUser={handleUnshareRepertoire}
            myTeams={teamsList}
            onShareTeam={handleShareWithTeam}
            sharedNames={sharedNames}
            onNewSongClick={songsHook.handleNewSongClick}
            showSongForm={songsHook.showSongForm}
            editingSongId={songsHook.editingSongId}
            songTitle={songsHook.songTitle}
            setSongTitle={songsHook.setSongTitle}
            songKey={songsHook.songKey}
            setSongKey={songsHook.setSongKey}
            songVocal={songsHook.songVocal}
            setSongVocal={songsHook.setSongVocal}
            songYoutube={songsHook.songYoutube}
            handleYoutubeChange={songsHook.handleYoutubeChange}
            songChord={songsHook.songChord}
            handleChordChange={songsHook.handleChordChange}
            songNotes={songsHook.songNotes}
            setSongNotes={songsHook.setSongNotes}
            songSaving={songsHook.songSaving}
            onSaveSong={songsHook.handleSaveSong}
            onCancelSongEdit={songsHook.handleCancelSongEdit}
            onEditSong={songsHook.handleEditSong}
            onDeleteSong={songsHook.handleDeleteSong}
            expandedSongId={songsHook.expandedSongId}
            toggleExpandedSong={songsHook.toggleExpandedSong}
            onDragStart={songsHook.handleDragStart}
            onDrop={songsHook.handleDrop}
            videoPlayingId={songsHook.videoPlayingId}
            setVideoPlayingId={songsHook.setVideoPlayingId}
            copyingSongId={songsHook.copyingSongId}
            setCopyingSongId={songsHook.setCopyingSongId}
            availableTargetRepertoires={availableTargetRepertoires}
            onCopySong={songsHook.handlePerformCopy}
            getYoutubeVideoId={songsHook.getYoutubeVideoId}
            onImportFromCifraClub={songsHook.handleImportFromCifraClub}
            onUpdateChords={songsHook.handleUpdateChords}
          />
        )}
      </div>

      <div className="footer">
        MySetList &copy; {new Date().getFullYear()} — v{APP_VERSION}
      </div>
    </div>
  );
}

export default App;