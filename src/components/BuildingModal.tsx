'use client';

import { useEffect } from 'react';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { formatLocation, getBuildingCode } from '@/lib/location-utils';

interface BuildingModalProps {
  location: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BuildingModal({ location, isOpen, onClose }: BuildingModalProps) {
  if (!isOpen) return null;

  const fullLocation = formatLocation(location);
  const buildingCode = getBuildingCode(location);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);
  
  // Generate Google Maps search URL for CUHK building
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`CUHK ${fullLocation}`)}`;
  
  // Use a simple gradient placeholder instead of external image
  const buildingImageStyle = {
    background: `linear-gradient(135deg, #4B2E83 0%, #6B46A8 100%)`,
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-2xl mx-4 animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{fullLocation}</h2>
              <p className="text-purple-100 text-sm mt-1">Building Code: {buildingCode}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Building Image */}
            <div className="mb-6 rounded-lg overflow-hidden border-2 border-gray-200">
              <div 
                style={buildingImageStyle}
                className="w-full h-64 flex items-center justify-center text-white"
              >
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">{buildingCode}</div>
                  <div className="text-lg opacity-90">Building Photo Coming Soon</div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 text-center">
                📸 Real photos will be added in the next update
              </div>
            </div>

            {/* Location Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Location Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Building Name:</span>
                  <span className="font-medium text-gray-900">{fullLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Building Code:</span>
                  <span className="font-medium text-gray-900">{buildingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room:</span>
                  <span className="font-medium text-gray-900">{location.split(' ').slice(1).join(' ') || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <MapPin className="w-5 h-5" />
                Open in Google Maps
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Click "Open in Google Maps" to get directions to this building on campus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
