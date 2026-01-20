import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  runTransaction,
  arrayUnion, 
  arrayRemove,
} from 'firebase/firestore';

// --- CORREÇÃO AQUI: Voltamos para '../firebase' ---
import { db } from '../firebase'; 

export type RepertoireSummary = {
  id: string;
  name: string;
  defaultVocalistName: string;
  isFavorite: boolean;
  userId: string;
  isOwner: boolean;
  sharedWith: string[];
};

type SongOrderUpdate = {
  id: string;
  order: number;
};

const REPERTOIRES_COLLECTION = 'repertoires';

// --- Leitura ---

export async function getAllRepertoires(uid: string): Promise<RepertoireSummary[]> {
  try {
    // 1. Busca repertórios onde o usuário é o proprietário
    const ownerQuery = query(
      collection(db, REPERTOIRES_COLLECTION),
      where('userId', '==', uid)
    );
    const ownerSnapshot = await getDocs(ownerQuery);

    // 2. Busca repertórios compartilhados com o usuário
    const sharedQuery = query(
        collection(db, REPERTOIRES_COLLECTION),
        where('sharedWith', 'array-contains', uid)
    );
    const sharedSnapshot = await getDocs(sharedQuery);
    
    // Combina os resultados dos proprietários e dos compartilhados
    const allDocs = [...ownerSnapshot.docs, ...sharedSnapshot.docs];

    // Remove duplicatas (caso haja inconsistência no banco)
    const uniqueDocs = Array.from(new Set(allDocs.map(doc => doc.id)))
        .map(id => allDocs.find(doc => doc.id === id)!);

    return uniqueDocs.map((docSnap) => {
      const data = docSnap.data() as any;
      const isOwner = data.userId === uid;
      return {
        id: docSnap.id,
        name: data.name || '',
        defaultVocalistName: data.defaultVocalistName || '',
        isFavorite: !!data.isFavorite,
        userId: data.userId, 
        isOwner: isOwner, 
        sharedWith: data.sharedWith || [], 
      };
    });
  } catch (e) {
    console.error('Erro ao buscar repertórios:', e);
    throw new Error('Falha ao carregar repertórios.');
  }
}

export async function getRepertoireWithSongs(repertoireId: string, currentUserId: string) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    const repSnap = await getDoc(repRef);

    if (!repSnap.exists()) {
      throw new Error('Repertório não encontrado.');
    }

    const repertoireData = repSnap.data() as any;
    
    // Verifica permissão (Dono OU Compartilhado)
    const isOwner = repertoireData.userId === currentUserId;
    const isShared = repertoireData.sharedWith && repertoireData.sharedWith.includes(currentUserId);

    if (!isOwner && !isShared) {
        throw new Error('Permissão negada.');
    }

    const songsCollection = collection(repRef, 'songs');
    const songsQuery = query(songsCollection, orderBy('order', 'asc'));
    const songsSnapshot = await getDocs(songsQuery);

    const songs = songsSnapshot.docs.map((songDoc) => ({
      ...songDoc.data(), // Primeiro os dados do banco
      id: songDoc.id,    // O ID real do Firestore por último para garantir que ele prevaleça
    }));

    return {
      repertoire: { 
        id: repSnap.id, 
        ...repertoireData, 
        isOwner: isOwner, 
        sharedWith: repertoireData.sharedWith || [],
      },
      songs: songs,
    };
  } catch (e) {
    console.error('Erro ao buscar repertório com músicas:', e);
    throw new Error('Falha ao carregar o repertório detalhado.');
  }
}

// --- Escrita ---

export async function createRepertoire(
  uid: string,
  name: string,
  defaultVocalistName: string
): Promise<string> {
  try {
    const repRef = await addDoc(collection(db, REPERTOIRES_COLLECTION), {
      userId: uid, // Mantendo userId conforme seu banco atual
      name,
      defaultVocalistName,
      isFavorite: false,
      createdAt: new Date(),
      sharedWith: [], 
    });
    return repRef.id;
  } catch (e) {
    console.error('Erro ao criar repertório:', e);
    throw new Error('Falha ao criar novo repertório.');
  }
}

export async function addSongToRepertoire(repertoireId: string, songData: any) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    const songsCollection = collection(repRef, 'songs');
    // retorna a referência criada
    const newDocRef = await addDoc(songsCollection, { ...songData, createdAt: new Date() });
    return newDocRef;
  } catch (e) {
    console.error('Erro ao adicionar música:', e);
    throw new Error('Falha ao adicionar música ao repertório.');
  }
}

export async function updateRepertoire(repertoireId: string, name: string, defaultVocalistName: string) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    await updateDoc(repRef, { name, defaultVocalistName });
  } catch (e) {
    console.error('Erro ao atualizar repertório:', e);
    throw new Error('Falha ao atualizar repertório.');
  }
}

