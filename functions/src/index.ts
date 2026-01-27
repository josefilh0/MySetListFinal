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
        const songsSnap = await repDoc.ref.collection("songs").select("title", "vocalistName", "chords").get();
        
        songsSnap.forEach(doc => {
          const data = doc.data();
          const rawTitle = data.title || "Sem título";
          const titleKey = rawTitle.toLowerCase().trim(); // Chave única por título

          if (titleKey && !uniqueSongsMap.has(titleKey)) {
            const fullLyrics = data.chords || "";
            // DIETA EXTREMA: 300 caracteres para economizar tokens
            const lyricsSnippet = fullLyrics.substring(0, 300).replace(/\s+/g, " ");

            uniqueSongsMap.set(titleKey, {
              id: doc.id,
              title: rawTitle,
              artist: data.vocalistName || "",
              lyrics: lyricsSnippet
            });
          }
        });
      }

      const allSongs = Array.from(uniqueSongsMap.values());

      if (allSongs.length === 0) return { suggestedIds: [] };

      // OTIMIZAÇÃO: Enviamos no máximo 12 músicas únicas para evitar Erro 429
      const songsListText = allSongs.slice(0, 12).map(s => `ID:${s.id}|T:${s.title}|L:${s.lyrics}`).join("\n");
      
      const prompt = `Tema: "${userPrompt}"
      Aja como um seletor técnico de músicas.
      Retorne APENAS um JSON com os IDs das músicas que combinam com o tema.
      Formato: {"suggestedIds": ["id1", "id2"]}

      Músicas:
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