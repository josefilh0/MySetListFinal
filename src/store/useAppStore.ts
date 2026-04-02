import { create } from 'zustand';

interface AppState {
  // O usuário está sendo passado via App.tsx ainda, 
  // mas caso precisemos deixar a store com selected:
  selected: any | null;
  setSelected: (selected: any) => void;
  
  // Para Teams
  teamsList: any[];
  setTeamsList: (teams: any[]) => void;
  
  // globalSongs para a IA e listagem global
  globalSongs: any[];
  setGlobalSongs: (songs: any[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),

  teamsList: [],
  setTeamsList: (teamsList) => set({ teamsList }),

  globalSongs: [],
  setGlobalSongs: (globalSongs) => set({ globalSongs })
}));
