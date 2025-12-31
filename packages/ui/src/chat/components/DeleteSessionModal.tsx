import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './DeleteSessionModal.module.css';

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
    <Modal title={__('Delete Session?', 'wordforge')} onRequestClose={onClose}>
      <div className={styles.content}>
        <p>
          {__(
            'Are you sure you want to delete this session? This action cannot be undone.',
            'wordforge',
          )}
        </p>
        <p className={styles.sessionName}>{sessionName}</p>
        <div className={styles.actions}>
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
