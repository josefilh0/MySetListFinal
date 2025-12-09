import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export type Team = {
    id: string;
    name: string;
    ownerId: string;
    members: string[]; // Lista de UIDs
};

const TEAMS_COLLECTION = 'teams';

export async function createTeam(name: string, ownerId: string): Promise<string> {
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
        name,
        ownerId,
        members: [],
        createdAt: new Date()
    });
    return docRef.id;
}

export async function getMyTeams(ownerId: string): Promise<Team[]> {
    const q = query(collection(db, TEAMS_COLLECTION), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Team));
}

export async function addMemberToTeam(teamId: string, memberUid: string) {
    const ref = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(ref, {
        members: arrayUnion(memberUid)
    });
}

export async function removeMemberFromTeam(teamId: string, memberUid: string) {
    const ref = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(ref, {
        members: arrayRemove(memberUid)
    });
}

export async function deleteTeam(teamId: string) {
    await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
}

// Helper para pegar membros de uma equipe específica
export async function getTeamMembers(teamId: string): Promise<string[]> {
    const ref = doc(db, TEAMS_COLLECTION, teamId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data().members || [];
    }
    return [];
}