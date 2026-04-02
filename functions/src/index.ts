import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!admin.apps.length) admin.initializeApp();

// --- BUSCA CIFRA CLUB ---
export const getCifraClubChords = functions.https.onCall(async (request) => {
  const url = request.data.url;
  try {
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..." },
    });
    const $ = cheerio.load(html);
    let chords = $("pre").text() || $(".cifra_cnt").text();
    return { success: true, content: chords.trim() };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", "Erro ao buscar cifra.");
  }
});

// --- GERAÇÃO DE TAGS VIA IA ---
export const generateSongTags = functions.https.onCall(
  { secrets: ["GOOGLE_API_KEY"] },
  async (request) => {
    const { title, artist, chords } = request.data;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) throw new functions.https.HttpsError("unauthenticated", "Chave ausente.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0.4, maxOutputTokens: 150 }
    });

    // Lê a LETRA COMPLETA — remove apenas os acordes musicais (Am, G, F#m etc.) para não confundir a IA
    const fullLyrics = (chords || "")
      .replace(/^[A-G][#b]?(?:m|maj|dim|aug|sus|add)?[\d]*(?:\/[A-G][#b]?)?[ \t]*$/gm, "") // Remove linhas só com acordes
      .replace(/[ \t]{2,}/g, " ")   // Colapsa espaços múltiplos
      .trim();
    
    const prompt = `Você é um especialista em catalogar músicas cristãs/gospel para uso em igrejas e eventos.
Analise a letra abaixo e gere tags ESPECÍFICAS que descrevam:
- Os TEMAS TEOLÓGICOS presentes (ex: "Ceia do Senhor", "Fidelidade de Deus", "Perdão dos pecados", "Ressurreição")
- As EMOÇÕES E MOMENTOS de culto (ex: "Intimidade com Deus", "Arrependimento", "Júbilo e celebração", "Entrega total")
- O CONTEXTO IDEAL de uso (ex: "Culto de encerramento", "Momento de oração", "Oferta", "Santa Ceia")

REGRAS CRÍTICAS:
- PROIBIDO usar tags genéricas como: Adoração, Louvor, Gospel, Música, Cristão, Ccb, Igreja
- Cada tag deve ser ESPECÍFICA e DESCRITIVA da letra, com 2-4 palavras
- Gere entre 4 e 7 tags
- Responda SOMENTE com JSON neste formato: {"tags": ["tag1", "tag2", ...]}

Título: ${title}
Artista/Vocal: ${artist || "Desconhecido"}
Letra:
${fullLyrics}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      return { tags: data?.tags || [] };
    } catch (e) {
      console.error("ERRO TAGS:", e);
      throw new functions.https.HttpsError("internal", "Erro ao gerar tags");
    }
  }
);

// --- SUGESTÃO POR IA ---
export const suggestSongs = functions.https.onCall(
  { secrets: ["GOOGLE_API_KEY"] },
  async (request) => {
    const { userId, userPrompt } = request.data;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) throw new functions.https.HttpsError("unauthenticated", "Chave ausente.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const db = admin.firestore();

    try {
      const repertoiresSnap = await db.collection("repertoires").where("userId", "==", userId).get();
      
      /** * LOGICA DE DEDUPLICAÇÃO:
       * Usamos um Map para garantir que músicas com o mesmo título não sejam enviadas repetidas.
       */
      const uniqueSongsMap = new Map();
      
      for (const repDoc of repertoiresSnap.docs) {
        const songsSnap = await repDoc.ref.collection("songs").select("title", "vocalistName", "chords", "tags").get();
        
        songsSnap.forEach(doc => {
          const data = doc.data();
          const rawTitle = data.title || "Sem título";
          const titleKey = rawTitle.toLowerCase().trim(); // Chave única por título

          if (titleKey && !uniqueSongsMap.has(titleKey)) {
            let metadataString = "";
            if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
              metadataString = `TAGS:${data.tags.join(",")}`;
            } else {
              const fullLyrics = data.chords || "";
              metadataString = `L:${fullLyrics.substring(0, 300).replace(/\s+/g, " ")}`;
            }

            uniqueSongsMap.set(titleKey, {
              id: doc.id,
              title: rawTitle,
              metadata: metadataString
            });
          }
        });
      }

      const allSongs = Array.from(uniqueSongsMap.values());

      if (allSongs.length === 0) return { suggestedIds: [] };

      // Como as tags consomem muito menos tokens, não limitaremos a 12
      const songsListText = allSongs.map(s => `ID:${s.id}|T:${s.title}|${s.metadata}`).join("\n");
      
      const prompt = `Você é um curador especialista em setlists para igrejas e eventos cristãos.

O usuário quer músicas para o tema/momento: "${userPrompt}"

Sua tarefa:
1. Interprete o pedido de forma SEMÂNTICA e AMPLA. Por exemplo:
   - "Santa Ceia" → também inclua músicas sobre: sangue de Cristo, corpo de Cristo, sacrifício, nova aliança, memorial, pão e vinho
   - "Natal" → também inclua: encarnação, Emmanuel, nascimento de Jesus, luz no mundo
   - "Batismo" → também inclua: nova vida, morte ao pecado, imersão, renascimento
   - "Culto de encerramento" → também inclua: entrega, bênção, envio, missão, paz
   - "Gratidão" → também inclua: ações de graças, fidelidade de Deus, bênçãos recebidas
2. Selecione as músicas mais adequadas (máximo 15) de acordo com os TEMAS nas tags ou na letra.
3. Prefira músicas com TAGS específicas que coincidam semanticamente com o pedido.
4. Retorne SOMENTE um JSON: {"suggestedIds": ["id1", "id2", ...]}

Músicas disponíveis (TAGS=temas catalogados / L=trecho da letra):
${songsListText}`;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150,
        }
      });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestedIds: [] };

    } catch (error: any) {
      console.error("ERRO IA:", error);
      const isRateLimit = error.message?.includes("429") || error.message?.includes("Resource exhausted");
      const msg = isRateLimit ? "Cota excedida. Aguarde 1 minuto." : error.message;
      throw new functions.https.HttpsError("internal", `Erro na IA: ${msg}`);
    }
  }
);

// --- CRIAR REPERTÓRIO ---
export const createRepertoireFromSuggestions = functions.https.onCall(async (request) => {
  const { userId, newRepertoireName, songIds } = request.data;
  const db = admin.firestore();
  
  try {
    const newRepRef = await db.collection('repertoires').add({
      name: newRepertoireName,
      userId: userId,
      createdAt: new Date().toISOString(),
      songCount: songIds.length,
      isOwner: true
    });

    const batch = db.batch();
    const repertoiresSnap = await db.collection('repertoires').where('userId', '==', userId).get();
    
    // Clonamos os dados das músicas selecionadas para o novo repertório
    for (const repDoc of repertoiresSnap.docs) {
      const songsSnap = await repDoc.ref.collection('songs').get();
      songsSnap.forEach(songDoc => {
        if (songIds.includes(songDoc.id)) {
          const newSongRef = newRepRef.collection('songs').doc();
          batch.set(newSongRef, { 
            ...songDoc.data(), 
            createdAt: new Date().toISOString() 
          });
        }
      });
    }

    await batch.commit();
    return { success: true, newRepertoireId: newRepRef.id };
  } catch (error: any) {
    console.error("ERRO AO CRIAR REPERTÓRIO:", error);
    throw new functions.https.HttpsError("internal", "Erro ao criar novo repertório.");
  }
});