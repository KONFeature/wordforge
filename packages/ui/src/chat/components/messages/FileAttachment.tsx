import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import type { FilePart } from './types';

interface FileAttachmentProps {
  part: FilePart;
}

const getFileIcon = (mime: string): string => {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('json')) return '📋';
  if (mime.includes('text')) return '📝';
  return '📎';
};

export const FileAttachment = ({ part }: FileAttachmentProps) => {
  const isImage = part.mime?.startsWith('image/');
  const filename = part.filename || __('Attachment', 'wordforge');
  const icon = getFileIcon(part.mime || '');

  if (isImage && part.url) {
    return (
      <div className={styles.fileAttachment}>
        <img
          src={part.url}
          alt={filename}
          className={styles.fileImage}
          loading="lazy"
        />
        <span className={styles.fileCaption}>{filename}</span>
      </div>
    );
  }

  return (
    <div className={styles.fileAttachment}>
      <a
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.fileLink}
      >
        <span className={styles.fileIcon}>{icon}</span>
        <span className={styles.fileName}>{filename}</span>
      </a>
    </div>
  );
};
