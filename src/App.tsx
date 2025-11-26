import { useEffect, useState } from 'react';
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
} from './services/repertoireService';
import { signInWithGoogle, logout, onAuthStateChanged } from './services/authService';
import type { RepertoireSummary } from './services/repertoireService';

type Repertoire = RepertoireSummary;

type RepertoireWithSongs = {
  repertoire: any;
  songs: any[];
};

function App() {
  // ESTADOS GERAIS
  const [user, setUser] = useState<any | null>(null); 
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [selected, setSelected] = useState<RepertoireWithSongs | null>(null);
  
  // Variáveis prefixadas com '_' para ignorar o aviso de "unused" do linter, mas os setters são usados.
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

  // -- EFEITOS --

  // Monitora Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
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

  // Carrega repertórios quando o usuário muda
  useEffect(() => {
    if (user) {
      reloadRepertoireList(user.uid);
    }
  }, [user]);

  // -- FUNÇÕES AUXILIARES --

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
    const data = await getRepertoireWithSongs(id);
    setSelected(data);
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
      await reloadRepertoire(id);

      setNewName('');
      setNewVocal('');
      setEditingId(null);
      setShowRepForm(false);
      setShowRepertoireList(false);
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

  async function handleToggleFavorite() {
    if (!selected) return;
    try {
      await setRepertoireFavorite(selected.repertoire.id, !selected.repertoire.isFavorite);
      await reloadRepertoire(selected.repertoire.id);
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

  // -- DRAG AND DROP --

  async function persistReorderedSongs(newSongs: any[]) {
    if (!selected) return;
    const repId = selected.repertoire.id;
    const songsWithOrder = newSongs.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSelected((prev) => (prev ? { ...prev, songs: songsWithOrder } : prev));
    await updateSongsOrder(repId, songsWithOrder.map((s) => ({ id: s.id, order: s.order })));
  }

  async function moveSong(index: number, direction: -1 | 1) {
    if (!selected) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selected.songs.length) return;
    const newSongs = [...selected.songs];
    const [moved] = newSongs.splice(index, 1);
    newSongs.splice(newIndex, 0, moved);
    await persistReorderedSongs(newSongs);
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  async function handleDrop(targetIndex: number) {
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

  // Tela de LOGIN
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

  // Tela PRINCIPAL
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: '#111', color: 'white', width: '100%' }}>
      {/* Barra Superior */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <span style={{ fontSize: '14px' }}>Olá, {user.displayName || 'Usuário'}</span>
        <button onClick={handleLogout} style={{ padding: '4px 8px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      {/* LISTA */}
      {showRepertoireList && (
        <div style={{ padding: 16, width: '100%' }}>
          <h2>Repertórios</h2>
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
                <button onClick={() => handleSelectRepertoire(r.id)} style={{ width: '100%', textAlign: 'left', padding: '10px', background: '#222', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <span><strong>{r.name}</strong>{r.defaultVocalistName ? <span style={{ opacity: 0.7 }}> — {r.defaultVocalistName}</span> : ''}</span>
                  {r.isFavorite && <span style={{ fontSize: 12, color: '#ffd54f' }}>★</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DETALHES */}
      {!showRepertoireList && selected && (
        <div style={{ padding: 24, width: '100%' }}>
          <button onClick={() => { setSelected(null); setShowRepertoireList(true); }} style={{ marginBottom: 16, padding: '8px 12px', background: '#777', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            ← Voltar à Lista
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2>{selected.repertoire.name}</h2>
            <button onClick={handleStartEdit} style={{ padding: '4px 8px', fontSize: 12, background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}>Editar</button>
            <button onClick={handleDeleteSelected} style={{ padding: '4px 8px', fontSize: 12, background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}>Excluir</button>
            <button onClick={handleToggleFavorite} style={{ padding: '4px 8px', fontSize: 12, background: selectedIsFavorite ? '#ffa000' : '#555', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}>{selectedIsFavorite ? '★' : '☆'}</button>
          </div>
          <p>Vocalista: {selected.repertoire.defaultVocalistName}</p>

          <h3 style={{ marginTop: 24 }}>Músicas</h3>
          <button type="button" onClick={handleNewSongClick} style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 12 }}>Nova música</button>

          {(showSongForm || editingSongId) && (
            <form onSubmit={handleSaveSong} style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#222' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '150px' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Título</label><input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tom</label><input type="text" value={songKey} onChange={(e) => setSongKey(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                <div style={{ flex: 1, minWidth: '100px' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Vocal</label><input type="text" value={songVocal} onChange={(e) => setSongVocal(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                 <div style={{ flex: 1, minWidth: '45%' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>YouTube</label><input type="text" value={songYoutube} onChange={(e) => setSongYoutube(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
                 <div style={{ flex: 1, minWidth: '45%' }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Cifra</label><input type="text" value={songChord} onChange={(e) => setSongChord(e.target.value)} style={{ width: '100%', padding: 6, color: '#333' }} /></div>
              </div>
              <div style={{ marginBottom: 8 }}><label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Notas</label><textarea value={songNotes} onChange={(e) => setSongNotes(e.target.value)} style={{ width: '100%', padding: 6, minHeight: 60, color: '#333' }} /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" disabled={songSaving || !songTitle.trim()} style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: songSaving ? 'default' : 'pointer', opacity: songSaving ? 0.7 : 1, marginBottom: 8 }}>{songSaving ? 'Salvando...' : 'Salvar'}</button>
                <button type="button" onClick={handleCancelSongEdit} style={{ padding: '6px 12px', background: '#777', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}>Cancelar</button>
              </div>
            </form>
          )}

          <ol>
            {selected.songs.map((s: any, index: number) => (
              <li key={s.id} style={{ marginBottom: 8, padding: 10, borderRadius: 6, background: '#1a1a1a' }} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(index)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexWrap: 'wrap' }} onClick={() => toggleExpandedSong(s.id)}>
                  <div style={{ flexGrow: 1, minWidth: '150px', marginBottom: 8 }}><strong>#{s.order}</strong> – {s.title} | {s.key} | {s.vocalistName}</div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginBottom: 8 }}>
                    <button onClick={(e) => { e.stopPropagation(); moveSong(index, -1); }} disabled={index === 0} style={{ padding: '4px 8px', fontSize: 11, background: '#757575', color: 'white', border: 'none', borderRadius: 4 }}>↑</button>
                    <button onClick={(e) => { e.stopPropagation(); moveSong(index, 1); }} disabled={index === selected.songs.length - 1} style={{ padding: '4px 8px', fontSize: 11, background: '#757575', color: 'white', border: 'none', borderRadius: 4 }}>↓</button>
                    <button onClick={(e) => { e.stopPropagation(); handleEditSong(s); }} style={{ padding: '4px 8px', fontSize: 11, background: '#2196f3', color: 'white', border: 'none', borderRadius: 4 }}>Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSong(s.id); }} style={{ padding: '4px 8px', fontSize: 11, background: '#f44336', color: 'white', border: 'none', borderRadius: 4 }}>X</button>
                  </div>
                </div>
                {expandedSongId === s.id && (
                  <div style={{ marginTop: 10, fontSize: 14, color: '#ddd', paddingLeft: 4, borderTop: '1px dashed #333', paddingTop: '8px' }}>
                    {s.youtubeUrl && <div style={{ marginBottom: 4 }}>YouTube: <a href={s.youtubeUrl} target="_blank" rel="noreferrer" style={{ color: '#90caf9' }}>Link</a></div>}
                    {s.chordUrl && <div style={{ marginBottom: 4 }}>Cifra: <a href={s.chordUrl} target="_blank" rel="noreferrer" style={{ color: '#ffcc80' }}>Link</a></div>}
                    {s.notes && <div style={{ marginTop: 4 }}>Notas: <span>{s.notes}</span></div>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;