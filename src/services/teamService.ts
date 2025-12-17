// src/services/teamService.ts
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
export async function getMyTeams(userId: string) {
  try {
    const teamsRef = collection(db, 'teams');
    // Consulta: array "members" contém o userId
    const q = query(teamsRef, where("members", "array-contains", userId));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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
    
    // Opcional: Verificar se o usuário existe na coleção 'users' antes de adicionar
    // Para simplificar, assumimos que o UID está correto ou foi validado
    
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

// --- AQUI ESTAVA FALTANDO ESSA FUNÇÃO ---
// NOVA FUNÇÃO: Sair da equipe (alias para remover a si mesmo)
export async function leaveTeam(teamId: string, uidToRemove: string) {
  return removeMemberFromTeam(teamId, uidToRemove);
}