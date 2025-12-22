// src/App.tsx
import { useEffect, useState } from 'react';
import { LogOut, Copy, Check, Shield, DownloadCloud } from 'lucide-react'; 
import './App.css'; 

// --- TOAST NOTIFICATIONS ---
import toast, { Toaster } from 'react-hot-toast';

// --- COMPONENTS ---
import { LoginScreen } from './components/LoginScreen';
import RepertoiresList from './components/RepertoiresList';
import { RepertoireDetails } from './components/RepertoireDetails';
import { TeamsList } from './components/TeamsList';
import { AdminDashboard } from './components/AdminDashboard'; 

// --- HOOKS & SERVICES ---
import { useAuth } from './hooks/useAuth';
import { useRepertoires } from './hooks/useRepertoires';
import { useSongs } from './hooks/useSongs';
import { useTeams } from './hooks/useTeams';
import { getTeamMembers } from './services/teamService';
import { exportRepertoireToPDF } from './services/pdfService';
import { 
  shareRepertoireWithUser, 
  unshareRepertoireWithUser, 
  getUserNames, 
  syncAllDataForOffline 
} from './services/repertoireService';
import { signInWithGoogle, logout } from './services/authService';

const APP_VERSION = '1.6.4'; 
const ADMIN_EMAIL = 'joselaurindofilho000@gmail.com'; 

