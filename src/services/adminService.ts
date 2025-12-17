// src/services/adminService.ts
import { collection, getDocs, query, where } from 'firebase/firestore'; // Removido 'doc' que não estava sendo usado
import { db } from '../firebase';

export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  lastAccess?: string;
}

export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef); 
    
    const snapshot = await getDocs(q);
    
    const users: UserData[] = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        uid: data.uid,
        displayName: data.displayName || 'Sem Nome',
        email: data.email || 'Sem Email',
        lastAccess: data.lastAccess || 'Nunca/Antigo'
      };
    });

    return users.sort((a, b) => {
        if (!a.lastAccess) return 1;
        if (!b.lastAccess) return -1;
        return new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime();
    });

  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    throw error;
  }
}

// --- FUNÇÃO DE EXPORTAÇÃO ---

export async function exportDataToCSV(usersToExport: UserData[]) {
  const rows: any[] = [];

  // Cabeçalho do CSV
  const headers = [
    "Usuario Nome",
    "Usuario Email",
    "Repertorio Nome",
    "Compartilhado?",
    "Musica Titulo",
    "Musica Tom",
    "Musica Vocal",
    "Link YouTube",
    "Link Cifra",
    "Anotacoes"
  ];

  rows.push(headers.join(","));

  for (const user of usersToExport) {
    try {
      // 1. Buscar Repertórios do Usuário
      const repRef = collection(db, 'repertoires');
      const repQuery = query(repRef, where('userId', '==', user.uid));
      const repSnap = await getDocs(repQuery);

      if (repSnap.empty) {
        // Se não tem repertório, adiciona linha apenas com dados do usuário
        const row = [
            `"${user.displayName}"`,
            `"${user.email}"`,
            "Nenhum", "Nao", "-", "-", "-", "-", "-", "-"
        ];
        rows.push(row.join(","));
        continue;
      }

      for (const repDoc of repSnap.docs) {
        const repData = repDoc.data();
        const repName = repData.name || "Sem Nome";
        const isShared = repData.sharedWith && repData.sharedWith.length > 0 ? "Sim" : "Nao";

        // 2. Buscar Músicas do Repertório (Subcoleção)
        // Usamos o ID do documento do repertório para acessar a subcoleção 'songs'
        const songsRef = collection(db, 'repertoires', repDoc.id, 'songs');
        const songsSnap = await getDocs(songsRef);

        if (songsSnap.empty) {
            // Repertório vazio
            const row = [
                `"${user.displayName}"`,
                `"${user.email}"`,
                `"${repName}"`,
                isShared,
                "(Vazio)", "-", "-", "-", "-", "-"
            ];
            rows.push(row.join(","));
        } else {
            // Loop pelas músicas
            songsSnap.forEach(songDoc => {
                const s = songDoc.data();
                
                // Limpar campos de texto para evitar quebrar o CSV
                const clean = (text: string) => text ? `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"` : '""';

                const row = [
                    clean(user.displayName),
                    clean(user.email),
                    clean(repName),
                    isShared,
                    clean(s.title),
                    clean(s.key),
                    clean(s.vocalistName || repData.defaultVocalistName),
                    clean(s.youtubeUrl),
                    clean(s.chordUrl),
                    clean(s.notes)
                ];
                rows.push(row.join(","));
            });
        }
      }
    } catch (e) {
      console.error(`Erro ao exportar dados de ${user.email}`, e);
    }
  }

  return rows.join("\n");
}