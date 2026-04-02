import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { RepertoireDetails } from './RepertoireDetails';

import { useAuth } from '../hooks/useAuth';
import { useRepertoires } from '../hooks/useRepertoires';
import { useSongs } from '../hooks/useSongs';
import { useTeams } from '../hooks/useTeams';

import { getTeamMembers } from '../services/teamService';
import { exportRepertoireToPDF } from '../services/pdfService';
import {
  shareRepertoireWithUser,
  unshareRepertoireWithUser,
  getUserNames,
} from '../services/repertoireService';
import { ConfirmShareTeamModal, ConfirmUnshareUserModal } from './ui/Modals';

export default function RepertoireDetailsContainer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const repertoiresHook = useRepertoires(user);
  const {
    repertoires: sortedRepertoires,
    selected,
    setSelected,
    reloadSelectedRepertoire,
    reloadRepertoireList,
    handleStartEdit,
    handleDeleteSelected,
    handleToggleFavorite,
  } = repertoiresHook;

  const songsHook = useSongs(
    selected,
    reloadSelectedRepertoire,
    reloadRepertoireList,
    setSelected
  );

  const { teamsList } = useTeams(user);

  const [shareUidInput, setShareUidInput] = useState('');
  const [showShareUI, setShowShareUI] = useState(false);
  const [sharedNames, setSharedNames] = useState<Record<string, string>>({});

  // Carrega os dados baseado na URL
  useEffect(() => {
    if (user && id) {
       reloadSelectedRepertoire(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useEffect(() => {
    const loadNames = async () => {
      if (selected?.repertoire?.sharedWith?.length) {
        try {
          setSharedNames(await getUserNames(selected.repertoire.sharedWith));
        } catch (e) {
          console.error(e);
        }
      }
    };
    if (showShareUI && selected) loadNames();
  }, [showShareUI, selected]);

  if (!user || (!selected && repertoiresHook.loading)) {
    return <p style={{ padding: 20 }}>Carregando dados...</p>;
  }

  if (!selected) {
     return <p style={{ padding: 20 }}>Repertório não encontrado.</p>;
  }

  const handleBackWrapper = () => {
    setSelected(null);
    navigate('/');
  };

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
      <ConfirmShareTeamModal 
         onCancel={() => toast.dismiss(t.id)} 
         onConfirm={() => { toast.dismiss(t.id); confirmShareWithTeam(teamId); }} 
      />
    ), { duration: 5000 });
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
      }
    );
  }

  async function handleUnshareRepertoire(uidToRemove: string) {
    if (!selected) return;
    toast((t) => (
      <ConfirmUnshareUserModal
         onCancel={() => toast.dismiss(t.id)}
         onConfirm={() => { toast.dismiss(t.id); executeUnshare(uidToRemove); }}
      />
    ), { icon: '⚠️' });
  }

  async function executeUnshare(uidToRemove: string) {
    if (!selected) return;
    try {
      await unshareRepertoireWithUser(selected.repertoire.id, uidToRemove);
      await reloadSelectedRepertoire(selected.repertoire.id);
      toast.success('Acesso removido.');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  }

  const selectedIsFavorite = !!selected?.repertoire?.isFavorite;
  const isOwner = !!selected?.repertoire?.isOwner;
  const availableTargetRepertoires = sortedRepertoires.filter(
    (r) => r.id !== selected?.repertoire?.id && r.isOwner
  );

  return (
    <RepertoireDetails
      selected={selected}
      isOwner={isOwner}
      isFavorite={selectedIsFavorite}
      onBack={handleBackWrapper}
      onEditRepertoire={handleStartEdit}
      onDeleteRepertoire={async () => {
         await handleDeleteSelected();
         navigate('/');
      }}
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
      songTags={songsHook.songTags}
      setSongTags={songsHook.setSongTags}
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
      onSaveTags={songsHook.handleSaveTags}
      onGenerateTags={songsHook.handleGenerateTags}
    />
  );
}
