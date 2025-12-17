// src/components/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { getAllUsers, exportDataToCSV, type UserData } from '../services/adminService';
import { ArrowLeft, RefreshCw, Search, X, Download, CheckSquare, Square } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NOVOS ESTADOS
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
      setSelectedUids(new Set()); // Limpa seleção ao recarregar
    } catch (e) {
      alert("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lógica de filtragem
  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  const formatDate = (isoString?: string) => {
    if (!isoString || isoString === 'Nunca/Antigo') return 'N/A';
    try { return new Date(isoString).toLocaleString('pt-BR'); } catch { return isoString; }
  };

  // --- LÓGICA DE SELEÇÃO ---
  
  const toggleSelectAll = () => {
    if (selectedUids.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUids(new Set()); // Desmarcar tudo
    } else {
      const allIds = new Set(filteredUsers.map(u => u.uid));
      setSelectedUids(allIds); // Marcar tudo (visível)
    }
  };

  const toggleSelectUser = (uid: string) => {
    const newSet = new Set(selectedUids);
    if (newSet.has(uid)) {
      newSet.delete(uid);
    } else {
      newSet.add(uid);
    }
    setSelectedUids(newSet);
  };

  // --- LÓGICA DE EXPORTAÇÃO ---

  const handleExport = async () => {
    if (selectedUids.size === 0) {
      alert("Selecione pelo menos um usuário para exportar.");
      return;
    }

    if (!window.confirm(`Deseja gerar o backup de ${selectedUids.size} usuário(s)? Isso pode levar alguns segundos.`)) return;

    setIsExporting(true);
    try {
      // Filtra apenas os usuários selecionados
      const usersToExport = users.filter(u => selectedUids.has(u.uid));
      
      // Gera o CSV string
      const csvContent = await exportDataToCSV(usersToExport);
      
      // Cria o Blob e baixa
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_mysetlist_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert("Erro ao exportar: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="repertoire-details">
      <div className="details-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2>Painel Administrativo</h2>
        <div style={{display:'flex', gap: 8}}>
            {/* BOTÃO EXPORTAR */}
            <button 
                onClick={handleExport} 
                className="btn btn-primary btn-sm" 
                title="Exportar CSV"
                disabled={isExporting || selectedUids.size === 0}
                style={{backgroundColor: isExporting ? '#9ca3af' : '#059669', borderColor: isExporting ? '#9ca3af' : '#059669'}}
            >
                <Download size={16} style={{marginRight: 4}} /> 
                {isExporting ? 'Gerando...' : `Backup (${selectedUids.size})`}
            </button>

            <button onClick={loadData} className="btn btn-secondary btn-sm" title="Atualizar">
                <RefreshCw size={16} />
            </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        
        {/* --- ÁREA DE RESUMO E BUSCA --- */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ 
            padding: '10px 20px', backgroundColor: '#f0f9ff', borderRadius: '8px', 
            border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 'bold'
          }}>
            Total: {filteredUsers.length}
          </div>

          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px',
                border: '1px solid #d1d5db', fontSize: '14px', outline: 'none'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p>Carregando dados...</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>
                  {/* Checkbox Header (Select All) */}
                  <th style={{ padding: '12px', width: '40px', textAlign: 'center' }}>
                    <div onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                        {selectedUids.size === filteredUsers.length && filteredUsers.length > 0 ? 
                            <CheckSquare size={18} color="#059669" /> : 
                            <Square size={18} color="#9ca3af" />
                        }
                    </div>
                  </th>
                  <th style={{ padding: '12px', color: '#111827', fontWeight: '600' }}>Nome</th>
                  <th style={{ padding: '12px', color: '#111827', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '12px', color: '#111827', fontWeight: '600' }}>Último Acesso</th>
                  <th style={{ padding: '12px', color: '#111827', fontWeight: '600' }}>UID</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => {
                    const isSelected = selectedUids.has(u.uid);
                    return (
                        <tr key={u.uid} style={{ borderBottom: '1px solid #eee', backgroundColor: isSelected ? '#ecfdf5' : 'white' }} className="hover:bg-gray-50">
                        {/* Checkbox Row */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div onClick={() => toggleSelectUser(u.uid)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                {isSelected ? <CheckSquare size={18} color="#059669" /> : <Square size={18} color="#d1d5db" />}
                            </div>
                        </td>
                        <td style={{ padding: '12px', color: '#374151' }}>{u.displayName}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{u.email}</td>
                        <td style={{ padding: '12px', fontWeight: '500', color: '#0369a1' }}>
                            {formatDate(u.lastAccess)}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#9ca3af', fontSize: '12px' }}>
                            {u.uid.substring(0, 8)}...
                        </td>
                        </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}