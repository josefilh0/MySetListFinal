import React, { useEffect, useState } from 'react';
import { 
    getRepertoireWithSongs, 
    type RepertoireSummary, 
    deleteSongFromRepertoire 
} from '../services/repertoireService';
import { useAuth } from '../hooks/useAuth';
import ShareRepertoireModal from './ShareRepertoireModal';

interface RepertoireDetailsProps {
    repertoireId: string;
    onBack: () => void;
}

const RepertoireDetails: React.FC<RepertoireDetailsProps> = ({ repertoireId, onBack }) => {
    const { user } = useAuth();
    
    // Estado para guardar os dados completos (repertório + músicas)
    const [data, setData] = useState<{repertoire: RepertoireSummary, songs: any[]} | null>(null);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);

    // Função para carregar os dados
    const loadDetails = async (id: string, currentUserId: string) => {
        setLoading(true);
        try {
            const result = await getRepertoireWithSongs(id, currentUserId);
            setData(result);
        } catch (e) {
            console.error(e);
            alert('Falha ao carregar detalhes do repertório.');
        } finally {
            setLoading(false);
        }
    };

    // Efeito inicial
    useEffect(() => {
        if (user) {
            loadDetails(repertoireId, user.uid);
        }
    }, [repertoireId, user]);
    
    // Função auxiliar para recarregar após alterações (ex: deletar música ou compartilhar)
    const handleRefresh = () => {
        if (user) loadDetails(repertoireId, user.uid);
    }
    
    // Função para deletar música
    const handleDeleteSong = async (songId: string) => {
        if (!data || !data.repertoire.isOwner) return;

        if (confirm('Tem certeza que deseja remover esta música?')) {
            try {
                await deleteSongFromRepertoire(repertoireId, songId);
                handleRefresh(); 
            } catch(e) {
                alert('Erro ao deletar a música.');
            }
        }
    }

    if (loading || !data) {
        return <div style={{padding: 20}}>Carregando detalhes...</div>;
    }

    const { repertoire, songs } = data;
    const isOwner = repertoire.isOwner;

    return (
        <div style={{ padding: 20 }}>
            <button onClick={onBack} style={{ marginBottom: 15, cursor: 'pointer' }}>
                ← Voltar para a Lista
            </button>
            
            <h2>{repertoire.name}</h2>
            <p>Vocalista Padrão: {repertoire.defaultVocalistName}</p>
            
            {/* AVISO DE LEITURA */}
            {!isOwner && (
                <div style={{ 
                    border: '1px solid #2196f3', 
                    color: '#2196f3', 
                    padding: '10px', 
                    margin: '10px 0',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    👁️ <strong>Modo Somente Leitura</strong> (Compartilhado com você)
                </div>
            )}

            {/* BOTÕES DE AÇÃO (Apenas para o Dono) */}
            {isOwner && (
                <div style={{ margin: '20px 0' }}>
                    <button 
                        onClick={() => setShowShareModal(true)} 
                        style={{ 
                            padding: '8px 12px', 
                            background: '#9c27b0', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer' 
                        }}
                    >
                        Gerenciar Compartilhamento
                    </button>
                </div>
            )}
            
            {/* LISTA DE MÚSICAS */}
            <h3>Músicas ({songs.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {songs.map((song: any) => (
                    <li key={song.id} style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid #333',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>{song.order}. {song.title} - {song.vocalistName || 'S/ Vocal'}</span>
                        
                        {/* Botão de Excluir (Apenas Dono) */}
                        {isOwner && (
                            <button 
                                onClick={() => handleDeleteSong(song.id)}
                                style={{ 
                                    marginLeft: '10px', 
                                    color: 'white', 
                                    background: '#f44336', 
                                    border: 'none', 
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Excluir
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {/* MODAL DE COMPARTILHAMENTO */}
            {showShareModal && isOwner && (
                <ShareRepertoireModal
                    repertoireId={repertoireId}
                    sharedWith={repertoire.sharedWith || []}
                    onClose={() => setShowShareModal(false)}
                    onUpdate={handleRefresh}
                />
            )}
        </div>
    );
};

export default RepertoireDetails;