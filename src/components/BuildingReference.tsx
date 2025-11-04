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
        className="fixed bottom-6 right-6 bg-purple-600 dark:bg-purple-500 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all hover:scale-110 z-40"
        title="Building Reference"
      >
        <MapPin className="w-5 h-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">CUHK Building Reference</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete list of campus locations</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search buildings..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#252526] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            </div>

            {/* Building list */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredBuildings.map(({ code, name }) => (
                  <div
                    key={code}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                  >
                    <div className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded font-mono text-xs font-bold flex-shrink-0">
                      {code}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {name}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredBuildings.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No buildings found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252526] text-center text-xs text-gray-500 dark:text-gray-400">
              Total: {filteredBuildings.length} buildings
            </div>
          </div>
        </div>
      )}
    </>
  );
}
