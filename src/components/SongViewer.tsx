import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
  Edit3,
  Save,
  Music,
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

  // Recalcula ao mudar de música
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
          const diff = (KEY_SEMITONES[targetRoot] - KEY_SEMITONES[originalRoot] + 12) % 12;
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

  // Renderiza linhas da cifra/ letra
  const renderLine = (line: string, idx: number) => {
    const isChordLine = line.trim().length > 0 && !/[a-z]{4,}/.test(line);
    return (
      <div key={idx} className={isChordLine ? 'chord-line' : 'lyric-line'}>
        {line || '\u00A0'}
      </div>
    );
  };

  return (
    <div className="viewer-overlay">
      {/* Cabeçalho reorganizado em três linhas */}
      <div className="viewer-header">
        {/* Linha 1: título e contagem */}
        <div className="header-title-row">
          <h3 className="song-title">
            {song.title}
            <span className="badge-count">
              {currentIndex + 1}/{songs.length}
            </span>
          </h3>
        </div>
        {/* Linha 2: nome do cantor/vocalista */}
        <div className="header-vocalist-row">
          <small className="vocalist-name">
            {song.vocalistName || 'Sem Vocal'}
          </small>
        </div>
        {/* Linha 3: controles agrupados */}
        <div className="controls-row">
          {/* Tamanho da fonte */}
          <div className="control-group font-controls">
            <button
              onClick={() => setFontSize((f) => f - 2)}
              title="Diminuir letra"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => setFontSize((f) => f + 2)}
              title="Aumentar letra"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Transposição de tom */}
          <div className="control-group tone-controls">
            <button
              onClick={() => setSemitones((s) => s - 1)}
              title="Tom -"
            >
              <Minus size={12} />
            </button>
            <div className="tone-display">
              <Music size={12} />{' '}
              {semitones > 0 ? `+${semitones}` : semitones}
            </div>
            <button onClick={() => setSemitones((s) => s + 1)} title="Tom +">
              <Plus size={12} />
            </button>
            <button onClick={matchSongKey} title="Ajustar ao Tom">
              <Music size={12} />
            </button>
          </div>

          {/* Edição e fechar */}
          <div className="control-group edit-controls">
            <button
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'Visualizar' : 'Editar'}
            >
              <Edit3 size={14} />
            </button>
            <button onClick={onClose} title="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo da cifra ou área de edição */}
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

      {/* Botões de salvar/cancelar na edição */}
      {isEditing && (
        <>
          <button onClick={handleCancelEdit} className="fab-cancel">
            <X size={24} />
          </button>
          <button onClick={handleSave} className="fab-save">
            <Save size={24} />
          </button>
        </>
      )}

      {/* Navegação entre músicas */}
      <div className="viewer-navigation">
        <button
          disabled={currentIndex === 0}
          onClick={() => onNavigate(currentIndex - 1)}
        >
          <ChevronLeft /> Anterior
        </button>
        <span className="nav-title">{song.title}</span>
        <button
          disabled={currentIndex === songs.length - 1}
          onClick={() => onNavigate(currentIndex + 1)}
        >
          Próxima <ChevronRight />
        </button>
      </div>
    </div>
  );
};
