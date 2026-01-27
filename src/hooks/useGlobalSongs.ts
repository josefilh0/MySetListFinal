import { useState, useEffect } from 'react';
// Caminho ajustado: voltando um nível (../) para encontrar o firebase.ts na raiz da src
import { db } from '../firebase'; 
import { collection, query, where, getDocs } from 'firebase/firestore';

export function useGlobalSongs(user: any) {
  const [allSongs, setAllSongs] = useState<{id: string, title: string, vocalistName?: string}[]>([]);

  useEffect(() => {
    async function loadAllSongs() {
      if (!user?.uid) {
        setAllSongs([]);
        return;
      }
      
      try {
        console.log("📡 Buscando acervo completo para o Assistente...");
        
        const repQuery = query(collection(db, 'repertoires'), where('userId', '==', user.uid));
        const repSnap = await getDocs(repQuery);
        
        const tempSongs: any[] = [];
        const promises = repSnap.docs.map(async (repDoc) => {
          const songsSnap = await getDocs(collection(repDoc.ref, 'songs'));
          songsSnap.forEach(songDoc => {
            const data = songDoc.data();
            tempSongs.push({ 
              id: songDoc.id, 
              title: data.title || "Sem título", 
              vocalistName: data.vocalistName || "" 
            });
          });
        });

        await Promise.all(promises);
        const uniqueSongs = Array.from(new Map(tempSongs.map(s => [s.id, s])).values());
        
        console.log(`✅ ${uniqueSongs.length} músicas carregadas no frontend.`);
        setAllSongs(uniqueSongs);
      } catch (e) {
        console.error("❌ Erro ao carregar acervo:", e);
      }
    }

    loadAllSongs();
  }, [user?.uid]);

  return allSongs;
}