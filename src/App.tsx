// src/App.tsx
import { useEffect, useState } from 'react';
import { LogOut, Copy, Check, Shield } from 'lucide-react'; 
import './App.css'; 

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
import { shareRepertoireWithUser, unshareRepertoireWithUser, getUserNames } from './services/repertoireService';
import { signInWithGoogle, logout } from './services/authService';

const APP_VERSION = '1.6.2'; // Versão incrementada
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

  // 1. ESTADO DA VIEW COM PERSISTÊNCIA
  // Ao iniciar, tenta ler do localStorage. Se não houver, usa 'repertoires'.
  const [view, setView] = useState<'repertoires' | 'teams' | 'admin'>(() => {
    const savedView = localStorage.getItem('mysetlist_view');
    return (savedView as 'repertoires' | 'teams' | 'admin') || 'repertoires';
  });
  
  // Salva a view no localStorage sempre que ela mudar
  useEffect(() => {
    if (user) {
      localStorage.setItem('mysetlist_view', view);
    }
  }, [view, user]);

  const [shareUidInput, setShareUidInput] = useState('');
  const [showShareUI, setShowShareUI] = useState(false);
  const [sharedNames, setSharedNames] = useState<Record<string, string>>({});

  // --- USE EFFECTS ---
  
  // Recarrega times quando usuário logar
  useEffect(() => {
     if (user) {
         reloadTeamsList();
     }
  }, [user]);

  // Carrega nomes compartilhados
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
      // 2. PERSISTÊNCIA DO REPERTÓRIO: Salva o ID ao abrir
      localStorage.setItem('mysetlist_selected_id', id);
      
      await handleSelectRepertoire(id);
      songsHook.resetSongForm(); 
      songsHook.setShowSongForm(false); 
      songsHook.setVideoPlayingId(null); 
      setShowShareUI(false);
  };

  const handleBackWrapper = () => {
      // 3. PERSISTÊNCIA DO REPERTÓRIO: Limpa o ID ao voltar
      localStorage.removeItem('mysetlist_selected_id');

      setSelected(null); 
      setShowRepForm(false); 
      setEditingId(null); 
      setView('repertoires');
  };

  // 4. RESTAURAÇÃO AUTOMÁTICA DO REPERTÓRIO
  // Quando a lista de repertórios carregar, verifica se havia um aberto antes do refresh
  useEffect(() => {
    const savedRepId = localStorage.getItem('mysetlist_selected_id');
    
    // Só tenta abrir se:
    // a) Existe um ID salvo
    // b) Nada está selecionado ainda
    // c) A lista de repertórios já foi carregada do Firebase
    if (savedRepId && !selected && sortedRepertoires.length > 0) {
      const exists = sortedRepertoires.find(r => r.id === savedRepId);
      if (exists) {
        handleSelectRepertoireWrapper(savedRepId);
      } else {
        // Se o ID salvo não existe mais (ex: foi excluído), limpa o storage
        localStorage.removeItem('mysetlist_selected_id');
      }
    }
  }, [sortedRepertoires]); // Dependência importante: roda quando os dados chegam

  // --- ACTION HANDLERS ---
  function handleExportPDF() {
    if (!selected) return;
    try { exportRepertoireToPDF(selected.repertoire, selected.songs); } catch (e: any) { alert("Erro: " + e.message); }
  }

  async function handleShareRepertoire() { 
      if (!selected || !shareUidInput.trim()) return;
      try { await shareRepertoireWithUser(selected.repertoire.id, shareUidInput.trim()); alert('Adicionado!'); setShareUidInput(''); await reloadSelectedRepertoire(selected.repertoire.id); } catch (e: any) { alert('Erro: ' + e.message); }
  }
  async function handleShareWithTeam(teamId: string) { 
      if (!selected || !window.confirm('Adicionar equipe?')) return;
      try {
          const members = await getTeamMembers(teamId);
          if (members.length === 0) { alert('Vazia.'); return; }
          for (const uid of members) { if (!selected.repertoire.sharedWith?.includes(uid)) await shareRepertoireWithUser(selected.repertoire.id, uid); }
          alert(`Feito!`); await reloadSelectedRepertoire(selected.repertoire.id);
      } catch (e: any) { alert('Erro: ' + e.message); }
  }
  async function handleUnshareRepertoire(uidToRemove: string) { 
      if (!selected || !window.confirm('Remover?')) return;
      try { await unshareRepertoireWithUser(selected.repertoire.id, uidToRemove); await reloadSelectedRepertoire(selected.repertoire.id); } catch (e: any) { alert('Erro: ' + e.message); }
  }
  
  const handleCopyUid = () => { 
      if(user) {
          navigator.clipboard.writeText(user.uid);
          setCopiedUid(true);
          setTimeout(() => setCopiedUid(false), 2000);
      }
  }

  const handleLogin = async () => { try { await signInWithGoogle(); } catch (e: any) { setError(e.message); } };
  const handleLogout = async () => { 
    // Limpa dados locais ao sair
    localStorage.removeItem('mysetlist_view');
    localStorage.removeItem('mysetlist_selected_id');
    try { await logout(); } catch (e: any) { setError(e.message); } 
  };

  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;
  const isOwner = !!selected?.repertoire?.isOwner; 
  const availableTargetRepertoires = sortedRepertoires.filter(r => r.id !== selected?.repertoire.id && r.isOwner);
  const isAdmin = user && user.email === ADMIN_EMAIL;

  // --- LOADING / LOGIN SCREENS ---
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

  // --- APP CONTENT ---
  return (
    <div className="app-container">
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
        <button onClick={handleLogout} className="btn btn-danger btn-sm" title="Sair">
            <LogOut size={16} style={{marginRight: 4}} /> Sair
        </button>
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

        {/* ADMIN DASHBOARD */}
        {view === 'admin' && !selected && isAdmin && (
          <AdminDashboard onBack={() => setView('repertoires')} />
        )}

        {/* LISTA DE REPERTÓRIOS */}
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

        {/* LISTA DE EQUIPES */}
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

        {/* DETALHES DO REPERTÓRIO */}
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