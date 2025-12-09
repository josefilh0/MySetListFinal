import React, { useEffect, useState } from 'react';
import { getAllRepertoires, type RepertoireSummary } from '../services/repertoireService';
import { useAuth } from '../hooks/useAuth';

// Propriedades para este componente
interface RepertoiresListProps {
    onSelectRepertoire: (repertoireId: string, isOwner: boolean) => void;
}

const RepertoiresList: React.FC<RepertoiresListProps> = ({ onSelectRepertoire }) => {
    const { user, loading: authLoading } = useAuth();
    const [repertoires, setRepertoires] = useState<RepertoireSummary[]>([]);
    const [loading, setLoading] = useState(false);

    const loadRepertoires = async (uid: string) => {
        setLoading(true);
        try {
            const list = await getAllRepertoires(uid);
            setRepertoires(list);
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar repertórios.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && !authLoading) {
            loadRepertoires(user.uid);
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <div>Carregando repertórios...</div>;
    }
    
    if (!user) {
        return <div>Faça login para ver seus repertórios.</div>;
    }

    return (
        <div>
            <h1>Meus Repertórios ({repertoires.length})</h1>
            <button onClick={() => loadRepertoires(user.uid)}>Recarregar Lista</button>
            
            <ul>
                {repertoires.map((rep) => (
                    <li 
                        key={rep.id} 
                        onClick={() => onSelectRepertoire(rep.id, rep.isOwner)}
                        style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #eee' }}
                    >
                        <strong>{rep.name}</strong>
                        <span style={{ marginLeft: '10px', fontSize: '12px', color: rep.isOwner ? 'green' : 'blue' }}>
                            {rep.isOwner ? '(Seu)' : '(Compartilhado)'}
                        </span>
                        
                        {rep.isOwner && rep.sharedWith.length > 0 && (
                            <span style={{ marginLeft: '10px', fontSize: '12px', color: 'orange' }}>
                                ({rep.sharedWith.length} compartilhamentos)
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RepertoiresList;