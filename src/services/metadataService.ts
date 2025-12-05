// Caminho: src/services/metadataService.ts

/**
 * Tenta extrair o ID do vídeo do YouTube a partir da URL.
 *
 * *AVISO: Em um aplicativo real, a busca pelo título real do YouTube
 * deve ser feita em um backend para usar a API oficial do YouTube de
 * forma segura (evitando problemas de CORS e exposição da API Key).
 * Esta implementação simula a detecção do link.*
 */
export async function fetchYoutubeTitle(url: string): Promise<string | null> {
  if (!url) return null;
  
  // Expressão para extrair o ID de diferentes formatos de URL do YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|\w+\/|embed\/|v\/|shorts\/|watch\?.*v=))([^&"'\?]+)/;
  const match = url.match(youtubeRegex);
  
  if (match && match[1]) {
    // Retorna um título genérico formatado.
    return `Música do YouTube (Link Detectado)`;
  }
  
  return null;
}

/**
 * Tenta extrair o nome da música e do artista de URLs de sites de cifra comuns.
 * Funciona bem para URLs com o formato /artista/musica/.
 * Ex: https://www.cifraclub.com.br/banda/nome-da-musica/
 */
export async function fetchChordTitle(url: string): Promise<string | null> {
  if (!url) return null;
  
  // Regex que busca padrões de sites como cifraclub ou letras.mus.br (artista/musica)
  const chordRegex = /(?:cifraclub\.com\.br|letras\.mus\.br)\/([^\/]+)\/([^\/]+)/i;
  const match = url.match(chordRegex);
  
  if (match) {
    // match[1] é o artista, match[2] é o nome da música
    let artist = decodeURIComponent(match[1].replace(/-/g, ' '));
    let song = decodeURIComponent(match[2].replace(/-/g, ' '));
    
    // Função auxiliar para capitalizar a primeira letra de cada palavra
    const capitalize = (str: string) => 
      str.split(' ')
         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
         .join(' ');
      
    // Retorna a música formatada como "Nome da Música - Nome do Artista"
    return capitalize(song) + ' - ' + capitalize(artist);
  }
  
  return null;
}