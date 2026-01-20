import React from 'react';
import { Shield } from 'lucide-react';

interface NavigationTabsProps {
  view: 'repertoires' | 'teams' | 'admin';
  onChangeView: (view: 'repertoires' | 'teams' | 'admin') => void;
  isAdmin: boolean;
  hidden?: boolean;
}

/**
 * NavigationTabs exibe as abas de navegação. Define‑se hidden=true
 * quando não se deve mostrá‑las (por exemplo, ao abrir um repertório ou
 * ao exibir o painel de admin).
 */
const NavigationTabs: React.FC<NavigationTabsProps> = ({
  view,
  onChangeView,
  isAdmin,
  hidden = false,
}) => {
  if (hidden) return null;
  return (
    <div className="nav-tabs">
      <button
        onClick={() => onChangeView('repertoires')}
        className={`nav-btn ${view === 'repertoires' ? 'active' : ''}`}
      >
        Repertórios
      </button>
      <button
        onClick={() => onChangeView('teams')}
        className={`nav-btn ${view === 'teams' ? 'active' : ''}`}
      >
        Minhas Equipes
      </button>
      {isAdmin && (
        <button
          onClick={() => onChangeView('admin')}
          className="nav-btn admin-btn"
          style={{
            backgroundColor: '#fef3c7',
            color: '#d97706',
            border: '1px solid #fcd34d',
          }}
        >
          <Shield size={14} style={{ marginRight: 4 }} /> Admin
        </button>
      )}
    </div>
  );
};

export default NavigationTabs;
