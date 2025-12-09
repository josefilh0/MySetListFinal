import { useState, useEffect } from 'react';
import { onAuthStateChanged } from '../services/authService';

// Tipo simples para o usuário, pode ser mais detalhado se necessário
type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
} | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged retorna uma função de unsubscribe
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // Mapeia o objeto User do Firebase para o nosso tipo simplificado
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Limpeza: a função de unsubscribe é chamada quando o componente for desmontado
    return () => unsubscribe();
  }, []);

  return { user, loading };
}