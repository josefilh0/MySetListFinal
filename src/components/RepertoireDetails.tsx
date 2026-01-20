import React, { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { RepertoireSummary } from '../services/repertoireService';
import type { Team } from '../services/teamService';
import { 
    ArrowLeft, Edit2, Trash2, Share2, FileText, Star, Plus, 
    PlayCircle, ExternalLink, Copy, X, Mic, Music, UserPlus, Save
} from 'lucide-react'; 
import { SongViewer } from './SongViewer';

type RepertoireWithSongs = {
  repertoire: RepertoireSummary & { sharedWith?: string[] };
  songs: any[];
};

interface RepertoireDetailsProps {
  selected: RepertoireWithSongs;
  isOwner: boolean;
  isFavorite: boolean;
  onBack: () => void;
  onEditRepertoire: () => void;
  onDeleteRepertoire: () => void;
  onToggleFavorite: () => void;
  onExportPDF: () => void;
  showShareUI: boolean;
  toggleShareUI: () => void;
  shareUidInput: string;
  setShareUidInput: (val: string) => void;
  onShareUser: () => void;
  onUnshareUser: (uid: string) => void;
  myTeams: Team[];
  onShareTeam: (teamId: string) => void;
  sharedNames: Record<string, string>;
  onNewSongClick: () => void;
  showSongForm: boolean;
  editingSongId: string | null;
  songTitle: string;
  setSongTitle: (val: string) => void;
  songKey: string;
  setSongKey: (val: string) => void;
  songVocal: string;
  setSongVocal: (val: string) => void;
  songYoutube: string;
  handleYoutubeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  songChord: string;
  handleChordChange: (e: ChangeEvent<HTMLInputElement>) => void;
  songNotes: string;
  setSongNotes: (val: string) => void;
  songSaving: boolean;
  onSaveSong: (e: FormEvent) => void;
  onCancelSongEdit: () => void;
  onEditSong: (song: any) => void;
  onDeleteSong: (id: string) => void;
  expandedSongId: string | null;
  toggleExpandedSong: (id: string) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
  videoPlayingId: string | null;
  setVideoPlayingId: React.Dispatch<React.SetStateAction<string | null>>;
  copyingSongId: string | null;
  setCopyingSongId: React.Dispatch<React.SetStateAction<string | null>>;
  availableTargetRepertoires: RepertoireSummary[];
  onCopySong: (songId: string, targetId: string) => void;
  getYoutubeVideoId: (url: string | undefined) => string | null;
  onImportFromCifraClub: (songId: string, url: string) => Promise<void>;
  onUpdateChords: (songId: string, content: string) => Promise<void>;
}

export const RepertoireDetails: React.FC<RepertoireDetailsProps> = (props) => {
  const {
    selected, isOwner, isFavorite, onBack, onEditRepertoire, onDeleteRepertoire, onToggleFavorite, onExportPDF,
    showShareUI, toggleShareUI, shareUidInput, setShareUidInput, onShareUser, onUnshareUser, myTeams, onShareTeam, sharedNames,
    onNewSongClick, showSongForm, editingSongId, songTitle, setSongTitle, songKey, setSongKey, songVocal, setSongVocal,
    songYoutube, handleYoutubeChange, songChord, handleChordChange, songNotes, setSongNotes, songSaving, onSaveSong, onCancelSongEdit,
    onEditSong, onDeleteSong, expandedSongId, toggleExpandedSong, onDragStart, onDrop,
    videoPlayingId, setVideoPlayingId, copyingSongId, setCopyingSongId, availableTargetRepertoires, onCopySong, getYoutubeVideoId,
    onImportFromCifraClub, onUpdateChords
  } = props;

  const [viewingSong, setViewingSong] = useState<any | null>(null);

  return (
    <div style={{ width: '100%' }}>
      <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} style={{marginRight: 6}} /> Voltar
      </button>
      
      <div className="details-header" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2>{selected.repertoire.name}</h2>
        {isOwner && (
            <div style={{display:'flex', gap: 6}}>
                <button onClick={onEditRepertoire} className="btn btn-info btn-xs"><Edit2 size={14}/></button>
                <button onClick={onDeleteRepertoire} className="btn btn-danger btn-xs"><Trash2 size={14}/></button>
                <button onClick={toggleShareUI} className="btn btn-purple btn-xs">
                    <Share2 size={14} style={{marginRight: 4}}/> Compartilhar
                </button>
            </div>
        )}
        <div style={{marginLeft: 'auto', display: 'flex', gap: 6}}>
            <button onClick={onExportPDF} className="btn btn-orange btn-xs"><FileText size={14} style={{marginRight:4}}/> PDF</button>
            <button onClick={onToggleFavorite} className={`btn btn-xs ${isFavorite ? 'btn-fav' : 'btn-secondary'}`}>
                <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
            </button>
        </div>
      </div>

      <p style={{marginBottom: '10px', color: '#ccc', fontSize: 13}}><Mic size={14}/> {selected.repertoire.defaultVocalistName || 'Sem vocalista padrão'}</p>
      
      {/* SEÇÃO DE COMPARTILHAMENTO (Usa UserPlus, X, myTeams, etc) */}
      {showShareUI && isOwner && (
          <div className="form-panel" style={{ background: '#1e1e1e', border: '1px solid #555', padding: 10, marginBottom: 15 }}>
              <h4>Gerenciar Acesso</h4>
              <div style={{display: 'flex', gap: 5, marginBottom: 10}}>
                <input type="text" placeholder="Cole o UID" value={shareUidInput} onChange={(e) => setShareUidInput(e.target.value)} className="input-field" />
                <button onClick={onShareUser} className="btn btn-primary"><UserPlus size={16}/></button>
              </div>
              <div style={{display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10}}>
                {myTeams.map(team => (
                    <button key={team.id} onClick={() => onShareTeam(team.id)} className="btn btn-purple btn-xs">+ {team.name}</button>
                ))}
              </div>
              <ul className="list-unstyled">
                  {selected.repertoire.sharedWith?.map(uid => (
                      <li key={uid} style={{fontSize: 11, display:'flex', justifyContent:'space-between', padding: '4px 0'}}>
                          <span>{sharedNames[uid] || uid}</span>
                          <button onClick={() => onUnshareUser(uid)} style={{background:'none', border:'none', color:'red'}}><X size={14}/></button>
                      </li>
                  ))}
              </ul>
          </div>
      )}

      <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #333', paddingBottom:5}}>
          <h3>Músicas</h3>
          {isOwner && <button onClick={onNewSongClick} className="btn btn-primary btn-sm"><Plus size={16}/> Adicionar</button>}
      </div>

      {/* FORMULÁRIO DE MÚSICA (Usa songTitle, songKey, etc) */}
      {(showSongForm || editingSongId) && (
        <form onSubmit={onSaveSong} className="form-panel" style={{marginTop: 16}}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="text" placeholder="Título" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="input-field" style={{flex: 2}} required />
            <input type="text" placeholder="Tom" value={songKey} onChange={(e) => setSongKey(e.target.value)} className="input-field" style={{flex: 1}} />
          </div>
          <input type="text" placeholder="Vocal" value={songVocal} onChange={(e) => setSongVocal(e.target.value)} className="input-field" style={{marginBottom: 8}} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
             <input type="text" placeholder="URL YouTube" value={songYoutube} onChange={handleYoutubeChange} className="input-field" style={{flex:1}}/>
             <input type="text" placeholder="URL Cifra Club" value={songChord} onChange={handleChordChange} className="input-field" style={{flex:1}}/>
          </div>
          <textarea placeholder="Notas" value={songNotes} onChange={(e) => setSongNotes(e.target.value)} className="input-field" style={{marginBottom: 8}} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={songSaving} className="btn btn-primary" style={{flex:1}}><Save size={16}/> Salvar</button>
            <button type="button" onClick={onCancelSongEdit} className="btn btn-secondary" style={{flex:1}}>Cancelar</button>
          </div>
        </form>
      )}

      <ol style={{marginTop: 20, paddingLeft: 0, listStyle: 'none'}}>
        {selected.songs.map((s, index) => (
          <li key={s.id} className="song-item" draggable={isOwner} onDragStart={() => onDragStart(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(index)}>
            <div style={{ cursor: 'pointer' }} onClick={() => toggleExpandedSong(s.id)}>
                <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>#{index + 1} – {s.title}</span>
                    <span style={{fontSize: 12, background: '#333', padding:'2px 6px', borderRadius: 4}}>{s.key}</span>
                </div>
                <div style={{ opacity: 0.8, fontSize: 12 }}><Mic size={12}/> {s.vocalistName || selected.repertoire.defaultVocalistName}</div>
            </div>

            {expandedSongId === s.id && (
              <div className="song-expanded" style={{marginTop: 10, paddingTop: 10, borderTop: '1px solid #333'}}>
                <div style={{display:'flex', gap:5, justifyContent: 'flex-end', marginBottom: 10}}>
                    <button onClick={() => setCopyingSongId(s.id === copyingSongId ? null : s.id)} className="btn btn-dark btn-xs"><Copy size={12}/> {copyingSongId === s.id ? 'Cancelar' : 'Copiar'}</button>
                    {isOwner && (
                        <>
                            <button onClick={() => onEditSong(s)} className="btn btn-info btn-xs"><Edit2 size={12}/></button>
                            <button onClick={() => onDeleteSong(s.id)} className="btn btn-danger btn-xs"><Trash2 size={12}/></button>
                        </>
                    )}
                </div>

                {/* MENU DE CÓPIA (Usa availableTargetRepertoires, onCopySong) */}
                {copyingSongId === s.id && (
                    <div className="copy-menu" style={{background: '#222', padding: 8, borderRadius: 4, marginBottom: 10}}>
                        <small>Copiar para:</small>
                        {availableTargetRepertoires.map(r => (
                            <button key={r.id} onClick={() => onCopySong(s.id, r.id)} className="btn btn-dark btn-xs" style={{display:'block', width:'100%', marginTop: 4, textAlign: 'left'}}>{r.name}</button>
                        ))}
                    </div>
                )}

                <div className="action-row" style={{display: 'flex', gap: 5, flexWrap: 'wrap'}}>
                    {s.chords && <button onClick={() => setViewingSong(s)} className="btn btn-purple btn-sm"><FileText size={14}/> Modo Palco</button>}
                    <button onClick={() => {
                        const url = prompt("Link do Cifra Club:");
                        if (url) onImportFromCifraClub(s.id, url);
                    }} className="btn btn-dark btn-sm"><ExternalLink size={14} color="green"/> Importar</button>
                    
                    {s.youtubeUrl && <button onClick={() => setVideoPlayingId(videoPlayingId === getYoutubeVideoId(s.youtubeUrl) ? null : getYoutubeVideoId(s.youtubeUrl))} className="btn btn-dark btn-sm"><PlayCircle size={14} color="red"/> Vídeo</button>}
                    
                    {s.chordUrl && (
                        <a href={s.chordUrl} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm" style={{textDecoration: 'none'}}>
                            <Music size={14} color="orange" style={{marginRight: 6}}/> Site <ExternalLink size={12} style={{marginLeft: 4}}/>
                        </a>
                    )}
                </div>
                
                {/* VIDEO PLAYER (Usa videoPlayingId) */}
                {videoPlayingId && s.youtubeUrl.includes(videoPlayingId) && (
                    <div className="video-container" style={{marginTop: 10}}>
                        <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${videoPlayingId}`} frameBorder="0" allowFullScreen title="YouTube video"></iframe>
                    </div>
                )}
                
                {s.notes && <div className="song-notes" style={{marginTop: 10, color:'#ddd', fontSize:13, background:'#222', padding:8, borderRadius:4, fontStyle: 'italic'}}>{s.notes}</div>}
              </div>
            )}
          </li>
        ))}
      </ol>

      {viewingSong && (
        <SongViewer 
          songs={selected.songs}
          currentIndex={selected.songs.findIndex(s => s.id === viewingSong.id)}
          onNavigate={(index) => setViewingSong(selected.songs[index])}
          onClose={() => setViewingSong(null)}
          onSaveEdit={onUpdateChords}
        />
      )}
    </div>
  );
};