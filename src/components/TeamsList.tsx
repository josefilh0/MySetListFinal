import { Users, Plus, Trash2, ChevronDown, ChevronUp, UserMinus, LogOut } from 'lucide-react';

interface TeamsListProps {
  teamsList: any[];
  newTeamName: string;
  setNewTeamName: (val: string) => void;
  onCreateTeam: () => void;
  expandedTeamId: string | null;
  setExpandedTeamId: (id: string | null) => void;
  teamMembersNames: Record<string, string>;
  teamMemberInput: string;
  setTeamMemberInput: (val: string) => void;
  onAddMember: (teamId: string) => void;
  onRemoveMember: (teamId: string, uidMember: string) => void;
  onDeleteTeam: (teamId: string) => void;
  onLeaveTeam: (teamId: string) => void;
  currentUserId: string;
}

export function TeamsList({
  teamsList, newTeamName, setNewTeamName, onCreateTeam,
  expandedTeamId, setExpandedTeamId, teamMembersNames,
  teamMemberInput, setTeamMemberInput, onAddMember, onRemoveMember, onDeleteTeam,
  onLeaveTeam, currentUserId
}: TeamsListProps) {

  const toggleExpand = (id: string) => {
    if (expandedTeamId === id) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(id);
    }
  };

  // Estilo "Dark Mode" para os Inputs (Igual ao form de músicas)
  const darkInputStyle = {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #4b5563', // Borda cinza médio
    backgroundColor: '#374151',   // Fundo cinza escuro
    color: '#ffffff',             // Texto branco
    fontSize: '14px',
    outline: 'none',
    width: '100%'
  };

  return (
    <div className="teams-list-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h3>Minhas Equipes</h3>

      {/* ÁREA DE CRIAR EQUIPE */}
      <div className="new-team-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Nome da nova equipe..."
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="form-control"
          style={{ ...darkInputStyle, flex: 1 }} // Aplicando estilo dark
        />
        <button onClick={onCreateTeam} className="btn btn-primary" disabled={!newTeamName.trim()}>
          <Plus size={18} /> Criar
        </button>
      </div>

      <div className="teams-grid">
        {teamsList.map(team => {
          const isOwner = team.ownerId === currentUserId;
          const isExpanded = expandedTeamId === team.id;

          return (
            <div key={team.id} className="team-card" style={{ 
              border: '1px solid #374151', borderRadius: '8px', marginBottom: '10px', 
              backgroundColor: '#1f2937', // Card Escuro
              color: '#f3f4f6',           // Texto Claro
              overflow: 'hidden' 
            }}>
              {/* Header do Card */}
              <div 
                className="team-header" 
                onClick={() => toggleExpand(team.id)}
                style={{ 
                  padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', backgroundColor: '#111827', // Header um pouco mais escuro que o corpo
                  color: '#f3f4f6'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={20} color="#9ca3af" />
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{team.name}</span>
                  {!isOwner && <span style={{fontSize:'12px', background:'#374151', padding:'2px 6px', borderRadius:'4px', color:'#d1d5db'}}>Membro</span>}
                  {isOwner && <span style={{fontSize:'12px', background:'#064e3b', padding:'2px 6px', borderRadius:'4px', color:'#6ee7b7'}}>Dono</span>}
                </div>
                {isExpanded ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
              </div>

              {/* Detalhes (Expandido) */}
              {isExpanded && (
                <div className="team-body" style={{ padding: '15px', borderTop: '1px solid #374151' }}>
                  
                  {/* Lista de Membros */}
                  <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: '#9ca3af', fontWeight: '600' }}>Integrantes:</h5>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {team.members.map((uid: string) => (
                        <li key={uid} style={{ 
                          padding: '8px', borderBottom: '1px solid #374151', 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          color: '#e5e7eb'
                        }}>
                          <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                            {uid === currentUserId ? <strong style={{color:'#60a5fa'}}>Você</strong> : (teamMembersNames[uid] || 'Carregando...')}
                            {uid === team.ownerId && <span style={{fontSize:'10px', color:'#34d399', border:'1px solid #34d399', padding:'0 4px', borderRadius:'4px'}}>DONO</span>}
                          </span>
                          
                          {isOwner && uid !== currentUserId && (
                            <button 
                              onClick={() => onRemoveMember(team.id, uid)}
                              className="btn-icon-danger"
                              title="Remover membro"
                              style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer' }}
                            >
                              <UserMinus size={16} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Área de Adicionar Membro */}
                  {isOwner && (
                    <div style={{ 
                      display: 'flex', gap: '10px', marginTop: '15px', padding:'10px', 
                      background:'#111827', borderRadius:'6px', border: '1px solid #374151' 
                    }}>
                      <input 
                        type="text" 
                        placeholder="Cole o UID do usuário..."
                        value={teamMemberInput}
                        onChange={(e) => setTeamMemberInput(e.target.value)}
                        style={{ ...darkInputStyle, flex: 1 }} // Estilo Dark
                      />
                      <button onClick={() => onAddMember(team.id)} className="btn btn-secondary btn-sm" style={{whiteSpace: 'nowrap'}}>Add Membro</button>
                    </div>
                  )}

                  {/* Ações de Rodapé */}
                  <div style={{ marginTop: '20px', borderTop:'1px solid #374151', paddingTop:'15px', display:'flex', justifyContent:'flex-end' }}>
                    {isOwner ? (
                      <button onClick={() => onDeleteTeam(team.id)} className="btn btn-danger btn-sm" style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                        <Trash2 size={16} /> Excluir Equipe
                      </button>
                    ) : (
                      <button onClick={() => onLeaveTeam(team.id)} className="btn btn-outline-danger btn-sm" style={{ display:'flex', alignItems:'center', gap:'5px', color:'#f87171', border:'1px solid #f87171', background:'transparent', padding:'6px 12px', borderRadius:'4px', cursor:'pointer' }}>
                        <LogOut size={16} /> Sair da Equipe
                      </button>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
        {teamsList.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '20px' }}>Você ainda não participa de nenhuma equipe.</p>}
      </div>
    </div>
  );
}