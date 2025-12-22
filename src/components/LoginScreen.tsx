// src/components/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  signInWithGoogle, 
  sendPasswordReset 
} from '../services/authService';

interface LoginScreenProps {
  onLogin: () => void;
  error: string | null;
  version: string;
}

type AuthMode = 'login' | 'register' | 'reset';

export const LoginScreen: React.FC<LoginScreenProps> = ({ error: propError, version }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'reset') {
        if (!email) {
          setLocalError('Por favor, informe seu e-mail.');
          return;
        }
        await sendPasswordReset(email);
        setSuccessMsg(`Link enviado para ${email}. Verifique seu e-mail.`);
      } 
      else if (mode === 'register') {
        if (password !== confirmPassword) {
          setLocalError('As senhas não coincidem.');
          return;
        }
        if (password.length < 6) {
          setLocalError('A senha deve ter pelo menos 6 caracteres.');
          return;
        }
        await registerWithEmail(email, password);
      } 
      else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      // NÃO imprimimos console.log aqui para manter o console limpo
      
      const errorCode = err.code;
      let msg = 'Ocorreu um erro. Tente novamente.';

      // Mapeamento de códigos de erro do Firebase
      switch (errorCode) {
        case 'auth/invalid-email':
          msg = 'E-mail inválido.';
          break;
        case 'auth/user-disabled':
          msg = 'Este usuário foi desativado.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          // Por segurança, mostramos a mesma mensagem para senha ou email errados
          msg = mode === 'reset' 
            ? 'E-mail não encontrado.' 
            : 'E-mail ou senha incorretos.';
          break;
        case 'auth/email-already-in-use':
          msg = 'Este e-mail já está cadastrado. Tente fazer login.';
          break;
        case 'auth/weak-password':
          msg = 'A senha é muito fraca.';
          break;
        case 'auth/too-many-requests':
          msg = 'Muitas tentativas falhas. Aguarde alguns instantes.';
          break;
        default:
          if (err.message) msg = err.message;
      }
      
      setLocalError(msg);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // O usuário fechou o popup ou deu erro de rede
      console.log('Google login cancelado ou falhou'); 
    }
  };

  const getHeader = () => {
    switch(mode) {
      case 'register': return { title: 'Crie sua conta', desc: 'Preencha os dados abaixo.' };
      case 'reset': return { title: 'Recuperar Senha', desc: 'Digite seu e-mail cadastrado.' };
      default: return { title: 'MySetList', desc: 'Faça login para continuar.' };
    }
  };

  const header = getHeader();

  return (
    <div className="login-screen">
      <h1>{header.title}</h1>
      <p style={{ marginBottom: 20 }}>{header.desc}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto 20px' }}>
        
        <input 
          type="email" 
          placeholder="Seu e-mail" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {mode !== 'reset' && (
          <input 
            type="password" 
            placeholder="Sua senha" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        )}

        {mode === 'register' && (
          <input 
            type="password" 
            placeholder="Confirme sua senha" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        )}
        
        <button type="submit" className="btn" style={{ backgroundColor: '#007bff', color: 'white', marginTop: '5px' }}>
          {mode === 'login' && 'Entrar'}
          {mode === 'register' && 'Cadastrar'}
          {mode === 'reset' && 'Enviar Link'}
        </button>
      </form>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        
        {mode === 'login' && (
          <button 
            type="button" 
            onClick={() => { setMode('reset'); setLocalError(null); setSuccessMsg(null); }}
            style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.9em', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Esqueci minha senha
          </button>
        )}

        {mode === 'login' && (
          <button onClick={handleGoogleLogin} className="btn btn-google" style={{ width: '100%', maxWidth: '300px' }}>
            Entrar com Google
          </button>
        )}

        {mode === 'login' ? (
          <button 
            onClick={() => { setMode('register'); setLocalError(null); }}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginTop: '10px' }}
          >
            Não tem conta? <strong>Cadastre-se</strong>
          </button>
        ) : (
          <button 
            onClick={() => { setMode('login'); setLocalError(null); setSuccessMsg(null); }}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginTop: '10px' }}
          >
            Voltar para o <strong>Login</strong>
          </button>
        )}
      </div>

      {(propError || localError) && (
        <p style={{ color: 'red', marginTop: 15, fontWeight: 'bold' }}>
          {localError || propError}
        </p>
      )}

      {successMsg && (
        <p style={{ color: 'green', marginTop: 15, fontWeight: 'bold' }}>
          {successMsg}
        </p>
      )}
      
      <div className="footer">v{version}</div>
    </div>
  );
};