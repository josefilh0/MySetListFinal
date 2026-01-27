import React, { useState, useMemo, useEffect } from 'react';
import { getMusicSuggestions } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, Music, Square, CheckSquare, AlertCircle } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  vocalistName?: string;
}

interface AISuggestionBoxProps {
  songs: Song[];
  onSongsSelected: (songIds: string[]) => void;
}

export const AISuggestionBox: React.FC<AISuggestionBoxProps> = ({ songs, onSongsSelected }) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ suggestedIds: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Cruza os IDs da IA com as músicas que o App conhece
  const suggestedSongs = useMemo(() => {
    if (!result) return [];
    console.log("IDs sugeridos pela IA:", result.suggestedIds);
    console.log("Total de músicas conhecidas no Frontend:", songs.length);
    
    return result.suggestedIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s);
  }, [result, songs]);

  useEffect(() => {
    if (result) {
      setSelectedIds(result.suggestedIds);
    }
  }, [result]);

  const toggleSong = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await getMusicSuggestions(user.uid, prompt);
      console.log("Resposta bruta da IA:", data);

      if (!data.suggestedIds || data.suggestedIds.length === 0) {
        setError('A IA não encontrou músicas correspondentes ao tema.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error("Erro na chamada da IA:", err);
      setError('Erro ao processar. Verifique sua conexão ou cota da API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-panel" style={{ marginBottom: 20, borderLeft: '4px solid #4f46e5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={18} color="#4f46e5" />
        <strong>Sugestão Rápida por Tema</strong>
      </div>

      <div className="input-group" style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tema (ex: Gratidão, Ceia...)"
          className="input-field"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap', minWidth: '80px' }}
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {/* Caso a IA responda, mas o frontend não tenha as músicas na lista 'songs' */}
      {result && suggestedSongs.length === 0 && !loading && (
        <div style={{ marginTop: 15, padding: 10, backgroundColor: '#fff7ed', borderRadius: 8, border: '1px solid #ffedd5', color: '#9a3412', fontSize: 13 }}>
          <AlertCircle size={16} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          A IA sugeriu {result.suggestedIds.length} músicas, mas elas não estão carregadas na lista atual.
        </div>
      )}

      {result && suggestedSongs.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15 }}>
            {suggestedSongs.map((song) => {
              const isSelected = selectedIds.includes(song.id);
              return (
                <div
                  key={song.id}
                  onClick={() => toggleSong(song.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px',
                    backgroundColor: isSelected ? '#f0f7ff' : '#fff',
                    border: `1px solid ${isSelected ? '#bfdbfe' : '#e2e8f0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSelected ? <CheckSquare size={18} color="#3b82f6" /> : <Square size={18} color="#94a3b8" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{song.title}</div>
                    {song.vocalistName && <div style={{ fontSize: 12, color: '#64748b' }}>{song.vocalistName}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onSongsSelected(selectedIds)}
            disabled={selectedIds.length === 0}
            className="btn btn-primary btn-block"
            style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Music size={16} />
            Criar Repertório ({selectedIds.length})
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', fontSize: 13, marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
    </div>
  );
};