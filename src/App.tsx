import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  getAllRepertoires,
  getRepertoireWithSongs,
  createRepertoire,
  updateRepertoire,
  deleteRepertoire,
  addSongToRepertoire,
  updateSongInRepertoire,
  deleteSongFromRepertoire,
  setRepertoireFavorite,
  updateSongsOrder,
  shareRepertoireWithUser,
  unshareRepertoireWithUser,
  getUserNames,
  leaveRepertoire
} from './services/repertoireService';

// Importando o novo serviço de Times
import { 
    createTeam, 
    getMyTeams, 
    addMemberToTeam, 
    removeMemberFromTeam, 
    deleteTeam,
    getTeamMembers
} from './services/teamService';
import type { Team } from './services/teamService';

// Importando o novo serviço de PDF
import { exportRepertoireToPDF } from './services/pdfService';

import { signInWithGoogle, logout, onAuthStateChanged } from './services/authService';
import type { RepertoireSummary } from './services/repertoireService';
import { fetchYoutubeTitle, fetchChordTitle } from './services/metadataService'; 

type Repertoire = RepertoireSummary;

type RepertoireWithSongs = {
  repertoire: RepertoireSummary & { sharedWith?: string[] };
  songs: any[];
};

function App() {
  // --- ESTADOS GERAIS ---
  const [user, setUser] = useState<any | null>(null); 
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [selected, setSelected] = useState<RepertoireWithSongs | null>(null);
  
  // Variáveis prefixadas com '_' para ignorar o aviso de "unused"
  const [_loading, setLoading] = useState(false); 
  const [_error, setError] = useState<string | null>(null); 
  
  // --- ESTADOS DE UI ---
  const [view, setView] = useState<'repertoires' | 'teams'>('repertoires'); // Controla qual tela ver
  const [showRepForm, setShowRepForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- ESTADOS DE FORMULÁRIO (Repertório) ---
  const [newName, setNewName] = useState('');
  const [newVocal, setNewVocal] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- ESTADOS DE COMPARTILHAMENTO ---
  const [shareUidInput, setShareUidInput] = useState('');
  const [showShareUI, setShowShareUI] = useState(false);
  const [sharedNames, setSharedNames] = useState<Record<string, string>>({});
  const [myTeams, setMyTeams] = useState<Team[]>([]); 

  // --- ESTADOS DE EQUIPES (Gestão) ---
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamMemberInput, setTeamMemberInput] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembersNames, setTeamMembersNames] = useState<Record<string, string>>({});

  // --- ESTADOS DE FORMULÁRIO (Música) ---
  const [songTitle, setSongTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [songVocal, setSongVocal] = useState('');
  const [songYoutube, setSongYoutube] = useState('');
  const [songChord, setSongChord] = useState('');
  const [songNotes, setSongNotes] = useState('');
  const [songSaving, setSongSaving] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [showSongForm, setShowSongForm] = useState(false);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  
  const [videoPlayingId, setVideoPlayingId] = useState<string | null>(null);
  const [copyingSongId, setCopyingSongId] = useState<string | null>(null);

  // -- EFEITOS --

  // 1. Monitora Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email
        });
      } else {
        setUser(null);
        setRepertoires([]);
        setSelected(null);
        setView('repertoires');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Carrega nomes dos usuários compartilhados (Repertório)
  useEffect(() => {
    const loadNames = async () => {
        if (selected?.repertoire?.sharedWith?.length) {
            try {
                const names = await getUserNames(selected.repertoire.sharedWith);
                setSharedNames(names);
            } catch (e) {
                console.error("Erro ao carregar nomes", e);
            }
        }
    };
    if (showShareUI && selected) loadNames();
  }, [showShareUI, selected]);

  // 3. Carrega repertórios e Times quando loga
  useEffect(() => {
    if (user) {
      reloadRepertoireList(user.uid);
      reloadTeamsList(user.uid);
    }
  }, [user]);

  // 4. Carrega nomes dos membros da equipe expandida
  useEffect(() => {
      const loadTeamMemberNames = async () => {
          if (expandedTeamId) {
              const team = teamsList.find(t => t.id === expandedTeamId);
              if (team && team.members.length > 0) {
                  const names = await getUserNames(team.members);
                  setTeamMembersNames(names);
              }
          }
      };
      loadTeamMemberNames();
  }, [expandedTeamId, teamsList]);


  // -- FUNÇÕES AUXILIARES --
  
  function getYoutubeVideoId(url: string | undefined): string | null {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|\w+\/|embed\/|v\/|shorts\/|watch\?.*v=))([^&"'\?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async function reloadRepertoireList(uid?: string) {
    const currentUid = uid || user?.uid;
    if (!currentUid) return;
    try {
      const reps = await getAllRepertoires(currentUid);
      setRepertoires(reps);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function reloadTeamsList(uid?: string) {
      const currentUid = uid || user?.uid;
      if (!currentUid) return;
      try {
          const teams = await getMyTeams(currentUid);
          setTeamsList(teams);
          setMyTeams(teams); 
      } catch (e) {
          console.error(e);
      }
  }

  async function reloadRepertoire(id: string) {
    if (user) {
        try {
            const data = await getRepertoireWithSongs(id, user.uid);
            setSelected(data);
        } catch (e: any) {
            setError(e.message);
        }
    }
  }

  // -- HANDLERS DE AÇÃO GERAIS --

  const handleLogin = async () => {
    try { await signInWithGoogle(); } catch (e: any) { setError(e.message); }
  };
  const handleLogout = async () => {
    try { await logout(); } catch (e: any) { setError(e.message); }
  };

  // -- HANDLERS DE REPERTÓRIO --

  async function handleSelectRepertoire(id: string) {
    try {
      setLoading(true);
      await reloadRepertoire(id);
      setEditingId(null);
      resetSongForm();
      setShowSongForm(false);
      setShowRepForm(false);
      setVideoPlayingId(null);
      setShowShareUI(false); 
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRepertoire(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    try {
      setCreating(true);
      let id: string;
      if (editingId) {
        await updateRepertoire(editingId, newName.trim(), newVocal.trim());
        id = editingId;
      } else {
        id = await createRepertoire(user.uid, newName.trim(), newVocal.trim());
      }
      await reloadRepertoireList(user.uid);
      
      // Se estava apenas criando na lista, não faz nada extra. Se estava editando o selecionado, recarrega.
      if (selected && selected.repertoire.id === id) {
          await reloadRepertoire(id);
      }
      
      setNewName(''); setNewVocal(''); setEditingId(null); setShowRepForm(false);
    } catch (e: any) { setError(e.message); } finally { setCreating(false); }
  }

  function handleStartEdit() {
    if (!selected) return;
    setEditingId(selected.repertoire.id);
    setNewName(selected.repertoire.name || '');
    setNewVocal(selected.repertoire.defaultVocalistName || '');
    setShowRepForm(true);
    setView('repertoires'); 
    setSelected(null); 
  }

  function handleCancelEdit() {
    setEditingId(null);
    setNewName('');
    setNewVocal('');
    setShowRepForm(false);
  }

  async function handleDeleteSelected() {
    if (!selected) return;
    if (!window.confirm('Tem certeza?')) return;
    try {
      await deleteRepertoire(selected.repertoire.id);
      await reloadRepertoireList();
      setSelected(null);
    } catch (e: any) { setError(e.message); }
  }

  async function handleLeaveRepertoire(repertoireId: string) {
    if (!user || !window.confirm('Sair deste repertório?')) return;
    try {
      await leaveRepertoire(repertoireId, user.uid);
      await reloadRepertoireList(); 
      if (selected?.repertoire?.id === repertoireId) setSelected(null);
    } catch (e: any) { alert(e.message); }
  }

  async function handleToggleFavorite() {
    if (!selected) return;
    await setRepertoireFavorite(selected.repertoire.id, !selected.repertoire.isFavorite);
    setSelected(prev => prev ? {...prev, repertoire: {...prev.repertoire, isFavorite: !prev.repertoire.isFavorite}} : null);
    await reloadRepertoireList();
  }

  function handleNewRepertoireClick() {
    setEditingId(null);
    setNewName('');
    setNewVocal('');
    setShowRepForm(true);
  }

  // -- HANDLER DE PDF --
  function handleExportPDF() {
    if (!selected) return;
    try {
        exportRepertoireToPDF(selected.repertoire, selected.songs);
    } catch (e: any) {
        alert("Erro ao gerar PDF: " + e.message);
    }
  }

  // -- HANDLERS DE EQUIPES --

  async function handleCreateTeam(e: FormEvent) {
      e.preventDefault();
      if (!newTeamName.trim() || !user) return;
      try {
          await createTeam(newTeamName.trim(), user.uid);
          setNewTeamName('');
          await reloadTeamsList();
      } catch (e: any) { alert('Erro ao criar equipe: ' + e.message); }
  }

  async function handleDeleteTeam(teamId: string) {
      if (!window.confirm('Excluir esta equipe?')) return;
      try {
          await deleteTeam(teamId);
          await reloadTeamsList();
          if (expandedTeamId === teamId) setExpandedTeamId(null);
      } catch (e: any) { alert('Erro: ' + e.message); }
  }

  async function handleAddMemberToTeam(teamId: string) {
      if (!teamMemberInput.trim()) return;
      try {
          await addMemberToTeam(teamId, teamMemberInput.trim());
          setTeamMemberInput('');
          await reloadTeamsList(); 
      } catch (e: any) { alert('Erro: ' + e.message); }
  }

  async function handleRemoveMemberFromTeam(teamId: string, memberUid: string) {
      if (!window.confirm('Remover membro?')) return;
      try {
          await removeMemberFromTeam(teamId, memberUid);
          await reloadTeamsList();
      } catch (e: any) { alert('Erro: ' + e.message); }
  }

  // -- HANDLERS DE COMPARTILHAMENTO (Com Suporte a Times) --

  async function handleShareRepertoire() {
      if (!selected || !shareUidInput.trim()) return;
      try {
          await shareRepertoireWithUser(selected.repertoire.id, shareUidInput.trim());
          alert('Adicionado!');
          setShareUidInput('');
          await reloadRepertoire(selected.repertoire.id);
      } catch (e: any) { alert('Erro: ' + e.message); }
  }

  async function handleShareWithTeam(teamId: string) {
      if (!selected) return;
      if (!window.confirm('Adicionar todos os membros desta equipe ao repertório?')) return;
      try {
          const members = await getTeamMembers(teamId);
          if (members.length === 0) {
              alert('Esta equipe não tem membros.');
              return;
          }
          
          for (const uid of members) {
              if (!selected.repertoire.sharedWith?.includes(uid)) {
                  await shareRepertoireWithUser(selected.repertoire.id, uid);
              }
          }
          alert(`Membros adicionados com sucesso!`);
          await reloadRepertoire(selected.repertoire.id);
      } catch (e: any) {
          alert('Erro ao compartilhar com equipe: ' + e.message);
      }
  }

  async function handleUnshareRepertoire(uidToRemove: string) {
      if (!selected || !window.confirm('Remover acesso?')) return;
      try {
          await unshareRepertoireWithUser(selected.repertoire.id, uidToRemove);
          await reloadRepertoire(selected.repertoire.id);
      } catch (e: any) { alert('Erro: ' + e.message); }
  }

  // -- MÚSICAS --
  function resetSongForm() {
    setSongTitle(''); setSongKey(''); setSongVocal(''); setSongYoutube(''); setSongChord(''); setSongNotes(''); setEditingSongId(null);
  }
  
  function handleNewSongClick() {
    resetSongForm();
    setShowSongForm(true);
  }

  function handleCancelSongEdit() {
    resetSongForm();
    setShowSongForm(false);
  }

  function handleEditSong(song: any) {
    setEditingSongId(song.id);
    setSongTitle(song.title || '');
    setSongKey(song.key || '');
    setSongVocal(song.vocalistName || '');
    setSongYoutube(song.youtubeUrl || '');
    setSongChord(song.chordUrl || '');
    setSongNotes(song.notes || '');
    setShowSongForm(true);
  }

  async function handleSaveSong(e: FormEvent) {
    e.preventDefault();
    if (!selected || !songTitle.trim()) return;
    try {
      setSongSaving(true);
      const repId = selected.repertoire.id;
      const baseSong = { title: songTitle.trim(), key: songKey.trim(), vocalistName: songVocal.trim(), youtubeUrl: songYoutube.trim(), chordUrl: songChord.trim(), notes: songNotes.trim() };
      if (editingSongId) await updateSongInRepertoire(repId, editingSongId, baseSong);
      else await addSongToRepertoire(repId, { ...baseSong, order: (selected.songs[selected.songs.length - 1]?.order || 0) + 1 });
      await reloadRepertoire(repId);
      resetSongForm(); setShowSongForm(false);
    } catch (e: any) { setError(e.message); } finally { setSongSaving(false); }
  }
  
  async function handleDeleteSong(songId: string) {
    if (!selected || !window.confirm('Excluir?')) return;
    try { setLoading(true); await deleteSongFromRepertoire(selected.repertoire.id, songId); await reloadRepertoire(selected.repertoire.id); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  
  async function handleYoutubeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value; setSongYoutube(url); 
    if (!songTitle.trim() && url.trim()) { const title = await fetchYoutubeTitle(url); if (title) setSongTitle(title); }
  }
  
  async function handleChordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value; setSongChord(url); 
    if (!songTitle.trim() && url.trim()) { const title = await fetchChordTitle(url); if (title) setSongTitle(title); }
  }
  
  function handleCopyClick(songId: string) { setCopyingSongId((prev) => (prev === songId ? null : songId)); }
  
  async function handlePerformCopy(songId: string, targetRepertoireId: string) {
    if (!selected || !window.confirm('Copiar música?')) return;
    try {
      const sourceSong = selected.songs.find(s => s.id === songId);
      if (!sourceSong) return;
      await addSongToRepertoire(targetRepertoireId, { title: sourceSong.title, key: sourceSong.key, vocalistName: sourceSong.vocalistName, youtubeUrl: sourceSong.youtubeUrl, chordUrl: sourceSong.chordUrl, notes: sourceSong.notes, order: 9999 });
      if (targetRepertoireId === selected.repertoire.id) await reloadRepertoire(targetRepertoireId);
      else await reloadRepertoireList();
      alert('Copiado!'); setCopyingSongId(null);
    } catch (e: any) { setError("Erro: " + e.message); }
  }
  
  async function persistReorderedSongs(newSongs: any[]) {
    if (!selected?.repertoire.isOwner) return;
    const repId = selected.repertoire.id;
    const songsWithOrder = newSongs.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSelected((prev) => (prev ? { ...prev, songs: songsWithOrder } : prev));
    await updateSongsOrder(repId, songsWithOrder.map((s) => ({ id: s.id, order: s.order })));
  }
  
  function handleDragStart(index: number) { if (selected?.repertoire.isOwner) setDragIndex(index); }
  
  async function handleDrop(targetIndex: number) {
    if (!selected?.repertoire.isOwner || dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const newSongs = [...selected.songs];
    const [moved] = newSongs.splice(dragIndex, 1);
    newSongs.splice(targetIndex, 0, moved);
    setDragIndex(null);
    await persistReorderedSongs(newSongs);
  }

  function toggleExpandedSong(id: string) {
    setExpandedSongId((prev) => (prev === id ? null : id));
    if (id === expandedSongId) {
        setVideoPlayingId(null);
        setCopyingSongId(null);
    }
  }

  // --- RENDERIZAÇÃO ---
  
  const sortedRepertoires = repertoires
    .filter(r => (r.name + ' ' + r.defaultVocalistName).toLowerCase().includes(searchTerm.trim().toLowerCase()))
    .sort((a, b) => (Number(!!b.isFavorite) - Number(!!a.isFavorite)) || a.name.localeCompare(b.name));
  
  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;
  const isOwner = !!selected?.repertoire?.isOwner; 
  const availableTargetRepertoires = repertoires.filter(r => r.id !== selected?.repertoire.id && r.isOwner);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#111', color: 'white', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <h1>MySetList</h1>
        <button onClick={handleLogin} style={{ padding: '10px 20px', background: '#4285F4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Login com Google</button>
      </div>
    );
  }

return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#111', color: 'white', width: '100%' }}>
      
      {/* HEADER */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <div>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>MySetList</span>
            <div style={{ fontSize: '12px', color: '#bbb' }}>{user.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <span style={{ fontSize: '10px', color: '#666', background: '#222', padding: '2px 4px', borderRadius: 4 }}>UID: {user.uid}</span>
                <button onClick={() => navigator.clipboard.writeText(user.uid)} style={{ padding: '2px 6px', fontSize: '9px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Copiar</button>
            </div>
        </div>
        <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Sair</button>
      </div>

      {/* NAVEGAÇÃO SUPERIOR (Se não estiver editando repertório) */}
      {!selected && (
          <div style={{display: 'flex', borderBottom: '1px solid #333'}}>
              <button 
                onClick={() => setView('repertoires')} 
                style={{flex: 1, padding: 12, background: view === 'repertoires' ? '#333' : 'transparent', color: 'white', border: 'none', cursor: 'pointer'}}
              >
                  Repertórios
              </button>
              <button 
                onClick={() => setView('teams')} 
                style={{flex: 1, padding: 12, background: view === 'teams' ? '#333' : 'transparent', color: 'white', border: 'none', cursor: 'pointer'}}
              >
                  Minhas Equipes
              </button>
          </div>
      )}

      {/* --- TELA DE REPERTÓRIOS --- */}
      {view === 'repertoires' && !selected && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 8 }}><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} placeholder="Filtrar..." /></div>
          
          <button type="button" onClick={handleNewRepertoireClick} style={{ width: '100%', padding: '8px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 16 }}>Novo repertório</button>

          {(showRepForm || editingId) && (
            <form onSubmit={handleSaveRepertoire} style={{ marginBottom: 16, padding: 12, background: '#222', borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}><label style={{display:'block',fontSize:12}}>Nome</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              <div style={{ marginBottom: 8 }}><label style={{display:'block',fontSize:12}}>Vocalista</label><input type="text" value={newVocal} onChange={(e) => setNewVocal(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              <div style={{display:'flex', gap:8}}>
                <button type="submit" disabled={creating} style={{ flex:1, padding: '6px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4 }}>Salvar</button>
                <button type="button" onClick={handleCancelEdit} style={{ flex:1, padding: '6px', background: '#777', color: 'white', border: 'none', borderRadius: 4 }}>Cancelar</button>
              </div>
            </form>
          )}

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sortedRepertoires.map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleSelectRepertoire(r.id)} style={{ flex: 1, textAlign: 'left', padding: '10px', background: '#222', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div>
                          <strong>{r.name}</strong>
                          {r.defaultVocalistName ? <span style={{ opacity: 0.7 }}> — {r.defaultVocalistName}</span> : ''}
                          {!r.isOwner && <span style={{fontSize: '10px', marginLeft: '8px', color: '#4fc3f7', border: '1px solid #4fc3f7', padding: '1px 3px', borderRadius: '3px'}}>COMPARTILHADO</span>}
                      </div>
                      {r.isFavorite && <span style={{ fontSize: 12, color: '#ffd54f' }}>★</span>}
                    </button>
                    {!r.isOwner && (
                        <button 
                            onClick={() => handleLeaveRepertoire(r.id)} 
                            title="Sair do repertório"
                            style={{ padding: '0 12px', background: '#333', color: '#f44336', border: '1px solid #444', borderRadius: 4, cursor: 'pointer', fontSize: '18px' }}
                        >
                            ×
                        </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- TELA DE EQUIPES --- */}
      {view === 'teams' && !selected && (
          <div style={{ padding: 16 }}>
              <h3>Gerenciar Equipes</h3>
              <p style={{fontSize: 12, color: '#888', marginBottom: 16}}>Crie equipes para agrupar pessoas e compartilhar repertórios mais rápido.</p>

              <form onSubmit={handleCreateTeam} style={{display: 'flex', gap: 8, marginBottom: 20}}>
                  <input type="text" placeholder="Nome da nova equipe (ex: Louvor)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} style={{flex: 1, padding: 8, color: '#333'}} />
                  <button type="submit" style={{padding: '8px 16px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Criar</button>
              </form>

              {teamsList.length === 0 && <p>Você ainda não tem equipes.</p>}

              <ul style={{listStyle: 'none', padding: 0}}>
                  {teamsList.map(team => (
                      <li key={team.id} style={{background: '#1a1a1a', padding: 12, borderRadius: 6, marginBottom: 10}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}>
                              <strong>{team.name} <span style={{fontSize: 12, fontWeight: 'normal', color: '#888'}}>({team.members.length} membros)</span></strong>
                              <span>{expandedTeamId === team.id ? '▲' : '▼'}</span>
                          </div>
                          
                          {expandedTeamId === team.id && (
                              <div style={{marginTop: 10, borderTop: '1px solid #333', paddingTop: 10}}>
                                  {/* Lista de Membros */}
                                  <ul style={{marginBottom: 10, paddingLeft: 20}}>
                                      {team.members.map(memberUid => (
                                          <li key={memberUid} style={{fontSize: 13, marginBottom: 4}}>
                                              {teamMembersNames[memberUid] || memberUid}
                                              <button onClick={() => handleRemoveMemberFromTeam(team.id, memberUid)} style={{marginLeft: 10, color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10}}>Remover</button>
                                          </li>
                                      ))}
                                      {team.members.length === 0 && <li style={{color: '#666', fontSize: 12}}>Nenhum membro ainda.</li>}
                                  </ul>

                                  {/* Adicionar Membro */}
                                  <div style={{display: 'flex', gap: 5, marginBottom: 10}}>
                                      <input type="text" placeholder="Cole o UID do membro" value={teamMemberInput} onChange={e => setTeamMemberInput(e.target.value)} style={{flex: 1, padding: 5, fontSize: 12, color: '#333'}} />
                                      <button onClick={() => handleAddMemberToTeam(team.id)} style={{background: '#4caf50', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer'}}>Add</button>
                                  </div>

                                  <button onClick={() => handleDeleteTeam(team.id)} style={{fontSize: 11, color: '#f44336', background: 'none', border: '1px solid #f44336', padding: '4px 8px', borderRadius: 4, cursor: 'pointer'}}>Excluir Equipe</button>
                              </div>
                          )}
                      </li>
                  ))}
              </ul>
          </div>
      )}

      {/* --- DETALHES DO REPERTÓRIO (COM MÚSICAS) --- */}
      {selected && (
        <div style={{ padding: 24, width: '100%' }}>
          <button onClick={() => { setSelected(null); setShowRepForm(false); setEditingId(null); }} style={{ marginBottom: 16, padding: '8px 12px', background: '#777', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>← Voltar</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <h2>{selected.repertoire.name}</h2>
            {isOwner ? (
                <>
                    <button onClick={handleStartEdit} style={{ padding: '4px 8px', fontSize: 12, background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Editar</button>
                    <button onClick={handleDeleteSelected} style={{ padding: '4px 8px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Excluir</button>
                    <button onClick={() => setShowShareUI(!showShareUI)} style={{ padding: '4px 8px', fontSize: 12, background: '#9c27b0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Compartilhar</button>
                </>
            ) : <span style={{ fontSize: '12px', color: '#4fc3f7', border: '1px solid #4fc3f7', padding: '2px 5px' }}>MODO LEITURA</span>}
            <button onClick={handleExportPDF} style={{ padding: '4px 8px', fontSize: 12, background: '#ff5722', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Exportar PDF</button>
            <button onClick={handleToggleFavorite} style={{ padding: '4px 8px', fontSize: 12, background: selectedIsFavorite ? '#ffa000' : '#555', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{selectedIsFavorite ? '★' : '☆'}</button>
          </div>
          <p style={{marginBottom: '10px', color: '#ccc'}}>Vocal: {selected.repertoire.defaultVocalistName}</p>

          {/* UI DE COMPARTILHAMENTO EXPANDIDA */}
          {showShareUI && isOwner && (
              <div style={{ marginBottom: 20, padding: 15, border: '1px solid #555', borderRadius: 6, background: '#1e1e1e' }}>
                  <h4>Gerenciar Acesso</h4>
                  
                  {/* Adicionar Individual */}
                  <div style={{display: 'flex', gap: 5, marginBottom: 15}}>
                    <input type="text" placeholder="UID do usuário" value={shareUidInput} onChange={(e) => setShareUidInput(e.target.value)} style={{flex: 1, padding: 5, color: '#333'}} />
                    <button onClick={handleShareRepertoire} style={{padding: '5px 10px', background: '#4caf50', border: 'none', color: 'white', cursor: 'pointer'}}>Add UID</button>
                  </div>

                  {/* Adicionar Equipe (NOVO) */}
                  {myTeams.length > 0 && (
                      <div style={{marginBottom: 15, padding: 10, background: '#2a2a2a', borderRadius: 4}}>
                          <span style={{fontSize: 12, color: '#aaa', display: 'block', marginBottom: 5}}>Ou adicione uma equipe inteira:</span>
                          <div style={{display: 'flex', gap: 5, flexWrap: 'wrap'}}>
                              {myTeams.map(team => (
                                  <button key={team.id} onClick={() => handleShareWithTeam(team.id)} style={{fontSize: 11, padding: '4px 8px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer'}}>
                                      + {team.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
                  
                  {/* Lista de quem já tem acesso */}
                  <div style={{maxHeight: 150, overflowY: 'auto'}}>
                      {selected.repertoire.sharedWith && selected.repertoire.sharedWith.length > 0 ? (
                          <ul style={{fontSize: '12px', paddingLeft: 15, margin: 0}}>
                              {selected.repertoire.sharedWith.map(uid => (
                                  <li key={uid} style={{marginBottom: 5}}>
                                      {sharedNames[uid] || uid} 
                                      <button onClick={() => handleUnshareRepertoire(uid)} style={{marginLeft: 10, color: 'red', background: 'none', border: 'none', cursor: 'pointer'}}>X</button>
                                  </li>
                              ))}
                          </ul>
                      ) : <p style={{fontSize: '12px', color: '#888'}}>Privado.</p>}
                  </div>
              </div>
          )}

          <h3 style={{ marginTop: 24, borderBottom: '1px solid #333', paddingBottom: 5 }}>Músicas</h3>
          {isOwner && <button type="button" onClick={handleNewSongClick} style={{ marginTop: 10, padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>+ Adicionar Música</button>}

          {(showSongForm || editingSongId) && (
            <form onSubmit={handleSaveSong} style={{ marginTop: 16, marginBottom: 16, padding: 12, borderRadius: 8, background: '#222' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '150px' }}><label style={{display:'block',fontSize:12}}>Título</label><input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={{display:'block',fontSize:12}}>Tom</label><input type="text" value={songKey} onChange={(e) => setSongKey(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={{display:'block',fontSize:12}}>Vocal</label><input type="text" value={songVocal} onChange={(e) => setSongVocal(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                 <div style={{ flex: 1 }}><label style={{display:'block',fontSize:12}}>YouTube</label><input type="text" value={songYoutube} onChange={handleYoutubeChange} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                 <div style={{ flex: 1 }}><label style={{display:'block',fontSize:12}}>Cifra</label><input type="text" value={songChord} onChange={handleChordChange} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              </div>
              <div style={{ marginBottom: 8 }}><label style={{display:'block',fontSize:12}}>Notas</label><textarea value={songNotes} onChange={(e) => setSongNotes(e.target.value)} style={{ width: '100%', padding: 6, minHeight: 60, color: '#333' }} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={songSaving} style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4 }}>Salvar</button>
                <button type="button" onClick={handleCancelSongEdit} style={{ padding: '6px 12px', background: '#777', color: 'white', border: 'none', borderRadius: 4 }}>Cancelar</button>
              </div>
            </form>
          )}

          <ol style={{marginTop: 20}}>
            {selected.songs.map((s: any, index: number) => {
                const isCopying = copyingSongId === s.id;
                return (
              <li key={s.id} style={{ marginBottom: 8, padding: 10, borderRadius: 6, background: '#1a1a1a' }} draggable={isOwner} onDragStart={() => handleDragStart(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(index)}>
                <div style={{ cursor: 'pointer' }} onClick={() => toggleExpandedSong(s.id)}>
                    <div style={{ fontWeight: 'bold' }}>#{s.order} – {s.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, fontSize: 14 }}>
                        <span>Tom: {s.key} | Vocal: {s.vocalistName || selected.repertoire.defaultVocalistName}</span>
                        <span>{expandedSongId === s.id ? '▲' : '▼'}</span>
                    </div>
                </div>

                {expandedSongId === s.id && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{display:'flex', gap:5, justifyContent: 'flex-end', marginBottom: 10}}>
                        <button onClick={() => handleCopyClick(s.id)} style={{fontSize:11, padding:'4px 8px', background: isCopying ? '#ff9800' : '#4caf50', border:'none', borderRadius:4, color:'white'}}>{isCopying ? 'Cancelar' : 'Copiar'}</button>
                        {isOwner && <><button onClick={() => handleEditSong(s)} style={{fontSize:11, padding:'4px 8px', background:'#2196f3', border:'none', borderRadius:4, color:'white'}}>Editar</button>
                        <button onClick={() => handleDeleteSong(s.id)} style={{fontSize:11, padding:'4px 8px', background:'#f44336', border:'none', borderRadius:4, color:'white'}}>Excluir</button></>}
                    </div>

                    {isCopying && <div style={{background:'#333', padding:10, borderRadius:4, marginBottom:10}}><p style={{fontSize:12, margin:0, marginBottom:5}}>Copiar para:</p>{availableTargetRepertoires.map(r => <button key={r.id} onClick={() => handlePerformCopy(s.id, r.id)} style={{display:'block', width:'100%', textAlign:'left', padding:5, background:'#444', border:'none', color:'white', marginBottom:2}}>{r.name}</button>)}</div>}
                    
                    {s.youtubeUrl && <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:5}}><span style={{fontSize:12}}>YouTube</span><button onClick={() => setVideoPlayingId(prev => prev === getYoutubeVideoId(s.youtubeUrl) ? null : getYoutubeVideoId(s.youtubeUrl))} style={{padding:'2px 6px', fontSize:10}}>Play</button></div>}
                    {videoPlayingId === getYoutubeVideoId(s.youtubeUrl) && <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${videoPlayingId}?autoplay=1`} frameBorder="0" allowFullScreen style={{marginBottom:10}}></iframe>}
                    
                    {s.chordUrl && <div><a href={s.chordUrl} target="_blank" rel="noreferrer" style={{color:'#ffcc80'}}>Ver Cifra</a></div>}
                    {s.notes && <div style={{marginTop:5, color:'#ddd', fontSize:14}}>{s.notes}</div>}
                  </div>
                )}
              </li>
            )})}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;