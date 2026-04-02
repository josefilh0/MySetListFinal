export const ConfirmShareTeamModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <span>Deseja partilhar este repertório com todos os membros dasta equipa?</span>
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button className="btn btn-sm" onClick={onCancel} style={{ background: '#ccc', color: '#333' }}>
        Cancelar
      </button>
      <button className="btn btn-sm" style={{ background: '#007bff', color: '#fff' }} onClick={onConfirm}>
        Confirmar
      </button>
    </div>
  </div>
);

export const ConfirmUnshareUserModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div>
    <p style={{ margin: '0 0 10px 0' }}>Remover acesso deste utilizador?</p>
    <div style={{ display: 'flex', gap: '10px' }}>
      <button className="btn btn-sm btn-danger" onClick={onConfirm}>
        Remover
      </button>
      <button className="btn btn-sm" onClick={onCancel} style={{ background: '#eee', color: '#333' }}>
        Cancelar
      </button>
    </div>
  </div>
);
