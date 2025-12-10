import React, { useState } from 'react'; // Importa React (para namespace) e useState
import type { ChangeEvent, FormEvent } from 'react'; // Importa TIPOS separadamente
import {
  addSongToRepertoire,
  updateSongInRepertoire,
  deleteSongFromRepertoire,
  updateSongsOrder,
  type RepertoireSummary
} from '../services/repertoireService';
import { fetchYoutubeTitle, fetchChordTitle } from '../services/metadataService';

// Tipos auxiliares
type RepertoireWithSongs = {
  repertoire: RepertoireSummary & { sharedWith?: string[] };
  songs: any[];
};

export function useSongs(
  selected: RepertoireWithSongs | null,
  reloadSelectedRepertoire: (id: string) => Promise<void>,
  reloadRepertoireList: () => Promise<void>,
  setSelected: React.Dispatch<React.SetStateAction<RepertoireWithSongs | null>>
) {
  // --- ESTADOS DO FORMULÁRIO ---
  const [songTitle, setSongTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [songVocal, setSongVocal] = useState('');
  const [songYoutube, setSongYoutube] = useState('');
  const [songChord, setSongChord] = useState('');
  const [songNotes, setSongNotes] = useState('');
  
  // --- ESTADOS DE CONTROLE ---
  const [songSaving, setSongSaving] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [showSongForm, setShowSongForm] = useState(false);
  
  // --- ESTADOS VISUAIS (Lista) ---
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [videoPlayingId, setVideoPlayingId] = useState<string | null>(null);
  const [copyingSongId, setCopyingSongId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // --- ACTIONS ---

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
        notes: songNotes.trim()
      };

      if (editingSongId) {
        await updateSongInRepertoire(repId, editingSongId, baseSong);
      } else {
        // Calcula a ordem (último + 1)
        const lastOrder = selected.songs.length > 0 ? selected.songs[selected.songs.length - 1].order : 0;
        await addSongToRepertoire(repId, { ...baseSong, order: lastOrder + 1 });
      }

      await reloadSelectedRepertoire(repId);
      resetSongForm();
      setShowSongForm(false);
    } catch (e: any) {
      setError(e.message);
      alert('Erro ao salvar música: ' + e.message);
    } finally {
      setSongSaving(false);
    }
  }

  async function handleDeleteSong(songId: string) {
    if (!selected || !window.confirm('Excluir música?')) return;
    try {
      await deleteSongFromRepertoire(selected.repertoire.id, songId);
      await reloadSelectedRepertoire(selected.repertoire.id);
    } catch (e: any) {
      setError(e.message);
      alert('Erro ao excluir: ' + e.message);
    }
  }

  // --- FETCHERS ---

  async function handleYoutubeChange(e: ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    setSongYoutube(url);
    if (!songTitle.trim() && url.trim()) {
      const title = await fetchYoutubeTitle(url);
      if (title) setSongTitle(title);
    }
  }

  async function handleChordChange(e: ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    setSongChord(url);
    if (!songTitle.trim() && url.trim()) {
      const title = await fetchChordTitle(url);
      if (title) setSongTitle(title);
    }
  }

  // --- COPY ---

  async function handlePerformCopy(songId: string, targetRepertoireId: string) {
    if (!selected || !window.confirm('Copiar música?')) return;
    try {
      const sourceSong = selected.songs.find(s => s.id === songId);
      if (!sourceSong) return;

      // Adiciona com ordem alta para ir pro final
      await addSongToRepertoire(targetRepertoireId, { ...sourceSong, order: 9999 });

      // Se copiou para o mesmo repertório, recarrega a tela
      if (targetRepertoireId === selected.repertoire.id) {
        await reloadSelectedRepertoire(targetRepertoireId);
      } else {
        await reloadRepertoireList(); // Atualiza contadores da lista principal
      }

      alert('Música copiada com sucesso!');
      setCopyingSongId(null);
    } catch (e: any) {
      alert("Erro ao copiar: " + e.message);
    }
  }

  // --- DRAG AND DROP ---

  async function persistReorderedSongs(newSongs: any[]) {
    if (!selected?.repertoire.isOwner) return;
    
    // Atualiza indices localmente
    const songsWithOrder = newSongs.map((s, idx) => ({ ...s, order: idx + 1 }));
    
    // UI Optimistic Update (atualiza visualmente antes de salvar no banco)
    setSelected((prev) => (prev ? { ...prev, songs: songsWithOrder } : prev));
    
    // Salva no banco
    await updateSongsOrder(selected.repertoire.id, songsWithOrder.map((s) => ({ id: s.id, order: s.order })));
  }

  function handleDragStart(index: number) {
    if (selected?.repertoire.isOwner) setDragIndex(index);
  }

  async function handleDrop(targetIndex: number) {
    if (!selected?.repertoire.isOwner || dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const newSongs = [...selected.songs];
    const [moved] = newSongs.splice(dragIndex, 1);
    newSongs.splice(targetIndex, 0, moved);
    setDragIndex(null);
    await persistReorderedSongs(newSongs);
  }

  // --- UI HELPERS ---

  function toggleExpandedSong(id: string) {
    setExpandedSongId((prev) => (prev === id ? null : id));
    if (id === expandedSongId) {
      setVideoPlayingId(null);
      setCopyingSongId(null);
    }
  }

  function getYoutubeVideoId(url: string | undefined): string | null {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|\w+\/|embed\/|v\/|shorts\/|watch\?.*v=))([^&"'\?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  return {
    // States
    songTitle, setSongTitle,
    songKey, setSongKey,
    songVocal, setSongVocal,
    songYoutube, setSongYoutube,
    songChord, setSongChord,
    songNotes, setSongNotes,
    songSaving,
    editingSongId,
    showSongForm, setShowSongForm,
    expandedSongId,
    videoPlayingId, setVideoPlayingId,
    copyingSongId, setCopyingSongId,
    dragIndex,
    error,

    // Actions
    resetSongForm,
    handleNewSongClick,
    handleCancelSongEdit,
    handleEditSong,
    handleSaveSong,
    handleDeleteSong,
    handleYoutubeChange,
    handleChordChange,
    handlePerformCopy,
    handleDragStart,
    handleDrop,
    toggleExpandedSong,
    getYoutubeVideoId
  };
}