import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Edit3,
  Save,
  Music,
  Type
} from 'lucide-react';
import './SongViewer.css';

interface SongViewerProps {
  songs: any[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onSaveEdit: (songId: string, content: string) => Promise<void>;
}

// Notas para transposição
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_SEMITONES: { [k: string]: number } = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11,
};

export const SongViewer: React.FC<SongViewerProps> = ({
  songs,
  currentIndex,
  onNavigate,
  onClose,
  onSaveEdit,
}) => {
  const song = songs[currentIndex];
  const [fontSize, setFontSize] = useState(18);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(song?.chords || '');
  const [semitones, setSemitones] = useState(0);

  // Intercepta o botão "voltar" do sistema
  useEffect(() => {
    const handlePopState = () => {
      // Fecha o modo palco ao pressionar voltar
      onClose();
    };
    window.history.pushState({ isSongViewer: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Recalcula edição e transposição ao mudar de música
  useEffect(() => {
    setEditContent(song?.chords || '');
    setIsEditing(false);
    if (song?.key && song?.chords) {
      const trimmedKey = song.key.trim();
      const targetRoot = trimmedKey.replace(/m$/, '');
      const firstMatch = song.chords.match(/[A-G][b#]?/);
      if (firstMatch && KEY_SEMITONES[targetRoot] !== undefined) {
        const originalRoot = firstMatch[0].replace(/m$/, '');
        if (KEY_SEMITONES[originalRoot] !== undefined) {
          const diff =
            (KEY_SEMITONES[targetRoot] - KEY_SEMITONES[originalRoot] + 12) % 12;
          setSemitones(diff);
        } else {
          setSemitones(0);
        }
      } else {
        setSemitones(0);
      }
    } else {
      setSemitones(0);
    }
  }, [currentIndex, song]);

  // Aplica transposição ao texto
  const transposedContent = useMemo(() => {
    if (semitones === 0) return editContent;
    return editContent.replace(/[A-G][b#]?/g, (match: string) => {
      const flatsMap: any = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };
      const isFlat = match.endsWith('b');
      const normalized = isFlat ? flatsMap[match] || match : match;
      const index = NOTES.indexOf(normalized);
      if (index === -1) return match;
      let newIndex = (index + semitones) % 12;
      if (newIndex < 0) newIndex += 12;
      return NOTES[newIndex];
    });
  }, [editContent, semitones]);

  // Salva a cifra já transposta
  const handleSave = async () => {
    await onSaveEdit(song.id, transposedContent);
    setIsEditing(false);
  };

  // Cancela edição
  const handleCancelEdit = () => {
    setEditContent(song?.chords || '');
    if (song?.key && song?.chords) {
      const trimmedKey = song.key.trim();
      const targetRoot = trimmedKey.replace(/m$/, '');
      const match = song.chords.match(/[A-G][b#]?/);
      if (match && KEY_SEMITONES[targetRoot] !== undefined) {
        const originalRoot = match[0].replace(/m$/, '');
        if (KEY_SEMITONES[originalRoot] !== undefined) {
          const diff =
            (KEY_SEMITONES[targetRoot] - KEY_SEMITONES[originalRoot] + 12) % 12;
          setSemitones(diff);
        } else {
          setSemitones(0);
        }
      } else {
        setSemitones(0);
      }
    } else {
      setSemitones(0);
    }
    setIsEditing(false);
  };

  // Ajusta tom manualmente
  const matchSongKey = () => {
    if (!song?.key) return;
    const trimmedKey = song.key.trim();
    const targetRoot = trimmedKey.replace(/m$/, '');
    const m = editContent.match(/[A-G][b#]?/);
    if (!m) return;
    const originalRoot = m[0].replace(/m$/, '');
    if (
      KEY_SEMITONES[targetRoot] == null ||
      KEY_SEMITONES[originalRoot] == null
    )
      return;
    const diff =
      (KEY_SEMITONES[targetRoot] - KEY_SEMITONES[originalRoot] + 12) % 12;
    setSemitones(diff);
  };

  // Renderiza linhas da cifra/letra
  const renderLine = (line: string, idx: number) => {
    const isChordLine = line.trim().length > 0 && !/[a-z]{4,}/.test(line);
    return (
      <div key={idx} className={isChordLine ? 'chord-line' : 'lyric-line'}>
        {line || '\u00A0'}
      </div>
    );
  };

  // Fecha o modo palco via história
  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="viewer-overlay">
      
      {/* SEÇÃO DO TOPO COM HEADER E BOTOES */}
      <div className="viewer-top-section">
        <div className="viewer-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="song-title">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {song.title}
              </span>
              <span className="badge-count">{currentIndex + 1}/{songs.length}</span>
            </h3>
            <span className="vocalist-name">{song.vocalistName || 'Sem Vocal'}</span>
          </div>
          <button className="btn-close-viewer" onClick={handleClose} title="Sair da Cifra">
            <X size={20} />
          </button>
        </div>

        {/* TOOLBAR MALEÁVEL (Flex Wrap) QUE NUNCA SOBREPÕE */}
        <div className="viewer-toolbar">
          
          <div className="tool-group" title="Tamanho da Letra">
            <Type size={16} color="#aaa" style={{ margin: '0 8px' }} />
            <button className="notranslate" translate="no" onClick={() => setFontSize((f) => f - 2)}>-A</button>
            <span className="tool-badge">{fontSize}</span>
            <button className="notranslate" translate="no" onClick={() => setFontSize((f) => f + 2)}>+A</button>
          </div>
          
          <div className="tool-group" title="Mudar Tom">
            <Music size={16} color="#aaa" style={{ margin: '0 8px' }} />
            <button onClick={() => setSemitones((s) => s - 1)}>-½</button>
            <span className="tool-badge">{semitones > 0 ? `+${semitones}` : semitones}</span>
            <button onClick={() => setSemitones((s) => s + 1)}>+½</button>
            {song?.key && (
              <button 
                onClick={matchSongKey} 
                style={{ marginLeft: 6, fontSize: 11, background: '#fbbf24', color: '#000', padding: '0 6px', fontWeight: 'bold' }}
              >
                Orig
              </button>
            )}
          </div>

          <button
            className={`tool-btn ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
            style={{ marginLeft: 'auto' }}
          >
            <Edit3 size={16} /> {isEditing ? 'Lendo' : 'Editar'}
          </button>
          
        </div>
      </div>

      {/* ÁREA DA CIFRA EM SI */}
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

      {/* BOTÕES FLUTUANTES DE SALVAR (Se no modo de edição) */}
      {isEditing && (
        <div className="fab-container">
          <button onClick={handleCancelEdit} className="fab-btn fab-cancel" title="Cancelar Edição">
            <X size={28} />
          </button>
          <button onClick={handleSave} className="fab-btn fab-save" title="Salvar Edição">
            <Save size={28} />
          </button>
        </div>
      )}

      {/* FOOTER BÁSICO DE NAVEGAÇÃO NA BASE */}
      <div className="viewer-footer">
        <button
          className="btn-nav-foot"
          disabled={currentIndex === 0}
          onClick={() => onNavigate(currentIndex - 1)}
        >
          <ChevronLeft size={20} /> Anterior
        </button>

        <button
          className="btn-nav-foot"
          disabled={currentIndex === songs.length - 1}
          onClick={() => onNavigate(currentIndex + 1)}
        >
          Próxima <ChevronRight size={20} />
        </button>
      </div>

    </div>
  );
};
