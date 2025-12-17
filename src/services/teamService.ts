import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

// --- CORREÇÃO: Exportando a interface Team que estava faltando ---
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt?: string; // Opcional, pois nem sempre usamos no front
}

// Cria uma nova equipe
export async function createTeam(teamName: string, ownerId: string) {
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      name: teamName,
      ownerId: ownerId,
      members: [ownerId], // O dono começa como membro
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, name: teamName, ownerId, members: [ownerId] };
  } catch (error) {
    console.error("Erro ao criar equipe:", error);
    throw error;
  }
}

// Busca equipes onde o usuário é membro (não apenas dono)
export async function getMyTeams(userId: string): Promise<Team[]> {
  try {
    const teamsRef = collection(db, 'teams');
    // Consulta: array "members" contém o userId
    const q = query(teamsRef, where("members", "array-contains", userId));
    
    const querySnapshot = await getDocs(q);
    
    // Mapeia para o tipo Team
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        members: data.members || [],
        createdAt: data.createdAt
      } as Team;
    });
  } catch (error) {
    console.error("Erro ao buscar equipes:", error);
    throw error;
  }
}

export async function deleteTeam(teamId: string) {
  try {
    await deleteDoc(doc(db, 'teams', teamId));
  } catch (error) {
    console.error("Erro ao excluir equipe:", error);
    throw error;
  }
}

export async function addMemberToTeam(teamId: string, newMemberUid: string) {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      members: arrayUnion(newMemberUid)
    });
  } catch (error) {
    console.error("Erro ao adicionar membro:", error);
    throw error;
  }
}

export async function removeMemberFromTeam(teamId: string, memberUid: string) {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      members: arrayRemove(memberUid)
    });
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    throw error;
  }
}

export async function getTeamMembers(teamId: string): Promise<string[]> {
    try {
        const teamRef = doc(db, 'teams', teamId);
        const snap = await getDoc(teamRef);
        if(snap.exists()) {
            return snap.data().members || [];
        }
        return [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

// Função para sair da equipe (alias para remover a si mesmo)
export async function leaveTeam(teamId: string, uidToRemove: string) {
  return removeMemberFromTeam(teamId, uidToRemove);
}