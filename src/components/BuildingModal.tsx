'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, ExternalLink, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseLocation } from '@/lib/location-utils';

interface BuildingModalProps {
  location: string;
  isOpen: boolean;
  onClose: () => void;
  appearance?: 'frosted' | 'modern';
}

export default function BuildingModal({ isOpen, onClose, location, appearance: _appearance = 'modern' }: BuildingModalProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      frame = requestAnimationFrame(() => {
        setRendered(true);
        setVisible(true);
      });
    } else {
      frame = requestAnimationFrame(() => {
        setVisible(false);
      });
      timeout = setTimeout(() => setRendered(false), 220);
    }

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };
  }, [isOpen]);

  if (!rendered) return null;

  // Parse the location to extract building code, building name, and optional room
  const { building: buildingCode, buildingName, room, fullName } = parseLocation(location);
  const hasRoom = Boolean(room?.trim());
  const mapQuery = hasRoom ? fullName : buildingName;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapQuery} CUHK`)}`;

  // Always use the frosted glass presentation for a consistent transparent look across modes.
  void _appearance;
  const overlayClass = 'bg-black/45 backdrop-blur-md';
  const containerClass = cn(
    'relative overflow-hidden rounded-2xl border transition-all duration-300',
    'shadow-[0_32px_90px_-48px_rgba(15,23,42,0.55)]',
    'bg-white/55 dark:bg-white/[0.08] backdrop-blur-[28px] border-white/30 dark:border-white/[0.1]'
  );

  const headerClass = cn(
    'relative flex items-start gap-4 p-6 pb-5 border-b',
    'border-white/30 dark:border-white/[0.08] bg-white/20 dark:bg-white/[0.05]'
  );

  const detailCardClass = cn(
    'rounded-2xl border p-4 sm:p-5 transition-colors',
    'border-purple-200/40 dark:border-purple-200/15 bg-purple-500/12 dark:bg-purple-500/14 backdrop-blur-[26px]'
  );

  const primaryButtonClass = cn(
    'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500',
    'bg-purple-500/90 text-white shadow-[0_22px_46px_-22px_rgba(111,66,193,0.55)] hover:bg-purple-500/80 dark:bg-purple-500/70 dark:hover:bg-purple-500/60 backdrop-blur-md'
  );

  const secondaryButtonClass = cn(
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400',
    'bg-white/40 hover:bg-white/55 text-slate-700 dark:text-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]'
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[600] transition-opacity duration-200 ease-out',
          overlayClass,
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'fixed left-1/2 top-1/2 z-[610] w-full max-w-md p-4 transition-opacity duration-200 ease-out',
          '-translate-x-1/2 -translate-y-1/2',
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-modal
        role="dialog"
      >
        <div
          className={cn(
            containerClass,
            'transform-gpu transition-all duration-200 ease-out',
            visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.97] opacity-0'
          )}
        >
          {/* Header */}
          <div className={headerClass}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Close building details"
            >
              <X className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            </button>

            <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl',
              'bg-purple-500/90 text-white shadow-[0_20px_42px_-22px_rgba(111,66,193,0.55)] backdrop-blur-sm'
            )}>
              <Building2 className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/80">Building</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{buildingCode}</span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-300">{buildingName}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <div className={detailCardClass}>
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'bg-purple-500/18 text-purple-600 dark:text-purple-200 dark:bg-purple-500/14 backdrop-blur-sm'
                )}>
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Location details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300/80">Campus codes & official building name</p>
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-white/40 dark:border-white/[0.08] pb-3">
                  <dt className="text-slate-500 dark:text-slate-300/80">Building code</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{buildingCode}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-300/80">Building name</dt>
                  <dd className="text-right font-medium text-slate-900 dark:text-white max-w-[220px] sm:max-w-none">{buildingName}</dd>
                </div>
                {hasRoom && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-300/80">Room</dt>
                    <dd className="text-right font-medium text-slate-900 dark:text-white max-w-[200px] sm:max-w-none">{room}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButtonClass}
              >
                <MapPin className="w-4 h-4" />
                Open in Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className={secondaryButtonClass}
              >
                Close
              </button>
            </div>

            <div className={cn(
              'flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-relaxed',
              'border-purple-200/50 dark:border-purple-200/10 bg-purple-500/12 dark:bg-purple-500/10 text-purple-900/85 dark:text-purple-100 backdrop-blur-sm'
            )}>
              <span className="text-base">💡</span>
              <p>
                Tap <span className="font-semibold">Open in Maps</span> to launch the CUHK building location in your preferred map app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
