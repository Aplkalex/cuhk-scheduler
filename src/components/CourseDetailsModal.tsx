'use client';

import { SelectedCourse } from '@/types';
import { X, Clock, MapPin, User, Globe, Users, AlertCircle } from 'lucide-react';
import { formatTime, hasAvailableSeats } from '@/lib/schedule-utils';

interface CourseDetailsModalProps {
  selectedCourse: SelectedCourse | null;
  onClose: () => void;
  onLocationClick?: (location: string) => void;
}

export function CourseDetailsModal({ selectedCourse, onClose, onLocationClick }: CourseDetailsModalProps) {
  if (!selectedCourse) return null;

  const { course, selectedSection } = selectedCourse;
  const isFull = !hasAvailableSeats(selectedSection);
  const availabilityStatus = selectedSection.seatsRemaining > 0 ? 'Open' : 
                            selectedSection.quota === selectedSection.enrolled ? 'Full' : 'Restricted';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#252526] rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div 
          className="sticky top-0 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[#252526]/95 backdrop-blur-sm flex items-start justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {course.courseCode}
              </h2>
              {selectedSection.sectionType === 'Lecture' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  LEC
                </span>
              )}
              {selectedSection.sectionType === 'Tutorial' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                  TUT
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {course.courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Section Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Section Details
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">
                  Section
                </div>
                <div className="text-gray-900 dark:text-white text-base font-semibold">
                  {selectedSection.sectionType === 'Lecture' && 'Lecture '}
                  {selectedSection.sectionType === 'Tutorial' && 'Tutorial '}
                  {selectedSection.sectionType === 'Lab' && 'Lab '}
                  {selectedSection.sectionId}
                  {selectedSection.classNumber && (
                    <span className="text-gray-600 dark:text-gray-400 font-normal ml-2">
                      ({selectedSection.classNumber})
                    </span>
                  )}
                </div>
              </div>

              {selectedSection.instructor && (
                <div className="flex items-start">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0 mr-2" />
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white text-sm">
                      {selectedSection.instructor.name}
                    </div>
                    {selectedSection.instructor.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedSection.instructor.email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSection.language && (
                <div className="flex items-center">
                  <Globe className="w-4 h-4 text-gray-400 flex-shrink-0 mr-2" />
                  <span className="text-gray-900 dark:text-white text-sm flex-1">
                    {selectedSection.language}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Schedule
            </h3>
            <div className="space-y-2">
              {selectedSection.timeSlots.map((slot, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-[#1e1e1e] rounded-lg p-3 space-y-2">
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 mr-2" />
                    <div className="text-sm text-gray-900 dark:text-white flex-1">
                      <span className="font-medium">{slot.day}</span> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </div>
                  </div>
                  {slot.location && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5 mr-2" />
                      <button
                        onClick={() => {
                          onLocationClick?.(slot.location!);
                          onClose();
                        }}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline transition-colors text-left flex-1"
                      >
                        {slot.location}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enrollment */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Enrollment
            </h3>
            <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-lg p-3 space-y-3">
              <div className="flex items-start">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 mr-2" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <div className="flex items-center gap-1.5">
                    {isFull && <AlertCircle className="w-4 h-4 text-red-500" />}
                    <span className={`font-semibold text-sm px-2 py-0.5 rounded ${
                      availabilityStatus === 'Open' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                        : availabilityStatus === 'Full'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    }`}>
                      {availabilityStatus}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pl-6">
                <span className="text-gray-600 dark:text-gray-400">Enrolled / Quota:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedSection.enrolled} / {selectedSection.quota}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pl-6">
                <span className="text-gray-600 dark:text-gray-400">Seats Remaining:</span>
                <span className={`font-medium ${
                  selectedSection.seatsRemaining > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {selectedSection.seatsRemaining}
                </span>
              </div>
            </div>
          </div>

          {/* Consent */}
          {(selectedSection.addConsent || selectedSection.dropConsent) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Consent Required
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 space-y-2">
                {selectedSection.addConsent && (
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                    <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">Add consent required</span>
                  </div>
                )}
                {selectedSection.dropConsent && (
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                    <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">Drop consent required</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
