import React, { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
// Adicione esta importação:
import toast from 'react-hot-toast'; 

import {
  addSongToRepertoire,
  updateSongInRepertoire,
  deleteSongFromRepertoire,
  updateSongsOrder,
  type RepertoireSummary
} from '../services/repertoireService';
import { fetchYoutubeTitle, fetchChordTitle } from '../services/metadataService';

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
  const [videoPlayingId, setVideoPlayingId] = useState<string | null>(null);
  const [copyingSongId, setCopyingSongId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);

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

      let savedSongId = editingSongId;

      if (editingSongId) {
        await updateSongInRepertoire(repId, editingSongId, baseSong);
      } else {
        const lastOrder = selected.songs.length > 0 ? selected.songs[selected.songs.length - 1].order : 0;
        
        // Alteração aqui: forçamos o tipo para capturar o ID
        const newDoc = await addSongToRepertoire(repId, { ...baseSong, order: lastOrder + 1 }) as any;
        savedSongId = newDoc.id; // Agora o TS vai permitir acessar o id
      }

      // IMPORTAÇÃO AUTOMÁTICA: Se salvou e tem link do Cifra Club, dispara a busca
      if (savedSongId && baseSong.chordUrl.includes('cifraclub.com.br')) {
        handleImportFromCifraClub(savedSongId, baseSong.chordUrl);
      }

      await reloadSelectedRepertoire(repId);
      resetSongForm();
      setShowSongForm(false);
    } catch (e: any) {
      setError(e.message);
      toast.error('Erro ao salvar música');
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

  async function handleImportFromCifraClub(songId: string, url: string) {
    if (!selected) return;
    try {
      const functions = getFunctions();
      const getChordsFn = httpsCallable(functions, 'getCifraClubChords');
      const result = await getChordsFn({ url });
      const data = result.data as { success: boolean; content: string };

      if (data.success) {
        const repId = selected.repertoire.id;
        const songRef = doc(db, 'repertoires', repId, 'songs', songId);
        await updateDoc(songRef, { chords: data.content });
        await reloadSelectedRepertoire(repId);
        toast.success('Cifra importada automaticamente!');
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Falha na importação automática.");
    }
  }

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

  async function handleUpdateChords(songId: string, newChords: string) {
    if (!selected) return;
    try {
      const songRef = doc(db, 'repertoires', selected.repertoire.id, 'songs', songId);
      await updateDoc(songRef, { chords: newChords });
      await reloadSelectedRepertoire(selected.repertoire.id);
      toast.success("Cifra salva!");
    } catch (e) {
      toast.error("Erro ao salvar cifra.");
    }
  }

  async function handlePerformCopy(songId: string, targetRepertoireId: string) {
    if (!selected || !window.confirm('Copiar música?')) return;
    try {
      const sourceSong = selected.songs.find(s => s.id === songId);
      if (!sourceSong) return;

      const { id, createdAt, ...songDataToCopy } = sourceSong;
      await addSongToRepertoire(targetRepertoireId, { ...songDataToCopy, order: 9999 });

      if (targetRepertoireId === selected.repertoire.id) {
        await reloadSelectedRepertoire(targetRepertoireId);
      } else {
        await reloadRepertoireList();
      }

      alert('Música copiada com sucesso!');
      setCopyingSongId(null);
    } catch (e: any) {
      alert("Erro ao copiar: " + e.message);
    }
  }

  async function persistReorderedSongs(newSongs: any[]) {
    if (!selected?.repertoire.isOwner) return;
    const songsWithOrder = newSongs.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSelected((prev) => (prev ? { ...prev, songs: songsWithOrder } : prev));
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
    getYoutubeVideoId,
    handleImportFromCifraClub,
    handleUpdateChords // ADICIONADO NO RETURN
  };
}