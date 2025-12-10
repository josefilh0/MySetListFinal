import React from 'react';
import type { FormEvent } from 'react';
import type { RepertoireSummary } from '../services/repertoireService';
import { Search, Plus, Star, LogOut, Users } from 'lucide-react'; // <--- Ícones

interface RepertoiresListProps {
  repertoires: RepertoireSummary[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectRepertoire: (id: string) => void;
  onLeaveRepertoire: (id: string) => void;
  onNewRepertoireClick: () => void;
  
  // Props do Formulário
  showForm: boolean;
  editingId: string | null;
  newName: string;
  setNewName: (val: string) => void;
  newVocal: string;
  setNewVocal: (val: string) => void;
  isCreating: boolean;
  onSave: (e: FormEvent) => void;
  onCancelEdit: () => void;
}

const RepertoiresList: React.FC<RepertoiresListProps> = ({
  repertoires, searchTerm, setSearchTerm, onSelectRepertoire,
  onLeaveRepertoire, onNewRepertoireClick,
  showForm, editingId, newName, setNewName, newVocal, setNewVocal,
  isCreating, onSave, onCancelEdit
}) => {
  
  return (
    <div style={{ paddingTop: 16 }}>
      {/* BARRA DE BUSCA */}
      <div className="input-group" style={{position: 'relative'}}>
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
      
      {/* BOTÃO NOVO */}
      {!showForm && !editingId && (
          <button type="button" onClick={onNewRepertoireClick} className="btn btn-primary btn-block">
            <Plus size={18} style={{marginRight: 6}} /> Novo repertório
          </button>
      )}

      {/* FORMULÁRIO */}
      {(showForm || editingId) && (
        <form onSubmit={onSave} className="form-panel">
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
        {repertoires.map((r) => (
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
        ))}
      </ul>
    </div>
  );
};

export default RepertoiresList;