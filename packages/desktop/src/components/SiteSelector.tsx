import { Check, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WordPressSite } from '../types';

interface SiteSelectorProps {
  sites: WordPressSite[];
  activeSite: WordPressSite | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function SiteSelector({
  sites,
  activeSite,
  onSelect,
  onAdd,
}: SiteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="site-selector" ref={dropdownRef}>
      <button
        type="button"
        className="site-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="site-name">
          {activeSite ? activeSite.name : 'Select Site'}
        </span>
        <ChevronDown className={`chevron ${isOpen ? 'open' : ''}`} size={16} />
      </button>

      {isOpen && (
        <div className="site-selector-dropdown">
          <ul className="site-list">
            {sites.map((site) => (
              <li key={site.id}>
                <button
                  type="button"
                  className={`site-option ${activeSite?.id === site.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelect(site.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="site-option-content">
                    <span className="site-option-name">{site.name}</span>
                    <span className="site-option-url">{site.url}</span>
                  </div>
                  {activeSite?.id === site.id && (
                    <Check className="check-icon" size={16} />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="site-selector-footer">
            <button
              type="button"
              className="btn-add-site"
              onClick={() => {
                onAdd();
                setIsOpen(false);
              }}
            >
              <Plus size={16} />
              Connect New Site
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
