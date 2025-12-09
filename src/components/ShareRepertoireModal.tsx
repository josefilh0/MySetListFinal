import React, { useState } from 'react';
import { 
    shareRepertoireWithUser, 
    unshareRepertoireWithUser 
} from '../services/repertoireService';

// Este componente assume que você está usando algum tipo de CSS simples.
// Ajuste o layout conforme seu estilo (por exemplo, usando um Modal ou Dialog).

interface ShareRepertoireModalProps {
    repertoireId: string;
    sharedWith: string[]; // Lista de UIDs que já têm acesso
    onClose: () => void;
    onUpdate: () => void; // Função para recarregar os dados do repertório após a alteração
}

const ShareRepertoireModal: React.FC<ShareRepertoireModalProps> = ({ 
    repertoireId, 
    sharedWith, 
    onClose, 
    onUpdate 
}) => {
    const [targetUid, setTargetUid] = useState('');
    const [loading, setLoading] = useState(false);

    const handleShare = async () => {
        if (!targetUid) return alert('Por favor, insira o UID do usuário.');
        
        setLoading(true);
        try {
            await shareRepertoireWithUser(repertoireId, targetUid.trim());
            alert(`Repertório compartilhado com o UID: ${targetUid}`);
            setTargetUid('');
            onUpdate(); 
        } catch (e) {
            alert('Falha ao compartilhar repertório. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const handleUnshare = async (uidToRemove: string) => {
        if (!confirm(`Tem certeza que deseja remover o acesso do UID ${uidToRemove}?`)) return;

        setLoading(true);
        try {
            await unshareRepertoireWithUser(repertoireId, uidToRemove);
            alert('Acesso removido.');
            onUpdate();
        } catch (e) {
            alert('Falha ao remover acesso. Verifique o console.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', position: 'fixed', background: 'white', zIndex: 10 }}>
            <h3>Compartilhar Repertório</h3>

            <div>
                <input
                    type="text"
                    placeholder="UID do Usuário"
                    value={targetUid}
                    onChange={(e) => setTargetUid(e.target.value)}
                    disabled={loading}
                />
                <button onClick={handleShare} disabled={loading}>
                    {loading ? 'Compartilhando...' : 'Conceder Acesso'}
                </button>
            </div>

            <h4>Usuários com Acesso de Leitura ({sharedWith.length})</h4>
            <ul>
                {sharedWith.map(uid => (
                    <li key={uid}>
                        {uid}
                        <button 
                            onClick={() => handleUnshare(uid)} 
                            disabled={loading}
                            style={{ marginLeft: '10px', color: 'red' }}
                        >
                            Remover
                        </button>
                    </li>
                ))}
            </ul>
            
            <button onClick={onClose} disabled={loading}>Fechar</button>
        </div>
    );
};

export default ShareRepertoireModal;