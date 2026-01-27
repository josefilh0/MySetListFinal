import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase"; 

// Obtém a instância das funções do Firebase App inicializado
const functions = getFunctions(app);

// Define o formato da resposta que esperamos da IA
export interface AISuggestionResponse {
  suggestedIds: string[];
  reasoning: string;
}

/**
 * Chama a Cloud Function para sugerir músicas baseadas em um prompt.
 * @param userId ID do usuário atual
 * @param prompt Texto do usuário (ex: "Culto de Santa Ceia")
 */
export const getMusicSuggestions = async (userId: string, prompt: string): Promise<AISuggestionResponse> => {
  // 'suggestSongs' é o nome da função exportada no backend
  const suggestFn = httpsCallable(functions, 'suggestSongs');
  
  try {
    const result = await suggestFn({ userId, userPrompt: prompt });
    return result.data as AISuggestionResponse;
  } catch (error) {
    console.error("Erro ao chamar serviço de IA (Sugestão):", error);
    throw error;
  }
};

/**
 * Chama a Cloud Function para criar um novo repertório com as músicas sugeridas.
 * @param userId ID do usuário atual
 * @param name Nome do novo repertório
 * @param songIds Array de IDs das músicas para copiar
 */
export const createRepertoireFromAI = async (userId: string, name: string, songIds: string[]) => {
  // 'createRepertoireFromSuggestions' é o nome da outra função exportada no backend
  const createFn = httpsCallable(functions, 'createRepertoireFromSuggestions');
  
  try {
    const result = await createFn({ userId, newRepertoireName: name, songIds });
    return result.data as { success: boolean, newRepertoireId: string, count: number };
  } catch (error) {
    console.error("Erro ao chamar serviço de IA (Criação):", error);
    throw error;
  }
};