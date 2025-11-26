import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export type RepertoireSummary = {
  id: string;
  name: string;
  defaultVocalistName?: string;
  isFavorite?: boolean;
};

// Lista todos os repertórios (para o menu lateral)
export async function getAllRepertoires(): Promise<RepertoireSummary[]> {
  const coll = collection(db, 'repertoires');
  const snap = await getDocs(coll);

  const reps: RepertoireSummary[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    reps.push({
      id: d.id,
      name: data.name,
      defaultVocalistName: data.defaultVocalistName || '',
      isFavorite: !!data.isFavorite,
    });
  });

  return reps;
}

// Busca 1 repertório + músicas
export async function getRepertoireWithSongs(repertoireId: string) {
  const repRef = doc(db, 'repertoires', repertoireId);
  const repSnap = await getDoc(repRef);

  if (!repSnap.exists()) {
    throw new Error('Repertório não encontrado');
  }

  const repertoire = { id: repSnap.id, ...(repSnap.data() as any) };

  const songsQuery = query(
    collection(db, 'repertoires', repertoireId, 'songs'),
    orderBy('order', 'asc')
  );

  const songsSnap = await getDocs(songsQuery);
  const songs: any[] = [];
  songsSnap.forEach((d) => songs.push({ id: d.id, ...(d.data() as any) }));

  return { repertoire, songs };
}

// Cria um novo repertório
export async function createRepertoire(
  name: string,
  defaultVocalistName: string
) {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'repertoires'), {
    name,
    defaultVocalistName,
    ownerType: 'user',
    ownerId: 'USER_DE_TESTE', // depois trocamos pelo uid real
    createdBy: 'USER_DE_TESTE',
    createdAt: now,
    isFavorite: false,
  });

  return docRef.id;
}

// Atualiza nome e vocalista padrão de um repertório
export async function updateRepertoire(
  id: string,
  name: string,
  defaultVocalistName: string
) {
  const ref = doc(db, 'repertoires', id);

  await updateDoc(ref, {
    name,
    defaultVocalistName,
  });
}

// Define / remove favorito
export async function setRepertoireFavorite(id: string, isFavorite: boolean) {
  const ref = doc(db, 'repertoires', id);
  await updateDoc(ref, { isFavorite });
}

// Exclui repertório e suas músicas da subcoleção
export async function deleteRepertoire(id: string) {
  // 1) apagar músicas da subcoleção
  const songsSnap = await getDocs(collection(db, 'repertoires', id, 'songs'));
  for (const docSnap of songsSnap.docs) {
    await deleteDoc(docSnap.ref);
  }

  // 2) apagar o próprio repertório
  await deleteDoc(doc(db, 'repertoires', id));
}

// --------- MÚSICAS DO REPERTÓRIO ---------

export type RepertoireSongInput = {
  title: string;
  youtubeUrl: string;
  chordUrl: string;
  key: string;
  vocalistName: string;
  notes: string;
  order: number;
};

// Adiciona música ao repertório
export async function addSongToRepertoire(
  repertoireId: string,
  song: RepertoireSongInput
) {
  const now = new Date().toISOString();

  await addDoc(collection(db, 'repertoires', repertoireId, 'songs'), {
    ...song,
    createdAt: now,
  });
}

// Atualiza música do repertório
export async function updateSongInRepertoire(
  repertoireId: string,
  songDocId: string,
  song: Omit<RepertoireSongInput, 'order'>
) {
  const ref = doc(db, 'repertoires', repertoireId, 'songs', songDocId);

  await updateDoc(ref, {
    ...song,
  });
}

// Exclui música do repertório
export async function deleteSongFromRepertoire(
  repertoireId: string,
  songDocId: string
) {
  const ref = doc(db, 'repertoires', repertoireId, 'songs', songDocId);
  await deleteDoc(ref);
}

// Atualiza a ordem de várias músicas de uma vez
export async function updateSongsOrder(
  repertoireId: string,
  songs: { id: string; order: number }[]
) {
  for (const song of songs) {
    const ref = doc(db, 'repertoires', repertoireId, 'songs', song.id);
    await updateDoc(ref, { order: song.order });
  }
}
