'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { TermType } from '@/types';
import { cn } from '@/lib/utils';

type TermOption = { id: TermType; name: string };

interface TermSelectorProps {
  terms: TermOption[];
  selectedTerm: TermType;
  onChange: (term: TermType) => void;
  isLoading?: boolean;
  supportedTermId?: TermType; // e.g. '2025-26-T2'
  className?: string;
}

export function TermSelector({
  terms,
  selectedTerm,
  onChange,
  isLoading = false,
  supportedTermId,
  className,
}: TermSelectorProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = requestAnimationFrame(() => setPortalEl(document.body));
    return () => cancelAnimationFrame(id);
  }, []);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 8;
    const width = Math.max(220, rect.width + 24);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPos({ top: rect.bottom + gap, left, width });
  };

  const handleOpen = () => {
    updatePosition();
    setClosing(false);
    setOpen(true);
  };

  const handleClose = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  };

  useEffect(() => {
    if (!open) return;
    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const selected = useMemo(() => terms.find(t => t.id === selectedTerm), [terms, selectedTerm]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 pr-7 rounded-lg border select-none',
          'bg-white dark:bg-[#1f1f22]',
          'text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700',
          'shadow-sm hover:shadow transition-all cursor-pointer appearance-none whitespace-nowrap',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
          isLoading && 'opacity-60 cursor-not-allowed',
          className
        )}
        title={supportedTermId ? 'Only Term 2 has full data; other terms may be limited' : undefined}
      >
        <span className="font-semibold">{selected?.name ?? 'Select term'}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
      </button>

      {(open || closing) && portalEl && createPortal(
        <div className="fixed inset-0 z-50" aria-hidden>
          {/* Backdrop */}
          <div
            className={cn('absolute inset-0 bg-black/20', closing ? 'animate-fadeOut' : 'animate-fadeIn')}
            onClick={handleClose}
          />
          {/* Popover */}
          <div
            className={cn(
              'fixed rounded-xl border shadow-2xl overflow-hidden',
              'backdrop-blur-2xl',
              'bg-white/70 dark:bg-[#1e1e1e]/70',
              'border-gray-200/70 dark:border-gray-700/60',
              closing ? 'animate-slideOutToTop' : 'animate-slideInFromTop'
            )}
            style={{ top: pos.top, left: pos.left, width: pos.width, willChange: 'transform' }}
            role="menu"
          >
            <div className="max-h-[60vh] overflow-y-auto p-1">
              {terms.map((t) => {
                const isSelected = t.id === selectedTerm;
                const isSupported = supportedTermId ? t.id === supportedTermId : true;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.id);
                      handleClose();
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-all',
                      isSelected
                        ? 'bg-purple-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                        : 'hover:bg-white/80 dark:hover:bg-white/10',
                      !isSupported && !isSelected && 'opacity-70 italic'
                    )}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/15 text-white">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="inline-block w-4 h-4" />
                      )}
                      <span className="font-medium">{t.name}</span>
                      {!isSupported && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                          limited
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        portalEl
      )}
    </>
  );
}

export default TermSelector;
