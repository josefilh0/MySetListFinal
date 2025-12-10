import React from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { RepertoireSummary } from '../services/repertoireService';
import type { Team } from '../services/teamService';
import { 
    ArrowLeft, Edit2, Trash2, Share2, FileText, Star, Plus, 
    PlayCircle, ExternalLink, Copy, X, Mic, Music, UserPlus 
} from 'lucide-react'; // <--- ÍCONES

// Tipagem auxiliar
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
}

export const RepertoireDetails: React.FC<RepertoireDetailsProps> = ({
  selected, isOwner, isFavorite,
  onBack, onEditRepertoire, onDeleteRepertoire, onToggleFavorite, onExportPDF,
  showShareUI, toggleShareUI, shareUidInput, setShareUidInput, onShareUser, onUnshareUser, myTeams, onShareTeam, sharedNames,
  onNewSongClick, showSongForm, editingSongId, 
  songTitle, setSongTitle, songKey, setSongKey, songVocal, setSongVocal, 
  songYoutube, handleYoutubeChange, songChord, handleChordChange, songNotes, setSongNotes, 
  songSaving, onSaveSong, onCancelSongEdit,
  onEditSong, onDeleteSong, expandedSongId, toggleExpandedSong,
  onDragStart, onDrop,
  videoPlayingId, setVideoPlayingId, copyingSongId, setCopyingSongId, availableTargetRepertoires, onCopySong, getYoutubeVideoId
}) => {

  return (
    <div style={{ width: '100%' }}>
      {/* BOTÃO VOLTAR */}
      <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} style={{marginRight: 6}} /> Voltar
      </button>
      
      {/* CABEÇALHO DO REPERTÓRIO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2>{selected.repertoire.name}</h2>
        
        {isOwner ? (
            <div style={{display:'flex', gap: 6}}>
                <button onClick={onEditRepertoire} className="btn btn-info btn-xs" title="Editar"><Edit2 size={14}/></button>
                <button onClick={onDeleteRepertoire} className="btn btn-danger btn-xs" title="Excluir"><Trash2 size={14}/></button>
                <button onClick={toggleShareUI} className="btn btn-purple btn-xs" title="Compartilhar">
                    <Share2 size={14} style={{marginRight: 4}}/> Compartilhar
                </button>
            </div>
        ) : <span className="tag-read-only">MODO LEITURA</span>}

        <div style={{marginLeft: 'auto', display: 'flex', gap: 6}}>
            <button onClick={onExportPDF} className="btn btn-orange btn-xs" title="PDF"><FileText size={14} style={{marginRight:4}}/> PDF</button>
            <button onClick={onToggleFavorite} className={`btn btn-xs ${isFavorite ? 'btn-fav' : 'btn-secondary'}`}>
                <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
            </button>
        </div>
      </div>
      <p style={{marginBottom: '10px', color: '#ccc', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6}}>
         <Mic size={14}/> {selected.repertoire.defaultVocalistName || 'Sem vocalista padrão'}
      </p>
      
      {/* ÁREA DE COMPARTILHAMENTO */}
      {showShareUI && isOwner && (
          <div className="form-panel" style={{ background: '#1e1e1e', border: '1px solid #555' }}>
              <h4>Gerenciar Acesso</h4>
              <div style={{display: 'flex', gap: 5, marginBottom: 15}}>
                <input type="text" placeholder="Cole o UID do usuário" value={shareUidInput} onChange={(e) => setShareUidInput(e.target.value)} className="input-field" />
                <button onClick={onShareUser} className="btn btn-primary"><UserPlus size={16}/></button>
              </div>
              
              {myTeams.length > 0 && (
                  <div style={{marginBottom: 10, padding: 10, background: '#2a2a2a', borderRadius: 4}}>
                      <small style={{display:'block', marginBottom: 5}}>Adicionar Equipe:</small>
                      <div style={{display: 'flex', gap: 5, flexWrap: 'wrap'}}>
                          {myTeams.map(team => (
                              <button key={team.id} onClick={() => onShareTeam(team.id)} className="btn btn-purple btn-sm" style={{borderRadius: 10}}>+ {team.name}</button>
                          ))}
                      </div>
                  </div>
              )}

              <div style={{maxHeight: 150, overflowY: 'auto'}}>
                  <ul className="list-unstyled">
                      {selected.repertoire.sharedWith?.map(uid => (
                          <li key={uid} style={{fontSize:12, marginBottom:4, display: 'flex', justifyContent: 'space-between'}}>
                              <span>{sharedNames[uid] || uid}</span>
                              <button onClick={() => onUnshareUser(uid)} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}><X size={14}/></button>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
      )}

      {/* CABEÇALHO MÚSICAS */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20, borderBottom:'1px solid #333', paddingBottom:5}}>
          <h3>Músicas</h3>
          {isOwner && (
              <button type="button" onClick={onNewSongClick} className="btn btn-primary btn-sm">
                  <Plus size={16} style={{marginRight: 4}}/> Adicionar
              </button>
          )}
      </div>

      {/* FORMULÁRIO DE MÚSICA */}
      {(showSongForm || editingSongId) && (
        <form onSubmit={onSaveSong} className="form-panel" style={{marginTop: 16}}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 2 }}><label className="input-label">Título</label><input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="input-field" autoFocus /></div>
            <div style={{ flex: 1 }}><label className="input-label">Tom</label><input type="text" value={songKey} onChange={(e) => setSongKey(e.target.value)} className="input-field" /></div>
          </div>
          <div style={{ marginBottom: 8 }}><label className="input-label">Vocal</label><input type="text" value={songVocal} onChange={(e) => setSongVocal(e.target.value)} className="input-field" /></div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
             <div style={{ flex: 1 }}><label className="input-label">YouTube Link</label><input type="text" value={songYoutube} onChange={handleYoutubeChange} className="input-field" /></div>
             <div style={{ flex: 1 }}><label className="input-label">Cifra Link</label><input type="text" value={songChord} onChange={handleChordChange} className="input-field" /></div>
          </div>
          <div style={{ marginBottom: 8 }}><label className="input-label">Notas</label><textarea value={songNotes} onChange={(e) => setSongNotes(e.target.value)} className="input-field" /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={songSaving} className="btn btn-primary" style={{flex:1}}>Salvar</button>
            <button type="button" onClick={onCancelSongEdit} className="btn btn-secondary" style={{flex:1}}>Cancelar</button>
          </div>
        </form>
      )}

      {/* LISTA DE MÚSICAS */}
      <ol style={{marginTop: 20, paddingLeft: 0, listStylePosition: 'inside'}}>
        {selected.songs.map((s: any, index: number) => {
            const isCopying = copyingSongId === s.id;
            return (
          <li key={s.id} className="song-item" draggable={isOwner} onDragStart={() => onDragStart(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(index)}>
            <div style={{ cursor: 'pointer' }} onClick={() => toggleExpandedSong(s.id)}>
                <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>#{s.order} – {s.title}</span>
                    {s.key && <span style={{fontSize: 12, background: '#333', padding:'2px 6px', borderRadius: 4, height: 'fit-content'}}>{s.key}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, fontSize: 13, marginTop: 4 }}>
                    <span style={{display:'flex', alignItems:'center', gap: 4}}><Mic size={12}/> {s.vocalistName || selected.repertoire.defaultVocalistName}</span>
                    <span>{expandedSongId === s.id ? '▲' : '▼'}</span>
                </div>
            </div>

            {expandedSongId === s.id && (
              <div style={{marginTop: 10, paddingTop: 10, borderTop: '1px solid #333'}}>
                
                {/* Botões de Ação Rápida */}
                <div style={{display:'flex', gap:8, justifyContent: 'flex-end', marginBottom: 10}}>
                    <button onClick={() => setCopyingSongId(prev => prev === s.id ? null : s.id)} className={`btn btn-xs ${isCopying ? 'btn-orange' : 'btn-dark'}`} title="Copiar">
                        <Copy size={14} style={{marginRight: 4}}/> {isCopying ? 'Cancelar' : 'Copiar'}
                    </button>
                    {isOwner && (
                        <>
                            <button onClick={() => onEditSong(s)} className="btn btn-info btn-xs" title="Editar"><Edit2 size={14}/> Editar</button>
                            <button onClick={() => onDeleteSong(s.id)} className="btn btn-danger btn-xs" title="Excluir"><Trash2 size={14}/></button>
                        </>
                    )}
                </div>

                {isCopying && (
                    <div className="form-panel" style={{animation: 'fadeIn 0.2s'}}>
                        <p style={{fontSize:12, marginBottom:5, color: '#aaa'}}>Copiar para:</p>
                        {availableTargetRepertoires.map(r => (
                            <button key={r.id} onClick={() => onCopySong(s.id, r.id)} className="btn btn-dark btn-sm btn-block" style={{textAlign:'left', marginBottom: 4}}>
                                {r.name}
                            </button>
                        ))}
                    </div>
                )}
                
                <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                    {s.youtubeUrl && (
                        <button onClick={() => setVideoPlayingId(prev => prev ? null : getYoutubeVideoId(s.youtubeUrl))} className="btn btn-dark btn-sm">
                            <PlayCircle size={16} color="red" style={{marginRight: 6}}/> {videoPlayingId ? 'Fechar Vídeo' : 'Assistir'}
                        </button>
                    )}
                    {s.chordUrl && (
                        <a href={s.chordUrl} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm" style={{textDecoration:'none'}}>
                            <Music size={16} color="orange" style={{marginRight: 6}}/> Ver Cifra <ExternalLink size={12} style={{marginLeft: 4}}/>
                        </a>
                    )}
                </div>

                {videoPlayingId === getYoutubeVideoId(s.youtubeUrl) && (
                    <div style={{marginTop: 10, borderRadius: 8, overflow: 'hidden'}}>
                        <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${videoPlayingId}?autoplay=1`} frameBorder="0" allowFullScreen></iframe>
                    </div>
                )}
                
                {s.notes && <div style={{marginTop: 10, color:'#ddd', fontSize:13, background:'#222', padding:8, borderRadius:4, fontStyle: 'italic'}}>{s.notes}</div>}
              </div>
            )}
          </li>
        )})}
      </ol>
    </div>
  );
};