import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, X, Edit3, Save, Music } from 'lucide-react';
import './SongViewer.css';

interface SongViewerProps {
  songs: any[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onSaveEdit: (songId: string, content: string) => Promise<void>;
}

export const SongViewer: React.FC<SongViewerProps> = ({ songs, currentIndex, onNavigate, onClose, onSaveEdit }) => {
  const song = songs[currentIndex];
  const [fontSize, setFontSize] = useState(18);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(song?.chords || '');
  const [semitones, setSemitones] = useState(0);

  useEffect(() => {
    setEditContent(song?.chords || '');
    setIsEditing(false);
    setSemitones(0); // Reseta o tom ao mudar de música
  }, [currentIndex, song]);

  // Lógica de Transposição
  const transposedContent = useMemo(() => {
    if (semitones === 0) return editContent;

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const map: any = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

    return editContent.replace(/[A-G][b#]?/g, (match: string) => {
      const isFlat = match.endsWith('b');
      const note = isFlat ? map[match] || match : match;
      const index = notes.indexOf(note);
      if (index === -1) return match;
      let newIndex = (index + semitones) % 12;
      if (newIndex < 0) newIndex += 12;
      return notes[newIndex];
    });
  }, [editContent, semitones]);

  const handleSave = async () => {
    await onSaveEdit(song.id, editContent);
    setIsEditing(false);
  };

  const renderLine = (line: string, idx: number) => {
    // Identifica se a linha é de acordes (poucas letras minúsculas, muitos espaços/letras maiúsculas)
    const isChordLine = line.trim().length > 0 && !/[a-z]{4,}/.test(line);
    return (
      <div key={idx} className={isChordLine ? "chord-line" : "lyric-line"}>
        {line || '\u00A0'}
      </div>
    );
  };

  return (
    <div className="viewer-overlay">
      <div className="viewer-header">
        <div className="song-info">
          <h3>{song.title} <span className="badge-count">{currentIndex + 1}/{songs.length}</span></h3>
          <small>{song.vocalistName || 'Sem Vocal'}</small>
        </div>
        
        <div className="viewer-controls">
          <div className="control-group">
            <button onClick={() => setFontSize(f => f - 2)} title="Diminuir Letra"><Minus size={18}/></button>
            <button onClick={() => setFontSize(f => f + 2)} title="Aumentar Letra"><Plus size={18}/></button>
          </div>

          <div className="control-group tone-controls">
            <button onClick={() => setSemitones(s => s - 1)}><Minus size={14}/></button>
            <div className="tone-display"><Music size={14}/> {semitones > 0 ? `+${semitones}` : semitones}</div>
            <button onClick={() => setSemitones(s => s + 1)}><Plus size={14}/></button>
          </div>

          <button onClick={() => setIsEditing(!isEditing)} className={isEditing ? 'btn-active' : ''}>
            <Edit3 size={18}/>
          </button>
          <button onClick={onClose} className="btn-danger"><X size={20}/></button>
        </div>
      </div>

      <div className="viewer-content">
        {isEditing ? (
          <textarea 
            className="edit-area"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <pre style={{ fontSize: `${fontSize}px` }}>
            {transposedContent.split('\n').map(renderLine)}
          </pre>
        )}
      </div>

      {isEditing && (
        <button onClick={handleSave} className="fab-save">
          <Save size={24}/>
        </button>
      )}

      <div className="viewer-navigation">
        <button disabled={currentIndex === 0} onClick={() => onNavigate(currentIndex - 1)}>
          <ChevronLeft /> Anterior
        </button>
        <span className="nav-title">{song.title}</span>
        <button disabled={currentIndex === songs.length - 1} onClick={() => onNavigate(currentIndex + 1)}>
          Próxima <ChevronRight />
        </button>
      </div>
    </div>
  );
};