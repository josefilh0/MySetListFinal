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
  leaveRepertoire // <--- NOVA IMPORTAÇÃO
} from './services/repertoireService';
import { signInWithGoogle, logout, onAuthStateChanged } from './services/authService';
import type { RepertoireSummary } from './services/repertoireService';

// Importando o novo serviço (necessário para o auto-fill)
import { fetchYoutubeTitle, fetchChordTitle } from './services/metadataService'; 

type Repertoire = RepertoireSummary;

type RepertoireWithSongs = {
  repertoire: RepertoireSummary & { sharedWith?: string[] };
  songs: any[];
};

function App() {
  // ESTADOS GERAIS
  const [user, setUser] = useState<any | null>(null); 
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [selected, setSelected] = useState<RepertoireWithSongs | null>(null);
  
  // Variáveis prefixadas com '_' para ignorar o aviso de "unused"
  const [_loading, setLoading] = useState(false); 
  const [_error, setError] = useState<string | null>(null); 
  
  // ESTADOS DE UI
  const [showRepertoireList, setShowRepertoireList] = useState(true);
  const [showRepForm, setShowRepForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ESTADOS DE FORMULÁRIO (Repertório)
  const [newName, setNewName] = useState('');
  const [newVocal, setNewVocal] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ESTADOS DE COMPARTILHAMENTO
  const [shareUidInput, setShareUidInput] = useState('');
  const [showShareUI, setShowShareUI] = useState(false);
  const [sharedNames, setSharedNames] = useState<Record<string, string>>({});

  // ESTADOS DE FORMULÁRIO (Música)
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
        setShowRepertoireList(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Carrega nomes dos usuários compartilhados
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

    if (showShareUI && selected) {
        loadNames();
    }
  }, [showShareUI, selected]);

  // 3. Carrega repertórios quando o usuário muda/loga
  useEffect(() => {
    if (user) {
      reloadRepertoireList(user.uid);
    }
  }, [user]);

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
      setRepertoires([]);
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

  // -- HANDLERS DE AÇÃO --

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
    } catch (e: any) {
      setError(e.message);
    }
  };

  async function handleSelectRepertoire(id: string) {
    try {
      setLoading(true);
      setError(null);
      await reloadRepertoire(id);
      setEditingId(null);
      resetSongForm();
      setShowSongForm(false);
      setShowRepForm(false);
      setShowRepertoireList(false);
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
      setError(null);
      let id: string;

      if (editingId) {
        await updateRepertoire(editingId, newName.trim(), newVocal.trim());
        id = editingId;
      } else {
        id = await createRepertoire(user.uid, newName.trim(), newVocal.trim());
      }

      await reloadRepertoireList(user.uid);
      
      if (!showRepertoireList) {
          await reloadRepertoire(id);
      }
      
      setNewName('');
      setNewVocal('');
      setEditingId(null);
      setShowRepForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleStartEdit() {
    if (!selected) return;
    const rep = selected.repertoire;
    setEditingId(rep.id);
    setNewName(rep.name || '');
    setNewVocal(rep.defaultVocalistName || '');
    setShowRepForm(true);
    setShowRepertoireList(true);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setNewName('');
    setNewVocal('');
    setShowRepForm(false);
  }

  async function handleDeleteSelected() {
    if (!selected) return;
    if (!window.confirm('Tem certeza que deseja excluir este repertório?')) return;

    try {
      setLoading(true);
      await deleteRepertoire(selected.repertoire.id);
      await reloadRepertoireList();
      
      setSelected(null);
      setShowRepertoireList(true);
      setEditingId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // --- NOVA FUNÇÃO: Sair do Repertório ---
  async function handleLeaveRepertoire(repertoireId: string) {
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja sair deste repertório compartilhado?')) return;

    try {
      setLoading(true);
      await leaveRepertoire(repertoireId, user.uid);
      await reloadRepertoireList(); // Atualiza a lista para sumir o repertório
      
      // Se estivesse com ele aberto, fecha
      if (selected?.repertoire?.id === repertoireId) {
          setSelected(null);
          setShowRepertoireList(true);
      }
    } catch (e: any) {
      alert('Erro ao sair do repertório: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite() {
    if (!selected) return;
    try {
      await setRepertoireFavorite(selected.repertoire.id, !selected.repertoire.isFavorite);
      setSelected(prev => prev ? {...prev, repertoire: {...prev.repertoire, isFavorite: !prev.repertoire.isFavorite}} : null);
      await reloadRepertoireList();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function handleNewRepertoireClick() {
    setEditingId(null);
    setNewName('');
    setNewVocal('');
    setShowRepForm(true);
  }

  // -- HANDLERS DE COMPARTILHAMENTO --

  async function handleShareRepertoire() {
      if (!selected || !shareUidInput.trim()) return;
      try {
          await shareRepertoireWithUser(selected.repertoire.id, shareUidInput.trim());
          alert('Compartilhado com sucesso!');
          setShareUidInput('');
          await reloadRepertoire(selected.repertoire.id);
      } catch (e: any) {
          alert('Erro ao compartilhar: ' + e.message);
      }
  }

  async function handleUnshareRepertoire(uidToRemove: string) {
      if (!selected) return;
      if (!window.confirm('Remover acesso deste usuário?')) return;
      try {
          await unshareRepertoireWithUser(selected.repertoire.id, uidToRemove);
          await reloadRepertoire(selected.repertoire.id);
      } catch (e: any) {
          alert('Erro ao remover acesso: ' + e.message);
      }
  }

  // -- MÚSICAS --

  function resetSongForm() {
    setSongTitle('');
    setSongKey('');
    setSongVocal('');
    setSongYoutube('');
    setSongChord('');
    setSongNotes('');
    setEditingSongId(null);
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
      const baseSong = {
        title: songTitle.trim(),
        key: songKey.trim(),
        vocalistName: songVocal.trim(),
        youtubeUrl: songYoutube.trim(),
        chordUrl: songChord.trim(),
        notes: songNotes.trim(),
      };

      if (editingSongId) {
        await updateSongInRepertoire(repId, editingSongId, baseSong);
      } else {
        const nextOrder = (selected.songs[selected.songs.length - 1]?.order || 0) + 1;
        await addSongToRepertoire(repId, { ...baseSong, order: nextOrder });
      }

      await reloadRepertoire(repId);
      resetSongForm();
      setShowSongForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSongSaving(false);
    }
  }

  async function handleDeleteSong(songId: string) {
    if (!selected) return;
    if (!window.confirm('Excluir esta música?')) return;

    try {
      setLoading(true);
      await deleteSongFromRepertoire(selected.repertoire.id, songId);
      await reloadRepertoire(selected.repertoire.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // HANDLERS PARA AUTO-COMPLETAR
  async function handleYoutubeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    setSongYoutube(url); 
    
    if (!songTitle.trim() && url.trim()) {
        const title = await fetchYoutubeTitle(url); 
        if (title) {
            setSongTitle(title); 
        }
    }
  }

  async function handleChordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    setSongChord(url); 
    
    if (!songTitle.trim() && url.trim()) {
        const title = await fetchChordTitle(url);
        if (title) {
            setSongTitle(title); 
        }
    }
  }

  // -- COPIAR MÚSICA --
  function handleCopyClick(songId: string) {
    setCopyingSongId((prev) => (prev === songId ? null : songId)); 
  }

  async function handlePerformCopy(songId: string, targetRepertoireId: string) {
    if (!selected) return;

    const sourceSong = selected.songs.find(s => s.id === songId);
    if (!sourceSong) return;

    if (!window.confirm(`Tem certeza que deseja copiar a música "${sourceSong.title}" para o repertório de destino?`)) return;

    try {
      setLoading(true);
      setError(null);

      const baseSong = {
        title: sourceSong.title,
        key: sourceSong.key,
        vocalistName: sourceSong.vocalistName,
        youtubeUrl: sourceSong.youtubeUrl,
        chordUrl: sourceSong.chordUrl,
        notes: sourceSong.notes,
      };

      await addSongToRepertoire(targetRepertoireId, { ...baseSong, order: 9999 });

      if (targetRepertoireId === selected.repertoire.id) {
          await reloadRepertoire(targetRepertoireId);
      } else {
          await reloadRepertoireList();
      }

    } catch (e: any) {
      setError("Erro ao copiar: " + e.message);
    } finally {
      setLoading(false);
      setCopyingSongId(null); 
      alert(`Música copiada com sucesso!`);
    }
  }

  // -- PLAYER DE VÍDEO --
  function handleToggleVideo(song: any) {
    const videoId = getYoutubeVideoId(song.youtubeUrl);
    if (!videoId) return;
    
    setVideoPlayingId((prev) => (prev === videoId ? null : videoId));
  }


  // -- DRAG AND DROP --
  async function persistReorderedSongs(newSongs: any[]) {
    if (!selected) return;
    if (!selected.repertoire.isOwner) return;

    const repId = selected.repertoire.id;
    const songsWithOrder = newSongs.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSelected((prev) => (prev ? { ...prev, songs: songsWithOrder } : prev));
    await updateSongsOrder(repId, songsWithOrder.map((s) => ({ id: s.id, order: s.order })));
  }
  
  function handleDragStart(index: number) {
    if (!selected?.repertoire.isOwner) return;
    setDragIndex(index);
  }

  async function handleDrop(targetIndex: number) {
    if (!selected?.repertoire.isOwner) return;

    if (dragIndex === null || !selected || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
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

  // -- RENDERIZAÇÃO --

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRepertoires = repertoires.filter((r) => {
    if (!normalizedSearch) return true;
    const text = (r.name || '') + ' ' + (r.defaultVocalistName || '');
    return text.toLowerCase().includes(normalizedSearch);
  });
  const sortedRepertoires = [...filteredRepertoires].sort((a, b) => {
    const favDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite);
    if (favDiff !== 0) return favDiff;
    return a.name.localeCompare(b.name);
  });
  
  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;
  const isOwner = !!selected?.repertoire?.isOwner; 

  const availableTargetRepertoires = repertoires.filter(r => r.id !== selected?.repertoire.id && r.isOwner);

  // LOGIN SCREEN
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#111', color: 'white', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <h1>MySetList</h1>
        <p style={{marginBottom: 20}}>Faça login para gerenciar seus repertórios.</p>
        <button onClick={handleLogin} style={{ padding: '10px 20px', background: '#4285F4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
            Login com Google
        </button>
        {_error && <p style={{ color: 'red', marginTop: 10 }}>Erro: {_error}</p>}
      </div>
    );
  }

  // MAIN SCREEN
return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#111', color: 'white', width: '100%' }}>
      
      {/* BARRA SUPERIOR */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <div style={{display:'flex', flexDirection:'column'}}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>MySetList</span>
            <span style={{ fontSize: '12px', color: '#bbb' }}>{user.email}</span>
            
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 6 }}>
                <span style={{ fontSize: '10px', color: '#666', background: '#222', padding: '3px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                    UID: {user.uid}
                </span>
                <button 
                    onClick={() => { 
                        navigator.clipboard.writeText(user.uid); 
                        alert('Seu UID foi copiado!'); 
                    }} 
                    style={{ 
                        padding: '3px 8px', fontSize: '10px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    Copiar
                </button>
            </div>
        </div>

        <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      {/* LISTA DE REPERTÓRIOS */}
      {showRepertoireList && (
        <div style={{ padding: 16, width: '100%' }}>
          <h2>Meus Repertórios</h2>
          <div style={{ marginBottom: 8 }}>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} placeholder="Filtrar..." />
          </div>
          <button type="button" onClick={handleNewRepertoireClick} style={{ width: '100%', padding: '6px 10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: showRepForm || editingId ? 8 : 16 }}>
            Novo repertório
          </button>

          {(showRepForm || editingId) && (
            <form onSubmit={handleSaveRepertoire} style={{ marginBottom: 16, padding: 12, background: '#222', borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Nome</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} placeholder="Ex: Culto Domingo" />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Vocalista</label>
                <input type="text" value={newVocal} onChange={(e) => setNewVocal(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} placeholder="Ex: Ana" />
              </div>
              <button type="submit" disabled={creating || !newName.trim()} style={{ width: '100%', padding: '6px 10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1, marginBottom: 4 }}>
                {creating ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar repertório'}
              </button>
              <button type="button" onClick={handleCancelEdit} style={{ width: '100%', padding: '6px 10px', background: '#777', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancelar</button>
            </form>
          )}

          {sortedRepertoires.length === 0 && <p style={{ marginTop: 8 }}>Nenhum repertório encontrado.</p>}
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
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
                    
                    {/* Botão de Sair (Apenas para convidados) */}
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

      {/* DETALHES DO REPERTÓRIO */}
      {!showRepertoireList && selected && (
        <div style={{ padding: 24, width: '100%' }}>
          <button onClick={() => { setSelected(null); setShowRepertoireList(true); }} style={{ marginBottom: 16, padding: '8px 12px', background: '#777', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            ← Voltar à Lista
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <h2>{selected.repertoire.name}</h2>
            {isOwner ? (
                <>
                    <button onClick={handleStartEdit} style={{ padding: '4px 8px', fontSize: 12, background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Editar</button>
                    <button onClick={handleDeleteSelected} style={{ padding: '4px 8px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Excluir</button>
                    <button onClick={() => setShowShareUI(!showShareUI)} style={{ padding: '4px 8px', fontSize: 12, background: '#9c27b0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Compartilhar</button>
                </>
            ) : (
                <>
                    <span style={{ fontSize: '12px', color: '#4fc3f7', border: '1px solid #4fc3f7', padding: '2px 5px' }}>MODO LEITURA</span>
                    <button onClick={() => handleLeaveRepertoire(selected.repertoire.id)} style={{ padding: '4px 8px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Sair do Repertório</button>
                </>
            )}
            <button onClick={handleToggleFavorite} style={{ padding: '4px 8px', fontSize: 12, background: selectedIsFavorite ? '#ffa000' : '#555', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{selectedIsFavorite ? '★' : '☆'}</button>
          </div>
          
          <p style={{marginBottom: '10px'}}>Vocalista: {selected.repertoire.defaultVocalistName}</p>

          {/* UI DE COMPARTILHAMENTO */}
          {showShareUI && isOwner && (
              <div style={{ marginBottom: 20, padding: 10, border: '1px solid #555', borderRadius: 6, background: '#1e1e1e' }}>
                  <h4>Gerenciar Compartilhamento</h4>
                  <div style={{display: 'flex', gap: 5, marginBottom: 10}}>
                    <input 
                        type="text" 
                        placeholder="Cole o UID do usuário aqui" 
                        value={shareUidInput}
                        onChange={(e) => setShareUidInput(e.target.value)}
                        style={{flex: 1, padding: 5, color: '#333'}}
                    />
                    <button onClick={handleShareRepertoire} style={{padding: '5px 10px', background: '#4caf50', border: 'none', color: 'white', cursor: 'pointer'}}>Adicionar</button>
                  </div>
                  
                  {selected.repertoire.sharedWith && selected.repertoire.sharedWith.length > 0 ? (
                      <ul style={{fontSize: '12px', paddingLeft: 15}}>
                          {selected.repertoire.sharedWith.map(uid => (
                              <li key={uid} style={{marginBottom: 5}}>
                                  {sharedNames[uid] || uid} 
                                  <button onClick={() => handleUnshareRepertoire(uid)} style={{marginLeft: 10, color: 'red', background: 'none', border: 'none', cursor: 'pointer'}}>Remover</button>
                              </li>
                          ))}
                      </ul>
                  ) : <p style={{fontSize: '12px', color: '#888'}}>Não compartilhado com ninguém.</p>}
              </div>
          )}

          {_error && <p style={{ color: 'red', marginTop: 10 }}>Erro: {_error}</p>}
          
          <h3 style={{ marginTop: 24 }}>Músicas</h3>
          
          {isOwner && (
            <button type="button" onClick={handleNewSongClick} style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 12 }}>Nova música</button>
          )}

          {(showSongForm || editingSongId) && (
            <form onSubmit={handleSaveSong} style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#222' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '150px' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Título</label><input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tom</label><input type="text" value={songKey} onChange={(e) => setSongKey(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Vocal</label><input type="text" value={songVocal} onChange={(e) => setSongVocal(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                 <div style={{ flex: 1, minWidth: '45%' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>YouTube</label><input type="text" value={songYoutube} onChange={handleYoutubeChange} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                 <div style={{ flex: 1, minWidth: '45%' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Cifra</label><input type="text" value={songChord} onChange={handleChordChange} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              </div>
              <div style={{ marginBottom: 8 }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Notas</label><textarea value={songNotes} onChange={(e) => setSongNotes(e.target.value)} style={{ width: '100%', padding: 6, minHeight: 60, color: '#333' }} /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" disabled={songSaving || !songTitle.trim()} style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: songSaving ? 'default' : 'pointer', opacity: songSaving ? 0.7 : 1, marginBottom: 8 }}>{songSaving ? 'Salvando...' : 'Salvar'}</button>
                <button type="button" onClick={handleCancelSongEdit} style={{ padding: '6px 12px', background: '#777', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}>Cancelar</button>
              </div>
            </form>
          )}

          <ol>
            {selected.songs.map((s: any, index: number) => {
                const isCopying = copyingSongId === s.id;
                return (
              <li key={s.id} style={{ marginBottom: 8, padding: 10, borderRadius: 6, background: '#1a1a1a' }} draggable={isOwner} onDragStart={() => handleDragStart(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(index)}>
                
                <div 
                  style={{ cursor: 'pointer', paddingBottom: expandedSongId === s.id ? 8 : 0, borderBottom: expandedSongId === s.id ? '1px solid #333' : 'none' }} 
                  onClick={() => toggleExpandedSong(s.id)}
                >
                    <div style={{ marginBottom: 4, fontWeight: 'bold' }}>
                        #{s.order} – {s.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8, fontSize: 14 }}>
                        <div style={{ flexGrow: 1 }}>
                            Tom: {s.key} | Vocal: {s.vocalistName || selected.repertoire.defaultVocalistName}
                        </div>
                        <div style={{ flexShrink: 0, fontSize: 18, lineHeight: 1 }}>
                            {expandedSongId === s.id ? '▲' : '▼'}
                        </div> 
                    </div>
                </div>

                {expandedSongId === s.id && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    
                    <button onClick={(e) => { e.stopPropagation(); handleCopyClick(s.id); }} style={{ padding: '4px 8px', fontSize: 11, background: isCopying ? '#ff9800' : '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        {isCopying ? 'Cancelar Cópia' : 'Copiar'}
                    </button>
                    
                    {isOwner && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); handleEditSong(s); }} style={{ padding: '4px 8px', fontSize: 11, background: '#2196f3', color: 'white', border: 'none', borderRadius: 4 }}>Editar</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSong(s.id); }} style={{ padding: '4px 8px', fontSize: 11, background: '#f44336', color: 'white', border: 'none', borderRadius: 4 }}>Excluir</button>
                        </>
                    )}
                  </div>
                )}
                
                {isCopying && (
                    <div style={{ marginTop: 10, padding: 10, background: '#2a2a2a', borderRadius: 4 }}>
                        <strong style={{ display: 'block', marginBottom: 8 }}>Copiar para:</strong>
                        {availableTargetRepertoires.length === 0 ? (
                            <p style={{ fontSize: 12 }}>Crie outro repertório para poder copiar músicas.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {availableTargetRepertoires.map(r => (
                                    <li key={r.id} style={{ marginBottom: 4 }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handlePerformCopy(s.id, r.id); }}
                                            style={{ width: '100%', textAlign: 'left', padding: '6px 10px', background: '#383838', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            {r.name} {r.defaultVocalistName ? `(${r.defaultVocalistName})` : ''}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {expandedSongId === s.id && (
                  <div style={{ marginTop: 10, fontSize: 14, color: '#ddd', paddingLeft: 4 }}>
                    
                    {s.youtubeUrl && (
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, borderTop: (isCopying ? 'none' : '1px dashed #333'), paddingTop: '8px' }}>
                            <span style={{flexShrink: 0}}>YouTube:</span>
                            <a href={s.youtubeUrl} target="_blank" rel="noreferrer" style={{ color: '#90caf9', flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Link</a>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleVideo(s); }} 
                                style={{ padding: '4px 8px', fontSize: 11, background: videoPlayingId === getYoutubeVideoId(s.youtubeUrl) ? '#ff9800' : '#4285F4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}
                            >
                                {videoPlayingId === getYoutubeVideoId(s.youtubeUrl) ? 'Fechar' : '▶ Tocar'}
                            </button>
                        </div>
                    )}
                    
                    {videoPlayingId === getYoutubeVideoId(s.youtubeUrl) && (
                        <div style={{ marginTop: 8, marginBottom: 8, background: '#000' }}>
                            <iframe
                                width="100%"
                                height="200"
                                src={`https://www.youtube.com/embed/${videoPlayingId}?autoplay=1`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={s.title}
                            ></iframe>
                        </div>
                    )}

                    {s.chordUrl && <div style={{ marginBottom: 4, borderTop: (!s.youtubeUrl && !isCopying ? '1px dashed #333' : 'none'), paddingTop: (!s.youtubeUrl && !isCopying ? '8px' : '0') }}>Cifra: <a href={s.chordUrl} target="_blank" rel="noreferrer" style={{ color: '#ffcc80' }}>Link</a></div>}
                    {s.notes && <div style={{ marginTop: 4 }}>Notas: <span>{s.notes}</span></div>}
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