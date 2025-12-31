import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

interface DeleteSessionModalProps {
  sessionName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteSessionModal = ({
  sessionName,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteSessionModalProps) => {
  if (!isOpen) return null;

  return (
    <Modal
      title={__('Delete Session?', 'wordforge')}
      onRequestClose={onClose}
      className="wf-delete-modal"
    >
      <div style={{ padding: '0 16px 16px' }}>
        <p>
          {__(
            'Are you sure you want to delete this session? This action cannot be undone.',
            'wordforge',
          )}
        </p>
        <p
          style={{
            fontWeight: 500,
            background: '#f6f7f7',
            padding: '8px 12px',
            borderRadius: '4px',
            margin: '12px 0',
          }}
        >
          {sessionName}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '20px',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            {__('Cancel', 'wordforge')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isDestructive
            isBusy={isDeleting}
            disabled={isDeleting}
          >
            {__('Delete', 'wordforge')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
