import React, { useState } from 'react';
import { Search, Plus, Star, LogOut, Users, Sparkles, Loader2, Music } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { AISuggestionBox } from './AISuggestionBox';
import { createRepertoireFromAI } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';
import { useRepertoires } from '../hooks/useRepertoires';
import { useAppStore } from '../store/useAppStore';

const RepertoiresList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allSongs = useAppStore(state => state.globalSongs);
  
  const {
    repertoires,
    searchTerm,
    setSearchTerm,
    showRepForm,
    newName,
    setNewName,
    newVocal,
    setNewVocal,
    creating: isCreating,
    editingId,
    handleSaveRepertoire: onSave,
    handleCancelEdit: onCancelEdit,
    handleLeaveRepertoire: onLeaveRepertoire,
    handleNewRepertoireClick: onNewRepertoireClick
  } = useRepertoires(user);

  const onSelectRepertoire = (id: string) => {
    navigate(`/repertoire/${id}`);
  };
  const [showAI, setShowAI] = useState(false);
  const [isAiCreating, setIsAiCreating] = useState(false);

  // Função para criar o repertório a partir da sugestão da IA
  const handleCreateFromAI = async (suggestedIds: string[]) => {
    if (!user) return;
    
    const defaultName = `Sugestão IA - ${new Date().toLocaleDateString()}`;
    const repName = prompt("Dê um nome para este novo repertório:", defaultName);
    
    if (!repName) return;

    setIsAiCreating(true);
    try {
      const response = await createRepertoireFromAI(user.uid, repName, suggestedIds);
      
      if (response.success) {
        setShowAI(false); // Fecha o box de IA após criar
        onSelectRepertoire(response.newRepertoireId);
      }
    } catch (error) {
      console.error("Erro ao criar repertório via IA:", error);
      alert("Erro ao criar o repertório. Tente novamente.");
    } finally {
      setIsAiCreating(false);
    }
  };
  
  return (
    <div style={{ paddingTop: 16 }}>
      {/* BARRA DE BUSCA */}
      <div className="input-group" style={{position: 'relative', marginBottom: 12}}>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="input-field" 
          placeholder="Filtrar repertórios..." 
          style={{paddingLeft: 35}}
        />
        <Search size={18} color="#666" style={{position: 'absolute', left: 10, top: 10}} />
      </div>

      {/* BOTÕES DE AÇÃO */}
      {!showRepForm && !editingId && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button 
            type="button" 
            onClick={() => setShowAI(!showAI)} 
            className={`btn ${showAI ? 'btn-dark' : 'btn-secondary'}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Sparkles size={18} style={{marginRight: 6}} /> 
            IA
          </button>
          
          <button 
            type="button" 
            onClick={onNewRepertoireClick} 
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} style={{marginRight: 6}} /> Novo
          </button>
        </div>
      )}

      {/* ASSISTENTE DE IA - Ajustado para usar as músicas e a função de criação */}
      {showAI && !showRepForm && !editingId && (
        <div style={{ marginBottom: 20 }}>
          <AISuggestionBox 
            songs={allSongs} 
            onSongsSelected={handleCreateFromAI} 
          />
        </div>
      )}

      {/* OVERLAY DE CARREGAMENTO IA */}
      {isAiCreating && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', 
          zIndex: 100, display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center'
        }}>
          <Loader2 size={40} className="animate-spin" color="#4f46e5" />
          <p style={{ marginTop: 10, fontWeight: 'bold', color: '#4f46e5' }}>Criando seu repertório...</p>
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO MANUAL */}
      {(showRepForm || editingId) && (
        <form onSubmit={onSave} className="form-panel" style={{ marginBottom: 20 }}>
          <h4 style={{marginTop:0, marginBottom: 15}}>{editingId ? 'Editar Repertório' : 'Criar Repertório'}</h4>
          <div className="input-group">
            <label className="input-label">Nome</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Vocalista Padrão</label>
            <input type="text" value={newVocal} onChange={(e) => setNewVocal(e.target.value)} className="input-field" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
            <button type="submit" disabled={isCreating} className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
            <button type="button" onClick={onCancelEdit} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* LISTA DE REPERTÓRIOS */}
      <ul className="list-unstyled">
        {repertoires.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
            <Music size={40} style={{ marginBottom: 10 }} />
            <p>Nenhum repertório encontrado.</p>
          </div>
        ) : (
          repertoires.map((r) => (
            <li key={r.id} className="repertoire-item">
              <div onClick={() => onSelectRepertoire(r.id)} className="card-clickable">
                <div>
                  <strong style={{display: 'block', fontSize: 16}}>{r.name}</strong>
                  {r.defaultVocalistName && <span style={{ opacity: 0.6, fontSize: 13 }}>🎤 {r.defaultVocalistName}</span>}
                  {!r.isOwner && (
                      <div style={{display:'inline-flex', alignItems:'center', marginLeft: 8}} className="tag-shared">
                          <Users size={10} style={{marginRight:3}}/> COMPARTILHADO
                      </div>
                  )}
                </div>
                {r.isFavorite && <Star size={18} fill="#f59e0b" color="#f59e0b" />}
              </div>
              
              {!r.isOwner && (
                <button 
                  onClick={() => onLeaveRepertoire(r.id)} 
                  className="btn btn-dark" 
                  style={{ height: '100%' }} 
                  title="Sair do repertório"
                >
                  <LogOut size={16} color="#ef4444" />
                </button>
              )}
            </li>
          ))
        )}
      </ul>
      
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RepertoiresList;