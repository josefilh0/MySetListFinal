import React from 'react';

interface LoginScreenProps {
  onLogin: () => void;
  error: string | null;
  version: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error, version }) => {
  return (
    <div className="login-screen">
      <h1>MySetList</h1>
      <p style={{ marginBottom: 20 }}>Faça login para gerenciar seus repertórios.</p>
      <button onClick={onLogin} className="btn btn-google">Login com Google</button>
      {error && <p style={{ color: 'red', marginTop: 10 }}>Erro: {error}</p>}
      <div className="footer">v{version}</div>
    </div>
  );
};