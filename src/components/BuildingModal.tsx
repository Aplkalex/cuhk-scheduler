'use client';

import { X, MapPin, ExternalLink, Building2 } from 'lucide-react';
import { formatLocation, getBuildingCode } from '@/lib/location-utils';

interface BuildingModalProps {
  location: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BuildingModal({ isOpen, onClose, location }: BuildingModalProps) {
  if (!isOpen) return null;

  // Parse the location to extract building code and full name
  const buildingCode = getBuildingCode(location);
  const fullLocation = formatLocation(location);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fullLocation} CUHK`)}`;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-b border-purple-200 dark:border-purple-800/50 p-4">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 hover:bg-white/60 dark:hover:bg-black/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">Building</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{buildingCode}</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{fullLocation}</p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Location Details */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Location Details</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Building Code</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{buildingCode}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Building Name</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-right">{fullLocation}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Open in Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg">
              <span className="text-base">💡</span>
              <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                Click <span className="font-semibold">&ldquo;Open in Maps&rdquo;</span> to get directions to this building on campus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
