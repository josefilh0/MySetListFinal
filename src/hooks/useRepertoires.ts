import { useState, useEffect } from 'react';
import type { FormEvent } from 'react'; // <--- CORREÇÃO 1: Importação separada
import {
  getAllRepertoires,
  getRepertoireWithSongs,
  createRepertoire,
  updateRepertoire,
  deleteRepertoire,
  setRepertoireFavorite,
  leaveRepertoire,
  type RepertoireSummary
} from '../services/repertoireService';

type Repertoire = RepertoireSummary;
type RepertoireWithSongs = {
  repertoire: RepertoireSummary & { sharedWith?: string[] };
  songs: any[];
};

export function useRepertoires(user: any) {
  // --- ESTADOS DE DADOS ---
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [selected, setSelected] = useState<RepertoireWithSongs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- ESTADOS DE UI E FORMULÁRIO ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showRepForm, setShowRepForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVocal, setNewVocal] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- EFEITO: CARREGAR LISTA AO LOGAR ---
  useEffect(() => {
    if (user) {
      reloadRepertoireList();
    } else {
      setRepertoires([]);
      setSelected(null);
    }
  }, [user]);

  // --- FUNÇÕES DE BUSCA ---
  async function reloadRepertoireList() {
    if (!user) return;
    try {
      setRepertoires(await getAllRepertoires(user.uid));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function reloadSelectedRepertoire(id: string) {
    if (!user) return;
    try {
      const data = await getRepertoireWithSongs(id, user.uid);
      setSelected(data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // --- HANDLERS DE AÇÃO ---

  async function handleSelectRepertoire(id: string) {
    try {
      setLoading(true);
      await reloadSelectedRepertoire(id);
      setEditingId(null);
      setShowRepForm(false);
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
      
      await reloadRepertoireList();
      
      if (selected && selected.repertoire.id === id) {
        await reloadSelectedRepertoire(id);
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
    setEditingId(selected.repertoire.id);
    setNewName(selected.repertoire.name || '');
    setNewVocal(selected.repertoire.defaultVocalistName || '');
    setShowRepForm(true);
    localStorage.removeItem('mysetlist_selected_id'); // evita re-selecionar
    setSelected(null); 
  }

  function handleCancelEdit() {
    setEditingId(null);
    setNewName('');
    setNewVocal('');
    setShowRepForm(false);
  }

  async function handleDeleteSelected() {
    if (!selected || !window.confirm('Tem certeza?')) return;
    try {
      await deleteRepertoire(selected.repertoire.id);
      await reloadRepertoireList();
      setSelected(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleLeaveRepertoire(repertoireId: string) {
    if (!user || !window.confirm('Sair deste repertório?')) return;
    try {
      await leaveRepertoire(repertoireId, user.uid);
      await reloadRepertoireList();
      if (selected?.repertoire?.id === repertoireId) setSelected(null);
    } catch (e: any) {
      alert(e.message);
    }
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

  const sortedRepertoires = repertoires
    .filter(r => (r.name + ' ' + r.defaultVocalistName).toLowerCase().includes(searchTerm.trim().toLowerCase()))
    .sort((a, b) => (Number(!!b.isFavorite) - Number(!!a.isFavorite)) || a.name.localeCompare(b.name));

  return {
    repertoires: sortedRepertoires,
    selected,
    loading,
    error,
    
    searchTerm, setSearchTerm,
    showRepForm, setShowRepForm,
    newName, setNewName,
    newVocal, setNewVocal,
    creating,
    editingId,
    setEditingId, // <--- CORREÇÃO 2: Adicionamos o export aqui!

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
    setSelected
  };
}