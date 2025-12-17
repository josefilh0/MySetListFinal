// src/hooks/useTeams.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  createTeam, 
  getMyTeams, 
  deleteTeam, 
  addMemberToTeam, 
  removeMemberFromTeam, 
  leaveTeam // Importando a nova função
} from '../services/teamService';
import { getUserNames } from '../services/repertoireService';

export function useTeams(user: any) {
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamMemberInput, setTeamMemberInput] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembersNames, setTeamMembersNames] = useState<Record<string, string>>({});

  const reloadTeamsList = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyTeams(user.uid);
      setTeamsList(data);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  // Carrega nomes dos membros quando expande uma equipe
  useEffect(() => {
    if (expandedTeamId && teamsList.length > 0) {
        const team = teamsList.find(t => t.id === expandedTeamId);
        if (team && team.members) {
            getUserNames(team.members).then(namesMap => {
                setTeamMembersNames(prev => ({ ...prev, ...namesMap }));
            });
        }
    }
  }, [expandedTeamId, teamsList]);

  useEffect(() => {
    reloadTeamsList();
  }, [reloadTeamsList]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    try {
      await createTeam(newTeamName, user.uid);
      setNewTeamName('');
      reloadTeamsList();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta equipe?")) return;
    try {
      await deleteTeam(teamId);
      reloadTeamsList();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleAddMemberToTeam = async (teamId: string) => {
    if (!teamMemberInput.trim()) return;
    try {
      await addMemberToTeam(teamId, teamMemberInput.trim());
      setTeamMemberInput('');
      reloadTeamsList();
      alert("Membro adicionado!");
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleRemoveMemberFromTeam = async (teamId: string, uidMember: string) => {
    if (!window.confirm("Remover este membro?")) return;
    try {
      await removeMemberFromTeam(teamId, uidMember);
      reloadTeamsList();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  // NOVO: Handler para sair da equipe
  const handleLeaveTeam = async (teamId: string) => {
    if (!user) return;
    if (!window.confirm("Tem certeza que deseja sair desta equipe?")) return;

    try {
      await leaveTeam(teamId, user.uid);
      setExpandedTeamId(null); // Fecha o card
      await reloadTeamsList(); // Atualiza a lista
    } catch (error: any) {
      alert("Erro ao sair da equipe: " + error.message);
    }
  };

  return {
    teamsList,
    newTeamName, setNewTeamName,
    teamMemberInput, setTeamMemberInput,
    expandedTeamId, setExpandedTeamId,
    teamMembersNames,
    handleCreateTeam,
    handleDeleteTeam,
    handleAddMemberToTeam,
    handleRemoveMemberFromTeam,
    handleLeaveTeam, // Exportando
    reloadTeamsList 
  };
}