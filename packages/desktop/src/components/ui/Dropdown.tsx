import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from 'react';
import styles from './Dropdown.module.css';

export const Dropdown = DropdownMenuPrimitive.Root;

export const DropdownTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    ref={ref}
    className={`${styles.trigger} ${className || ''}`}
    {...props}
  />
));
DropdownTrigger.displayName = 'DropdownTrigger';

export const DropdownContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`${styles.content} ${className || ''}`}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownContent.displayName = 'DropdownContent';

export const DropdownItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    destructive?: boolean;
  }
>(({ className, inset, destructive, ...props }, ref) => {
  const classNames = [
    styles.item,
    inset && styles.inset,
    destructive && styles.destructive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <DropdownMenuPrimitive.Item ref={ref} className={classNames} {...props} />
  );
});
DropdownItem.displayName = 'DropdownItem';

export const DropdownSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={`${styles.separator} ${className || ''}`}
    {...props}
  />
));
DropdownSeparator.displayName = 'DropdownSeparator';

export const DropdownLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={`${styles.label} ${className || ''}`}
    {...props}
  />
));
DropdownLabel.displayName = 'DropdownLabel';

export interface SiteSelectorDropdownProps {
  sites: Array<{ id: string; name: string; url: string }>;
  activeSiteId?: string;
  onSelectSite: (id: string) => void;
  onAddSite: () => void;
  trigger: ReactNode;
}

export function SiteSelectorDropdown({
  sites,
  activeSiteId,
  onSelectSite,
  onAddSite,
  trigger,
}: SiteSelectorDropdownProps) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>{trigger}</DropdownTrigger>
      <DropdownContent align="start">
        {sites.map((site) => (
          <DropdownItem
            key={site.id}
            className={site.id === activeSiteId ? styles.active : ''}
            onSelect={() => onSelectSite(site.id)}
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${site.url}&sz=32`}
              alt=""
              className={styles.favicon}
            />
            <div className={styles.siteInfo}>
              <span className={styles.siteName}>{site.name}</span>
              <span className={styles.siteUrl}>{new URL(site.url).host}</span>
            </div>
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onSelect={onAddSite} className={styles.addSite}>
          <span className={styles.addIcon}>+</span>
          <span>Add Site</span>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
