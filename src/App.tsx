// O código para o src/App.tsx é o mesmo que o anterior, apenas confirmando que ele deve ser mantido
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
import type { RepertoireSummary } from './services/repertoireService';

type Repertoire = RepertoireSummary;

type RepertoireWithSongs = {
  repertoire: any;
  songs: any[];
};

function App() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [selected, setSelected] = useState<RepertoireWithSongs | null>(null);
  const [_loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // ESTADO: Controla qual das duas "telas" deve aparecer (Lista ou Detalhes)
  const [showRepertoireList, setShowRepertoireList] = useState(true);

  // repertório (criação/edição)
  const [newName, setNewName] = useState('');
  const [newVocal, setNewVocal] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showRepForm, setShowRepForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // músicas
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

  // carrega todos os repertórios ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const reps = await getAllRepertoires();
        setRepertoires(reps);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  async function reloadRepertoire(id: string) {
    const data = await getRepertoireWithSongs(id);
    setSelected(data);
  }

  async function reloadRepertoireList() {
    const reps = await getAllRepertoires();
    setRepertoires(reps);
  }

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
    if (!newName.trim()) return;

    try {
      setCreating(true);
      setError(null);

      let id: string;

      if (editingId) {
        await updateRepertoire(editingId, newName.trim(), newVocal.trim());
        id = editingId;
      } else {
        id = await createRepertoire(newName.trim(), newVocal.trim());
      }

      await reloadRepertoireList();
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

    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir este repertório e TODAS as músicas dele?'
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);

      const id = selected.repertoire.id;
      await deleteRepertoire(id);

      await reloadRepertoireList();

      setSelected(null);
      setShowRepertoireList(true);

      setEditingId(null);
      resetSongForm();
      setShowSongForm(false);
      setShowRepForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite() {
    if (!selected) return;

    try {
      setLoading(true);
      setError(null);

      const rep = selected.repertoire;
      const id = rep.id;
      const current = !!rep.isFavorite;

      await setRepertoireFavorite(id, !current);

      await reloadRepertoire(id);
      await reloadRepertoireList();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- MÚSICAS ----------

  function resetSongForm() {
    setSongTitle('');
    setSongKey('');
    setSongVocal('');
    setSongYoutube('');
    setSongChord('');
    setSongNotes('');
    setEditingSongId(null);
  }

  async function handleSaveSong(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!songTitle.trim()) return;

    try {
      setSongSaving(true);
      setError(null);

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
        const nextOrder =
          (selected.songs[selected.songs.length - 1]?.order || 0) + 1;

        await addSongToRepertoire(repId, {
          ...baseSong,
          order: nextOrder,
        });
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

  async function handleDeleteSong(songId: string) {
    if (!selected) return;

    const confirmDelete = window.confirm('Excluir esta música do repertório?');
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);

      const repId = selected.repertoire.id;
      await deleteSongFromRepertoire(repId, songId);
      await reloadRepertoire(repId);
      resetSongForm();
      setShowSongForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewSongClick() {
    resetSongForm();
    setShowSongForm(true);
  }

  function handleCancelSongEdit() {
    resetSongForm();
    setShowSongForm(false);
  }

  function toggleExpandedSong(id: string) {
    setExpandedSongId((prev) => (prev === id ? null : id));
  }

  function handleNewRepertoireClick() {
    setEditingId(null);
    setNewName('');
    setNewVocal('');
    setShowRepForm(true);
  }

  // ---------- REORDENAÇÃO DE MÚSICAS ----------

  async function persistReorderedSongs(newSongs: any[]) {
    if (!selected) return;

    const repId = selected.repertoire.id;

    // Garante ordem 1,2,3...
    const songsWithOrder = newSongs.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    // Atualiza na tela imediatamente
    setSelected((prev) => (prev ? { ...prev, songs: songsWithOrder } : prev));

    // Persiste no Firestore
    await updateSongsOrder(
      repId,
      songsWithOrder.map((s) => ({ id: s.id, order: s.order }))
    );
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
    if (dragIndex === null || !selected) return;
    if (dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }

    const newSongs = [...selected.songs];
    const [moved] = newSongs.splice(dragIndex, 1);
    newSongs.splice(targetIndex, 0, moved);

    setDragIndex(null);
    await persistReorderedSongs(newSongs);
  }

  // ---------- FILTRO / ORDENAÇÃO DE REPERTÓRIOS ----------

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredRepertoires = repertoires.filter((r) => {
    if (!normalizedSearch) return true;
    const text =
      (r.name || '') +
      ' ' +
      (r.defaultVocalistName ? r.defaultVocalistName : '');
    return text.toLowerCase().includes(normalizedSearch);
  });

  const sortedRepertoires = [...filteredRepertoires].sort((a, b) => {
    const favDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite); // favoritos primeiro
    if (favDiff !== 0) return favDiff;
    return a.name.localeCompare(b.name);
  });

  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;

  return (
    // Adicionado width: '100%' para garantir que o container ocupe a largura total
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        background: '#111',
        color: 'white',
        width: '100%',
      }}
    >
      {/* TELA DE LISTA DE REPERTÓRIOS (Visível se showRepertoireList for true) */}
      {showRepertoireList && (
        <div style={{ padding: 16, width: '100%' }}>
          <h2>Repertórios</h2>

          {/* filtro */}
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: 6, color: '#333' }}
              placeholder="Filtrar por nome ou vocalista..."
            />
          </div>

          {/* botão para abrir o formulário */}
          <button
            type="button"
            onClick={handleNewRepertoireClick}
            style={{
              width: '100%',
              padding: '6px 10px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              marginBottom: showRepForm || editingId ? 8 : 16,
            }}
          >
            Novo repertório
          </button>

          {/* Formulário de criação/edição de repertório (oculto por padrão) */}
          {(showRepForm || editingId) && (
            <form
              onSubmit={handleSaveRepertoire}
              style={{
                marginBottom: 16,
                padding: 12,
                background: '#222',
                borderRadius: 4,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{ display: 'block', fontSize: 12, marginBottom: 4 }}
                >
                  Nome do repertório
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: 6, color: '#333' }}
                  placeholder="Ex: Culto Domingo Noite"
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label
                  style={{ display: 'block', fontSize: 12, marginBottom: 4 }}
                >
                  Vocalista padrão
                </label>
                <input
                  type="text"
                  value={newVocal}
                  onChange={(e) => setNewVocal(e.target.value)}
                  style={{ width: '100%', padding: 6, color: '#333' }}
                  placeholder="Ex: Ana Paula"
                />
              </div>

              <button
                type="submit"
                disabled={creating || !newName.trim()}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: creating ? 'default' : 'pointer',
                  opacity: creating ? 0.7 : 1,
                  marginBottom: 4,
                }}
              >
                {creating
                  ? editingId
                    ? 'Salvando...'
                    : 'Criando...'
                  : editingId
                  ? 'Salvar alterações'
                  : 'Criar repertório'}
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#777',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </form>
          )}

          {/* Lista de repertórios */}
          {sortedRepertoires.length === 0 && (
            <p style={{ marginTop: 8 }}>Nenhum repertório encontrado.</p>
          )}
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
            {sortedRepertoires.map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => handleSelectRepertoire(r.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px',
                    background: '#222',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <span>
                    <strong>{r.name}</strong>
                    {r.defaultVocalistName ? (
                      <span style={{ opacity: 0.7 }}>
                        {' '}
                        — {r.defaultVocalistName}
                      </span>
                    ) : (
                      ''
                    )}
                  </span>
                  {r.isFavorite && (
                    <span style={{ fontSize: 12, color: '#ffd54f' }}>★</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* TELA DE DETALHES DO REPERTÓRIO + MÚSICAS (Visível se showRepertoireList for false E tiver um selecionado) */}
      {!showRepertoireList && selected && (
        <div style={{ padding: 24, width: '100%' }}>
          {/* Botão de voltar (para voltar para a lista) */}
          <button
            onClick={() => {
              setSelected(null);
              setShowRepertoireList(true); // Volta para a tela da lista
            }}
            style={{
              marginBottom: 16,
              padding: '8px 12px',
              background: '#777',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            ← Voltar à Lista
          </button>

          {/* Conteúdo da tela de detalhes */}

          {/* Adicionado flexWrap: 'wrap' para quebrar a linha dos botões */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {/* Removida a margem direita fixa do <h2> para evitar overflow */}
            <h2
              style={
                {
                  /* marginRight: 12 removido */
                }
              }
            >
              {selected.repertoire.name}
            </h2>
            <button
              onClick={handleStartEdit}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              Editar repertório
            </button>
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              Excluir repertório
            </button>
            <button
              onClick={handleToggleFavorite}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                background: selectedIsFavorite ? '#ffa000' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              {selectedIsFavorite ? 'Remover favorito' : 'Marcar favorito'}
            </button>
          </div>

          <p>Vocalista padrão: {selected.repertoire.defaultVocalistName}</p>

          {/* MÚSICAS */}
          <h3 style={{ marginTop: 24 }}>Músicas</h3>

          <button
            type="button"
            onClick={handleNewSongClick}
            style={{
              padding: '6px 12px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            Nova música
          </button>

          {(showSongForm || editingSongId) && (
            <form
              onSubmit={handleSaveSong}
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: '#222',
              }}
            >
              {/* Adicionado flexWrap: 'wrap' para campos Title/Key/Vocal */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 2, minWidth: '150px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Título
                  </label>
                  <input
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    style={{ width: '100%', padding: 6, color: '#333' }}
                    placeholder="Ex: Ninguém Explica Deus"
                  />
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Tom
                  </label>
                  <input
                    type="text"
                    value={songKey}
                    onChange={(e) => setSongKey(e.target.value)}
                    style={{ width: '100%', padding: 6, color: '#333' }}
                    placeholder="Ex: D"
                  />
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Vocal
                  </label>
                  <input
                    type="text"
                    value={songVocal}
                    onChange={(e) => setSongVocal(e.target.value)}
                    style={{ width: '100%', padding: 6, color: '#333' }}
                    placeholder="Ex: Ana"
                  />
                </div>
              </div>

              {/* Adicionado flexWrap: 'wrap' para campos YouTube/Chord */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '45%' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Link YouTube
                  </label>
                  <input
                    type="text"
                    value={songYoutube}
                    onChange={(e) => setSongYoutube(e.target.value)}
                    style={{ width: '100%', padding: 6, color: '#333' }}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div style={{ flex: 1, minWidth: '45%' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Link cifra
                  </label>
                  <input
                    type="text"
                    value={songChord}
                    onChange={(e) => setSongChord(e.target.value)}
                    style={{ width: '100%', padding: 6, color: '#333' }}
                    placeholder="https://cifraclub.com.br/..."
                  />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label
                  style={{ display: 'block', fontSize: 12, marginBottom: 4 }}
                >
                  Notas / observações
                </label>
                <textarea
                  value={songNotes}
                  onChange={(e) => setSongNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 6,
                    minHeight: 60,
                    color: '#333',
                  }}
                  placeholder="Ex: Fazer final mais suave, repetir refrão 2x..."
                />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={songSaving || !songTitle.trim()}
                  style={{
                    padding: '6px 12px',
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: songSaving ? 'default' : 'pointer',
                    opacity: songSaving ? 0.7 : 1,
                    marginBottom: 8,
                  }}
                >
                  {songSaving
                    ? editingSongId
                      ? 'Salvando música...'
                      : 'Adicionando música...'
                    : editingSongId
                    ? 'Salvar música'
                    : 'Adicionar música'}
                </button>

                <button
                  type="button"
                  onClick={handleCancelSongEdit}
                  style={{
                    padding: '6px 12px',
                    background: '#777',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de músicas */}
          {selected.songs.length === 0 && (
            <p>Nenhuma música nesse repertório.</p>
          )}

          <ol>
            {selected.songs.map((s: any, index: number) => (
              <li
                key={s.id}
                style={{
                  marginBottom: 8,
                  padding: 10,
                  borderRadius: 6,
                  background: '#1a1a1a',
                }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
              >
                {/* Adicionado flexWrap: 'wrap' para título e botões de ação */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                  }}
                  onClick={() => toggleExpandedSong(s.id)}
                >
                  <div
                    style={{ flexGrow: 1, minWidth: '150px', marginBottom: 8 }}
                  >
                    <strong>#{s.order}</strong> – {s.title || '(sem título)'} |
                    Tom: {s.key || '-'} | Vocal: {s.vocalistName || '-'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      flexShrink: 0,
                      marginBottom: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSong(index, -1);
                      }}
                      disabled={index === 0}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        background: index === 0 ? '#555' : '#757575',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: index === 0 ? 'default' : 'pointer',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSong(index, 1);
                      }}
                      disabled={index === selected.songs.length - 1}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        background:
                          index === selected.songs.length - 1
                            ? '#555'
                            : '#757575',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor:
                          index === selected.songs.length - 1
                            ? 'default'
                            : 'pointer',
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSong(s);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        background: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSong(s.id);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {expandedSongId === s.id && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 14,
                      color: '#ddd',
                      paddingLeft: 4,
                      borderTop: '1px dashed #333',
                      paddingTop: '8px',
                    }}
                  >
                    {s.youtubeUrl && (
                      <div style={{ marginBottom: 4 }}>
                        YouTube:{' '}
                        <a
                          href={s.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#90caf9' }}
                        >
                          Abrir vídeo
                        </a>
                      </div>
                    )}
                    {s.chordUrl && (
                      <div style={{ marginBottom: 4 }}>
                        Cifra:{' '}
                        <a
                          href={s.chordUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#ffcc80' }}
                        >
                          Abrir cifra
                        </a>
                      </div>
                    )}
                    {s.notes && (
                      <div style={{ marginTop: 4 }}>
                        Notas: <span>{s.notes}</span>
                      </div>
                    )}
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
