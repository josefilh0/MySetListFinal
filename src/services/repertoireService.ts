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
} from 'firebase/firestore';
import { db } from '../firebase';

export type RepertoireSummary = {
  id: string;
  name: string;
  defaultVocalistName: string;
  isFavorite: boolean;
};

type SongOrderUpdate = {
  id: string;
  order: number;
};

const REPERTOIRES_COLLECTION = 'repertoires';

// --- Leitura ---

export async function getAllRepertoires(uid: string): Promise<RepertoireSummary[]> {
  try {
    const q = query(
      collection(db, REPERTOIRES_COLLECTION),
      where('userId', '==', uid)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        name: data.name || '',
        defaultVocalistName: data.defaultVocalistName || '',
        isFavorite: !!data.isFavorite,
      };
    });
  } catch (e) {
    console.error('Erro ao buscar repertórios:', e);
    throw new Error('Falha ao carregar repertórios.');
  }
}

export async function getRepertoireWithSongs(repertoireId: string) {
  try {
    const repRef = doc(db, REPERTOIRES_COLLECTION, repertoireId);
    const repSnap = await getDoc(repRef);

    if (!repSnap.exists()) {
      throw new Error('Repertório não encontrado.');
    }

    const songsCollection = collection(repRef, 'songs');
    const songsQuery = query(songsCollection, orderBy('order', 'asc'));
    const songsSnapshot = await getDocs(songsQuery);

    const songs = songsSnapshot.docs.map((songDoc) => ({
      id: songDoc.id,
      ...songDoc.data(),
    }));

    return {
      repertoire: { id: repSnap.id, ...repSnap.data() },
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
      userId: uid,
      name,
      defaultVocalistName,
      isFavorite: false,
      createdAt: new Date(),
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
    await addDoc(songsCollection, { ...songData, createdAt: new Date() });
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
        // Nota: O Firestore não deleta subcoleções automaticamente. 
        // Para um app simples, deletamos o documento pai. As músicas ficarão "órfãs" mas inacessíveis.
        // Em produção, deve-se deletar as subcoleções manualmente ou via Cloud Function.
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