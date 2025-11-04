'use client';

import { useState } from 'react';
import { formatLocation } from '@/lib/location-utils';

interface LocationTooltipProps {
  location: string;
  children: React.ReactNode;
}

export function LocationTooltip({ location, children }: LocationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const fullLocation = formatLocation(location);

  // Only show tooltip if there's a difference between code and full name
  const shouldShowTooltip = fullLocation !== location;

  if (!shouldShowTooltip) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap">
          {fullLocation}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}