export async function setRepertoireFavorite(repertoireId: string, isFavorite: boolean) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    await updateDoc(repRef, { isFavorite });
  } catch (e) {
    console.error('Erro ao marcar favorito:', e);
    throw new Error('Falha ao atualizar status de favorito.');
  }
}

export async function updateSongInRepertoire(repertoireId: string, songId: string, songData: any) {
  try {
    const songRef = doc(db, REPERTOIRES_COLLECTION, repertoireId, 'songs', songId);
    await updateDoc(songRef, songData);
  } catch (e) {
    console.error('Erro ao atualizar música:', e);
    throw new Error('Falha ao atualizar a música.');
  }
}

export async function deleteRepertoire(repertoireId: string) {
    try {
        const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
        await deleteDoc(repRef);
    } catch (e) {
        console.error('Erro ao deletar repertório:', e);
        throw new Error('Falha ao deletar repertório.');
    }
}

export async function deleteSongFromRepertoire(repertoireId: string, songId: string) {
    try {
        const songRef = doc(db, REPERTOIRES_COLLECTION, repertoireId, 'songs', songId);
        await deleteDoc(songRef);
    } catch (e) {
        console.error('Erro ao deletar música:', e);
        throw new Error('Falha ao deletar música.');
    }
}

export async function updateSongsOrder(repertoireId: string, updates: SongOrderUpdate[]) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    await runTransaction(db, async (transaction) => {
      updates.forEach((update) => {
        const songRef = doc(repRef, 'songs', update.id);
        transaction.update(songRef, { order: update.order });
      });
    });
  } catch (e) {
    console.error('Erro ao reordenar músicas:', e);
    throw new Error('Falha ao salvar ordem das músicas.');
  }
}

export async function shareRepertoireWithUser(repertoireId: string, userToShareUid: string) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    await updateDoc(repRef, { 
        sharedWith: arrayUnion(userToShareUid) 
    });
  } catch (e) {
    console.error('Erro ao compartilhar repertório:', e);
    throw new Error('Falha ao compartilhar repertório.');
  }
}

export async function unshareRepertoireWithUser(repertoireId: string, userToRemoveUid: string) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    await updateDoc(repRef, { 
        sharedWith: arrayRemove(userToRemoveUid) 
    });
  } catch (e) {
    console.error('Erro ao remover compartilhamento:', e);
    throw new Error('Falha ao remover compartilhamento do repertório.');
  }
}

// --- FUNÇÃO PARA PEGAR NOMES ---
export async function getUserNames(uids: string[]): Promise<Record<string, string>> {
  if (!uids || uids.length === 0) return {};

  const namesMap: Record<string, string> = {};
  
  const promises = uids.map(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        namesMap[uid] = data.displayName || data.email || uid;
      } else {
        namesMap[uid] = uid; 
      }
    } catch (e) {
      console.warn(`Aviso: Não foi possível buscar nome para ${uid}.`);
      namesMap[uid] = uid; 
    }
  });

  await Promise.all(promises);
  return namesMap;
}

export async function leaveRepertoire(repertoireId: string, currentUserId: string) {
  try {
    const repRef = doc(db, 'repertoires', repertoireId);
    // Remove o ID do usuário atual da lista de compartilhamento
    await updateDoc(repRef, { 
        sharedWith: arrayRemove(currentUserId) 
    });
  } catch (e) {
    console.error('Erro ao sair do repertório:', e);
    throw new Error('Falha ao sair do repertório.');
  }
}

export async function syncAllDataForOffline(userId: string) {
  try {
    // 1. Busca todos os repertórios do usuário (Owner)
    const q = query(collection(db, 'repertoires'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    // 2. Para cada repertório, busca as músicas (Songs)
    // Usamos Promise.all para fazer tudo "ao mesmo tempo" e ser mais rápido
    const promises = querySnapshot.docs.map(async (repDoc) => {
      const songsRef = collection(db, 'repertoires', repDoc.id, 'songs');
      await getDocs(songsRef); // Só de chamar o getDocs, o Firebase já salva no cache!
    });

    // 3. Busca também repertórios compartilhados com o usuário
    const qShared = query(collection(db, 'repertoires'), where('sharedWith', 'array-contains', userId));
    const sharedSnapshot = await getDocs(qShared);
    
    const sharedPromises = sharedSnapshot.docs.map(async (repDoc) => {
      const songsRef = collection(db, 'repertoires', repDoc.id, 'songs');
      await getDocs(songsRef);
    });

    // Aguarda tudo terminar
    await Promise.all([...promises, ...sharedPromises]);

    return true;
  } catch (error) {
    console.error("Erro ao sincronizar:", error);
    throw error;
  }
}