'use client';

import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { BUILDINGS } from '@/lib/constants';
import { searchBuildings } from '@/lib/location-utils';

export function BuildingReference() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuildings = searchQuery 
    ? searchBuildings(searchQuery)
    : Object.entries(BUILDINGS).map(([code, name]) => ({ code, name }));

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 z-40"
        title="Building Reference"
      >
        <MapPin className="w-5 h-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">CUHK Building Reference</h2>
                <p className="text-sm text-gray-500 mt-1">Complete list of campus locations</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search buildings..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Building list */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredBuildings.map(({ code, name }) => (
                  <div
                    key={code}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded font-mono text-xs font-bold flex-shrink-0">
                      {code}
                    </div>
                    <div className="text-sm text-gray-700 flex-1">
                      {name}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredBuildings.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No buildings found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
              Total: {filteredBuildings.length} buildings
            </div>
          </div>
        </div>
      )}
    </>
  );
}
