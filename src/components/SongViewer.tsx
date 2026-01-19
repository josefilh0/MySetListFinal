import React, { useState } from 'react';
import './SongViewer.css';

interface SongViewerProps {
  song: {
    title: string;
    vocalistName?: string;
    chords?: string;
  };
  onClose: () => void;
}

export const SongViewer: React.FC<SongViewerProps> = ({ song, onClose }) => {
  const [fontSize, setFontSize] = useState(18);

  return (
    <div className="viewer-overlay">
      <div className="viewer-header">
        <div className="song-info">
          <h2 style={{ margin: 0, color: '#fff' }}>{song.title}</h2>
          <small style={{ color: '#aaa' }}>Vocal: {song.vocalistName || 'Não definido'}</small>
        </div>
        
        <div className="controls" style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setFontSize(f => Math.max(10, f - 2))} className="viewer-btn">A-</button>
          <span style={{ margin: '0 15px', color: '#fff', fontWeight: 'bold' }}>{fontSize}px</span>
          <button onClick={() => setFontSize(f => Math.min(50, f + 2))} className="viewer-btn">A+</button>
          <button 
            onClick={onClose} 
            className="viewer-btn" 
            style={{ marginLeft: '20px', background: '#dc2626', border: 'none' }}
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="viewer-content">
        <pre style={{ fontSize: `${fontSize}px` }}>
          {song.chords || 'Nenhuma cifra disponível.'}
        </pre>
      </div>
    </div>
  );
};