function App() {
  const { user, loading } = useAuth();
  
  const [_error, setError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // --- HOOKS ---
  const {
    repertoires: sortedRepertoires,
    selected, setSelected,
    searchTerm, setSearchTerm,
    showRepForm, setShowRepForm,
    newName, setNewName,
    newVocal, setNewVocal,
    creating,
    editingId, setEditingId,
    reloadSelectedRepertoire, reloadRepertoireList,     
    handleSelectRepertoire, handleSaveRepertoire,
    handleStartEdit, handleCancelEdit, handleDeleteSelected,
    handleLeaveRepertoire, handleToggleFavorite, handleNewRepertoireClick
  } = useRepertoires(user);

  const songsHook = useSongs(selected, reloadSelectedRepertoire, reloadRepertoireList, setSelected);

  const {
    teamsList, newTeamName, setNewTeamName, teamMemberInput, setTeamMemberInput,
    expandedTeamId, setExpandedTeamId, teamMembersNames,
    handleCreateTeam, handleDeleteTeam, handleAddMemberToTeam, handleRemoveMemberFromTeam,
    handleLeaveTeam, 
    reloadTeamsList 
  } = useTeams(user);

  // VIEW STATE PERSISTENCE
  const [view, setView] = useState<'repertoires' | 'teams' | 'admin'>(() => {
    const savedView = localStorage.getItem('mysetlist_view');
    return (savedView as 'repertoires' | 'teams' | 'admin') || 'repertoires';
  });
  
  useEffect(() => {
    if (user) localStorage.setItem('mysetlist_view', view);
  }, [view, user]);

  const [shareUidInput, setShareUidInput] = useState('');
  const [showShareUI, setShowShareUI] = useState(false);
  const [sharedNames, setSharedNames] = useState<Record<string, string>>({});

  // --- USE EFFECTS ---
  useEffect(() => {
     if (user) reloadTeamsList();
  }, [user]);

  useEffect(() => {
    const loadNames = async () => {
        if (selected?.repertoire?.sharedWith?.length) {
            try { setSharedNames(await getUserNames(selected.repertoire.sharedWith)); } catch (e) { console.error(e); }
        }
    };
    if (showShareUI && selected) loadNames();
  }, [showShareUI, selected]);

  // --- HANDLERS WRAPPERS ---

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

  // RESTAURAÇÃO AUTOMÁTICA
  useEffect(() => {
    const savedRepId = localStorage.getItem('mysetlist_selected_id');
    if (savedRepId && !selected && sortedRepertoires.length > 0) {
      const exists = sortedRepertoires.find(r => r.id === savedRepId);
      if (exists) handleSelectRepertoireWrapper(savedRepId);
      else localStorage.removeItem('mysetlist_selected_id');
    }
  }, [sortedRepertoires]); 

  // --- ACTION HANDLERS (ATUALIZADOS COM TOAST) ---

  function handleExportPDF() {
    if (!selected) return;
    try { 
      exportRepertoireToPDF(selected.repertoire, selected.songs); 
      toast.success('PDF gerado com sucesso!'); 
    } catch (e: any) { 
      toast.error("Erro ao gerar PDF: " + e.message); 
    }
  }

  async function handleShareRepertoire() { 
      if (!selected || !shareUidInput.trim()) return;
      
      toast.promise(
        (async () => {
          await shareRepertoireWithUser(selected.repertoire.id, shareUidInput.trim());
          setShareUidInput('');
          await reloadSelectedRepertoire(selected.repertoire.id);
        })(),
        {
          loading: 'Adicionando utilizador...',
          success: 'Utilizador adicionado!',
          error: (err) => `Erro: ${err.message}`,
        }
      );
  }

  async function handleShareWithTeam(teamId: string) { 
      if (!selected) return;

      toast((t) => (
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <span>Deseja partilhar com todos os membros desta equipa?</span>
          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
            <button 
              className="btn btn-sm" 
              onClick={() => toast.dismiss(t.id)}
              style={{background: '#ccc', color: '#333'}}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-sm"
              style={{background: '#007bff', color: '#fff'}} 
              onClick={() => {
                toast.dismiss(t.id);
                confirmShareWithTeam(teamId);
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      ), { duration: 5000 });
  }

  async function confirmShareWithTeam(teamId: string) {
    if(!selected) return;
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
        error: (e) => 'Erro: ' + e.message
      }
    );
  }

  async function handleUnshareRepertoire(uidToRemove: string) { 
      if (!selected) return;

      toast((t) => (
        <div>
          <p style={{margin: '0 0 10px 0'}}>Remover acesso deste utilizador?</p>
          <div style={{display: 'flex', gap: '10px'}}>
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
                style={{background: '#eee', color: '#333'}}
             >
               Cancelar
             </button>
          </div>
        </div>
      ), { icon: '⚠️' });
  }

  async function executeUnshare(uidToRemove: string) {
    if(!selected) return;
    try { 
      await unshareRepertoireWithUser(selected.repertoire.id, uidToRemove); 
      await reloadSelectedRepertoire(selected.repertoire.id); 
      toast.success('Acesso removido.');
    } catch (e: any) { 
      toast.error('Erro: ' + e.message); 
    }
  }
  
  const handleCopyUid = () => { 
      if(user) {
          navigator.clipboard.writeText(user.uid);
          setCopiedUid(true);
          toast.success("UID copiado!"); 
          setTimeout(() => setCopiedUid(false), 2000);
      }
  }

  // --- NOVA FUNÇÃO DE SINCRONIZAÇÃO OFFLINE ---
  async function handleSyncOffline() {
    if (!user) return;
    
    toast.promise(
      syncAllDataForOffline(user.uid),
      {
        loading: 'Baixando músicas para offline...',
        success: 'Pronto! Pode desligar a internet.',
        error: (err) => 'Erro: ' + err.message
      }
    );
  }

  const handleLogin = async () => { 
    try { await signInWithGoogle(); } catch (e: any) { 
      setError(e.message); 
    } 
  };
  
  const handleLogout = async () => { 
    localStorage.removeItem('mysetlist_view');
    localStorage.removeItem('mysetlist_selected_id');
    try { await logout(); toast.success('Sessão terminada.'); } catch (e: any) { toast.error(e.message); } 
  };

  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;
  const isOwner = !!selected?.repertoire?.isOwner; 
  const availableTargetRepertoires = sortedRepertoires.filter(r => r.id !== selected?.repertoire.id && r.isOwner);
  const isAdmin = user && user.email === ADMIN_EMAIL;

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#666' }}>
        <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', marginBottom: '10px' }}></div>
        <p>Carregando...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} error={_error} version={APP_VERSION} />;

  return (
    <div className="app-container">
      {/* TOASTER */}
      <Toaster position="top-center" reverseOrder={false} />

      <div className="header">
        <div>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>MySetList</span>
            <div className="user-info">{user.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                <span className="uid-badge" title={user.uid}>UID: {user.uid.substring(0,6)}...</span>
                <button onClick={handleCopyUid} className="btn btn-xs btn-info" style={{marginLeft: 6}} title="Copiar UID">
                    {copiedUid ? <Check size={12}/> : <Copy size={12}/>}
                </button>
            </div>
        </div>
        
        {/* BOTÕES DO HEADER */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            
            {/* Botão Offline */}
            <button 
              onClick={handleSyncOffline} 
              className="btn btn-sm" 
              style={{ backgroundColor: '#28a745', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Baixar tudo para usar sem internet"
            >
              <DownloadCloud size={16} /> 
              <span style={{ display: window.innerWidth < 400 ? 'none' : 'inline' }}>Offline</span>
            </button>

            {/* Botão Sair */}
            <button onClick={handleLogout} className="btn btn-danger btn-sm" title="Sair">
                <LogOut size={16} style={{marginRight: 4}} /> Sair
            </button>
        </div>
      </div>

      <div className="content-wrapper">
        {/* NAVEGAÇÃO / TABS */}
        {!selected && view !== 'admin' && (
            <div className="nav-tabs">
                <button onClick={() => setView('repertoires')} className={`nav-btn ${view === 'repertoires' ? 'active' : ''}`}>Repertórios</button>
                <button onClick={() => setView('teams')} className={`nav-btn ${view === 'teams' ? 'active' : ''}`}>Minhas Equipes</button>
                {isAdmin && (
                  <button 
                    onClick={() => setView('admin')} 
                    className="nav-btn admin-btn" 
                    style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' }}
                  >
                    <Shield size={14} style={{ marginRight: 4 }}/> Admin
                  </button>
                )}
            </div>
        )}

        {/* --- VIEWS --- */}

        {view === 'admin' && !selected && isAdmin && (
          <AdminDashboard onBack={() => setView('repertoires')} />
        )}

        {view === 'repertoires' && !selected && (
          <RepertoiresList 
            repertoires={sortedRepertoires}
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            onSelectRepertoire={handleSelectRepertoireWrapper}
            onLeaveRepertoire={handleLeaveRepertoire}
            onNewRepertoireClick={handleNewRepertoireClick}
            showForm={showRepForm} editingId={editingId}
            newName={newName} setNewName={setNewName}
            newVocal={newVocal} setNewVocal={setNewVocal}
            isCreating={creating} onSave={handleSaveRepertoire}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {view === 'teams' && !selected && (
            <TeamsList 
                teamsList={teamsList}
                newTeamName={newTeamName} setNewTeamName={setNewTeamName}
                onCreateTeam={handleCreateTeam}
                expandedTeamId={expandedTeamId} setExpandedTeamId={setExpandedTeamId}
                teamMembersNames={teamMembersNames}
                teamMemberInput={teamMemberInput} setTeamMemberInput={setTeamMemberInput}
                onAddMember={handleAddMemberToTeam} 
                onRemoveMember={handleRemoveMemberFromTeam}
                onDeleteTeam={handleDeleteTeam}
                onLeaveTeam={handleLeaveTeam}
                currentUserId={user.uid}
            />
        )}

        {selected && (
            <RepertoireDetails
                selected={selected} isOwner={isOwner} isFavorite={selectedIsFavorite}
                onBack={handleBackWrapper}
                onEditRepertoire={handleStartEdit} onDeleteRepertoire={handleDeleteSelected}
                onToggleFavorite={handleToggleFavorite} onExportPDF={handleExportPDF}
                
                showShareUI={showShareUI} toggleShareUI={() => setShowShareUI(!showShareUI)}
                shareUidInput={shareUidInput} setShareUidInput={setShareUidInput}
                onShareUser={handleShareRepertoire} onUnshareUser={handleUnshareRepertoire}
                myTeams={teamsList} onShareTeam={handleShareWithTeam} sharedNames={sharedNames}
                
                onNewSongClick={songsHook.handleNewSongClick}
                showSongForm={songsHook.showSongForm} editingSongId={songsHook.editingSongId}
                songTitle={songsHook.songTitle} setSongTitle={songsHook.setSongTitle}
                songKey={songsHook.songKey} setSongKey={songsHook.setSongKey}
                songVocal={songsHook.songVocal} setSongVocal={songsHook.setSongVocal}
                songYoutube={songsHook.songYoutube} handleYoutubeChange={songsHook.handleYoutubeChange}
                songChord={songsHook.songChord} handleChordChange={songsHook.handleChordChange}
                songNotes={songsHook.songNotes} setSongNotes={songsHook.setSongNotes}
                songSaving={songsHook.songSaving} onSaveSong={songsHook.handleSaveSong}
                onCancelSongEdit={songsHook.handleCancelSongEdit}
                onEditSong={songsHook.handleEditSong} onDeleteSong={songsHook.handleDeleteSong}
                expandedSongId={songsHook.expandedSongId} toggleExpandedSong={songsHook.toggleExpandedSong}
                onDragStart={songsHook.handleDragStart} onDrop={songsHook.handleDrop}
                videoPlayingId={songsHook.videoPlayingId} setVideoPlayingId={songsHook.setVideoPlayingId}
                copyingSongId={songsHook.copyingSongId} setCopyingSongId={songsHook.setCopyingSongId}
                availableTargetRepertoires={availableTargetRepertoires}
                onCopySong={songsHook.handlePerformCopy} getYoutubeVideoId={songsHook.getYoutubeVideoId}
            />
        )}
      </div>
      <div className="footer">MySetList &copy; {new Date().getFullYear()} — v{APP_VERSION}</div>
    </div>
  );
}
export default App;