'use client';

import { useState, useRef } from 'react';
import { formatLocation } from '@/lib/location-utils';

interface LocationTooltipProps {
  location: string;
  children: React.ReactNode;
}

export function LocationTooltip({ location, children }: LocationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const fullLocation = formatLocation(location);

  // Only show tooltip if there's a difference between code and full name
  const shouldShowTooltip = fullLocation !== location;

  const handleMouseEnter = () => {
    console.log('Hover detected:', { location, fullLocation, shouldShowTooltip });
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      console.log('Position:', { top: rect.top, left: rect.left });
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  if (!shouldShowTooltip) {
    console.log('Tooltip disabled:', { location, fullLocation, shouldShowTooltip });
    return <>{children}</>;
  }

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help inline-block"
      >
        {children}
      </div>
      
      {showTooltip && (
        <div 
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            maxWidth: '300px'
          }}
        >
          {fullLocation}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </>
  );
}
