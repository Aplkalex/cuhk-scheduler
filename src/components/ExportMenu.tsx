/** @jsxImportSource react */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileCode, ImageDown, FileDown, CalendarDays, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExportMenuProps = {
  disabled?: boolean;
  isMobile?: boolean;
  align?: 'left' | 'right';
  label?: string;
  triggerClassName?: string;
  menuClassName?: string;
  onExportJson: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onExportIcs: () => void;
  onExportGoogle: () => void;
  isExportingImage?: boolean;
  isExportingPdf?: boolean;
};

const menuOptions = [
  {
    id: 'json',
    label: 'Download JSON',
    description: 'Backup for this planner',
    Icon: FileCode,
    key: 'json',
  },
  {
    id: 'png',
    label: 'PNG snapshot',
    description: 'Shareable image',
    Icon: ImageDown,
    key: 'png',
  },
  {
    id: 'pdf',
    label: 'PDF (A4)',
    description: 'Print-ready layout',
    Icon: FileDown,
    key: 'pdf',
  },
  {
    id: 'ics',
    label: 'ICS calendar',
    description: 'Works with every calendar app',
    Icon: CalendarDays,
    key: 'ics',
  },
  {
    id: 'google',
    label: 'Google Calendar',
    description: 'Opens the import page',
    Icon: CalendarPlus,
    key: 'google',
  },
] as const;

export function ExportMenu({
  disabled,
  isMobile: _isMobile,
  align = 'right',
  label,
  triggerClassName,
  menuClassName,
  onExportJson,
  onExportPng,
  onExportPdf,
  onExportIcs,
  onExportGoogle,
  isExportingImage,
  isExportingPdf,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuContentRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 288,
  });
  const MENU_WIDTH = _isMobile ? 276 : 288;

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = requestAnimationFrame(() => setPortalEl(document.body));
    return () => cancelAnimationFrame(id);
  }, []);

  const recomputePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollX = window.scrollX ?? window.pageXOffset;
    const scrollY = window.scrollY ?? window.pageYOffset;
    const left = align === 'right'
      ? Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
      : Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8));
    const top = rect.bottom + scrollY + 8;
    setMenuStyle({ top, left: left + scrollX, width: MENU_WIDTH });
  }, [align, MENU_WIDTH]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node;
      if (
        containerRef.current?.contains(targetNode) ||
        menuContentRef.current?.contains(targetNode)
      ) {
        return;
      }
      closeMenu();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };
    const handleResize = () => recomputePosition();
    recomputePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [closeMenu, open, recomputePosition]);

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => recomputePosition(), 0);
      }
      return next;
    });
  };

  const handleOptionClick = (id: string) => {
    if (disabled) return;
    switch (id) {
      case 'json':
        onExportJson();
        break;
      case 'png':
        onExportPng();
        break;
      case 'pdf':
        onExportPdf();
        break;
      case 'ics':
        onExportIcs();
        break;
      case 'google':
        onExportGoogle();
        break;
      default:
        break;
    }
    closeMenu();
  };


  const triggerStyles = cn(
    'inline-flex items-center gap-1 justify-center rounded-lg border transition-all duration-200 ease-out shadow-sm active:scale-95 relative',
    disabled
      ? 'bg-gray-100/60 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-white/5 dark:text-gray-500 dark:border-white/10'
      : 'bg-gray-100/80 text-green-600 border-gray-200 hover:bg-gray-200/80 hover:border-gray-300 dark:bg-white/5 dark:text-green-300 dark:border-white/10 dark:hover:bg-white/10',
    triggerClassName
  );

  const menuStyles = cn(
    'fixed w-72 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-[#151515] shadow-2xl p-2 z-[1200]',
    menuClassName
  );

  const menuContent = (
    <div
      ref={menuContentRef}
      className={menuStyles}
      role="menu"
      style={{ top: `${menuStyle.top}px`, left: `${menuStyle.left}px`, width: `${menuStyle.width}px` }}
    >
      <div className="px-2 py-1 text-[10px] uppercase font-semibold tracking-[0.24em] text-gray-500 dark:text-gray-400">
        Export schedule
      </div>
      <div className="space-y-1">
        {menuOptions.map(({ id, label: optionLabel, description, Icon }) => {
          const loading = (id === 'png' && isExportingImage) || (id === 'pdf' && isExportingPdf);
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleOptionClick(id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                'hover:bg-gray-100/80 dark:hover:bg-white/5'
              )}
              role="menuitem"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white/15 dark:text-white">
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {optionLabel}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={triggerStyles}
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ?? 'Export options'}
      >
        <Download className="w-3.5 h-3.5" />
        {label && <span className="text-xs font-semibold">{label}</span>}
      </button>

      {open && !disabled && portalEl ? createPortal(menuContent, portalEl) : null}
    </div>
  );
}
