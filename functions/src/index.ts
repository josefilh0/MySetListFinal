import * as functions from "firebase-functions/v2";
import axios from "axios";
import * as cheerio from "cheerio";

// Esta função será chamada pelo seu App React
export const getCifraClubChords = functions.https.onCall(async (request) => {
  const url = request.data.url;

  if (!url || !url.includes("cifraclub.com.br")) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "URL inválida. Forneça um link do Cifra Club."
    );
  }

  try {
    // 1. Busca o HTML da página
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // 2. Carrega o HTML no Cheerio para manipular
    const $ = cheerio.load(html);

    // 3. Extrai a cifra (no Cifra Club, ela geralmente fica dentro de uma tag <pre>)
    let chords = $("pre").text();

    // Caso não encontre no <pre>, tenta uma alternativa comum no layout deles
    if (!chords) {
      chords = $(".cifra_cnt").text();
    }

    if (!chords) {
      throw new Error("Não foi possível extrair o conteúdo da cifra.");
    }

    return {
      success: true,
      content: chords.trim(),
    };
  } catch (error: any) {
    console.error("Erro no scraping:", error.message);
    throw new functions.https.HttpsError("internal", "Erro ao buscar a cifra.");
  }
});