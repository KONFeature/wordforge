import { DropdownMenu, MenuGroup, MenuItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { ExportFormat } from '../hooks/useExport';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
}

export const ExportMenu = ({ onExport, disabled }: ExportMenuProps) => {
  return (
    <DropdownMenu
      icon="download"
      label={__('Export conversation', 'wordforge')}
      toggleProps={{ size: 'small', disabled }}
    >
      {({ onClose }) => (
        <MenuGroup>
          <MenuItem
            onClick={() => {
              onExport('markdown');
              onClose();
            }}
          >
            {__('Export as Markdown', 'wordforge')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              onExport('json');
              onClose();
            }}
          >
            {__('Export as JSON', 'wordforge')}
          </MenuItem>
        </MenuGroup>
      )}
    </DropdownMenu>
  );
};
