import React from 'react';
import { LogOut, Copy, Check, DownloadCloud, Smartphone } from 'lucide-react';

interface HeaderProps {
  user: any;
  copiedUid: boolean;
  onCopyUid: () => void;
  deferredPrompt: any;
  onInstallClick: () => void;
  onSyncOffline: () => void;
  onLogout: () => void;
}

/**
 * Header exibe informações do usuário e os botões de ação (instalar PWA,
 * baixar offline e logout). Recebe callbacks por props.
 */
const Header: React.FC<HeaderProps> = ({
  user,
  copiedUid,
  onCopyUid,
  deferredPrompt,
  onInstallClick,
  onSyncOffline,
  onLogout,
}) => (
  <div className="header">
    <div>
      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>MySetList</span>
      <div className="user-info">{user.email}</div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <span className="uid-badge" title={user.uid}>
          UID: {user.uid.substring(0, 6)}...
        </span>
        <button
          onClick={onCopyUid}
          className="btn btn-xs btn-info"
          style={{ marginLeft: 6 }}
          title="Copiar UID"
        >
          {copiedUid ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>

    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Botão de Instalar PWA */}
      {deferredPrompt && (
        <button
          onClick={onInstallClick}
          className="btn btn-sm btn-install"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          title="Instalar"
        >
          <Smartphone size={16} />
          <span className="hide-mobile">Instalar</span>
        </button>
      )}
      {/* Botão Offline */}
      <button
        onClick={onSyncOffline}
        className="btn btn-sm btn-sync"
        style={{
          backgroundColor: '#28a745',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
        title="Baixar tudo"
      >
        <DownloadCloud size={16} />
        <span className="hide-mobile">Offline</span>
      </button>
      {/* Botão Sair */}
      <button
        onClick={onLogout}
        className="btn btn-danger btn-sm"
        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        title="Sair"
      >
        <LogOut size={16} />
        <span className="hide-mobile">Sair</span>
      </button>
    </div>
  </div>
);

export default Header;
