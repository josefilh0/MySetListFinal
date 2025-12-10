import React from 'react';
import type { FormEvent } from 'react'; 
import type { Team } from '../services/teamService';
import { Users, Plus, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp } from 'lucide-react'; // <--- ÍCONES

interface TeamsListProps {
  teamsList: Team[];
  newTeamName: string;
  setNewTeamName: (val: string) => void;
  onCreateTeam: (e: FormEvent) => void;
  expandedTeamId: string | null;
  setExpandedTeamId: (id: string | null) => void;
  teamMembersNames: Record<string, string>;
  teamMemberInput: string;
  setTeamMemberInput: (val: string) => void;
  onAddMember: (teamId: string) => void;
  onRemoveMember: (teamId: string, uid: string) => void;
  onDeleteTeam: (teamId: string) => void;
}

export const TeamsList: React.FC<TeamsListProps> = ({
  teamsList,
  newTeamName, setNewTeamName, onCreateTeam,
  expandedTeamId, setExpandedTeamId, teamMembersNames,
  teamMemberInput, setTeamMemberInput, onAddMember, onRemoveMember, onDeleteTeam
}) => {

  return (
    <div style={{ paddingTop: 16 }}>
        <h3>Gerenciar Equipes</h3>
        <p style={{fontSize: 13, color: '#888', marginBottom: 16}}>
            Agrupe pessoas para compartilhar repertórios com um clique.
        </p>

        {/* FORMULÁRIO DE CRIAÇÃO */}
        <form onSubmit={onCreateTeam} style={{display: 'flex', gap: 8, marginBottom: 20}}>
            <input 
                type="text" 
                placeholder="Nome da equipe (ex: Louvor)" 
                value={newTeamName} 
                onChange={e => setNewTeamName(e.target.value)} 
                className="input-field" 
                style={{flex: 1}} 
            />
            <button type="submit" className="btn btn-purple">
                <Plus size={18} style={{marginRight: 4}}/> Criar
            </button>
        </form>

        {/* LISTA DE TIMES */}
        <ul className="list-unstyled">
            {teamsList.map(team => (
                <li key={team.id} className="team-card">
                    <div 
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} 
                        onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                    >
                        <div style={{display:'flex', alignItems: 'center', gap: 8}}>
                             <Users size={18} color="#aaa"/>
                             <strong>{team.name}</strong>
                             <small style={{color:'#666', background: '#222', padding: '2px 6px', borderRadius: 10}}>{team.members.length} membros</small>
                        </div>
                        {expandedTeamId === team.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </div>
                    
                    {expandedTeamId === team.id && (
                        <div style={{marginTop: 15, borderTop: '1px solid #333', paddingTop: 15}}>
                            <ul className="list-unstyled" style={{marginBottom: 15, paddingLeft: 5}}>
                                {team.members.map(memberUid => (
                                    <li key={memberUid} style={{fontSize: 13, marginBottom: 8, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid #222', paddingBottom: 4}}>
                                        <span>{teamMembersNames[memberUid] || memberUid}</span>
                                        <button 
                                            onClick={() => onRemoveMember(team.id, memberUid)} 
                                            style={{color: '#ef4444', background:'none', border:'none', cursor:'pointer'}}
                                            title="Remover membro"
                                        >
                                            <UserMinus size={16}/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            
                            <div style={{display: 'flex', gap: 5, marginBottom: 15}}>
                                <input 
                                    type="text" 
                                    placeholder="UID do novo membro" 
                                    value={teamMemberInput} 
                                    onChange={e => setTeamMemberInput(e.target.value)} 
                                    className="input-field" 
                                    style={{padding:6}} 
                                />
                                <button onClick={() => onAddMember(team.id)} className="btn btn-primary btn-sm"><UserPlus size={16}/></button>
                            </div>
                            
                            <button 
                                onClick={() => onDeleteTeam(team.id)} 
                                className="btn btn-danger btn-sm" 
                                style={{width:'100%', background:'transparent', border: '1px solid #ef4444', display: 'flex', justifyContent: 'center', gap: 6}}
                            >
                                <Trash2 size={14}/> Excluir Equipe
                            </button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    </div>
  );
};