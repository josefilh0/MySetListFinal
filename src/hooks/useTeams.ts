import { useState, useEffect } from 'react';
import type { FormEvent } from 'react'; // Importação do tipo separada
import { 
  createTeam, 
  getMyTeams, 
  addMemberToTeam, 
  removeMemberFromTeam, 
  deleteTeam,
  type Team 
} from '../services/teamService';
import { getUserNames } from '../services/repertoireService';

export function useTeams(user: any) {
  // --- ESTADOS ---
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamMemberInput, setTeamMemberInput] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembersNames, setTeamMembersNames] = useState<Record<string, string>>({});

  // --- EFEITOS ---
  
  // 1. Carrega lista de times ao logar
  useEffect(() => {
    if (user) {
      reloadTeamsList();
    } else {
      setTeamsList([]);
    }
  }, [user]);

  // 2. Carrega nomes dos membros quando expande um time
  useEffect(() => {
    const loadTeamMemberNames = async () => {
      if (expandedTeamId) {
        const team = teamsList.find(t => t.id === expandedTeamId);
        if (team && team.members.length > 0) {
          try {
            const names = await getUserNames(team.members);
            setTeamMembersNames(names);
          } catch (e) {
            console.error("Erro ao buscar nomes", e);
          }
        }
      }
    };
    loadTeamMemberNames();
  }, [expandedTeamId, teamsList]);

  // --- ACTIONS ---

  async function reloadTeamsList() {
    if (!user) return;
    try {
      const teams = await getMyTeams(user.uid);
      setTeamsList(teams);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar equipes.');
    }
  }

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    try {
      await createTeam(newTeamName.trim(), user.uid);
      setNewTeamName('');
      await reloadTeamsList();
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm('Excluir esta equipe?')) return;
    try {
      await deleteTeam(teamId);
      await reloadTeamsList();
      if (expandedTeamId === teamId) setExpandedTeamId(null);
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  }

  async function handleAddMemberToTeam(teamId: string) {
    if (!teamMemberInput.trim()) return;
    try {
      await addMemberToTeam(teamId, teamMemberInput.trim());
      setTeamMemberInput('');
      await reloadTeamsList();
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  }

  async function handleRemoveMemberFromTeam(teamId: string, memberUid: string) {
    if (!window.confirm('Remover membro?')) return;
    try {
      await removeMemberFromTeam(teamId, memberUid);
      await reloadTeamsList();
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  }

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
    reloadTeamsList // Exportamos caso o App precise forçar recarga
  };
}