'use client';

import { useState } from 'react';
import { Course, Section, SelectedCourse } from '@/types';
import { mockCourses } from '@/data/mock-courses';
import { TimetableGrid } from '@/components/TimetableGrid';
import { CourseList } from '@/components/CourseList';
import { SearchBar, FilterBar, FilterButton } from '@/components/SearchBar';
import { generateCourseColor, calculateTotalCredits, detectConflicts } from '@/lib/schedule-utils';
import { DISCLAIMER } from '@/lib/constants';
import { Calendar, Book, AlertCircle, Trash2 } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // Filter courses based on search and filters
  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = 
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.sections.some(s => 
        s.instructor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDepartment = !selectedDepartment || course.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = Array.from(new Set(mockCourses.map(c => c.department)));

  // Add a course section to schedule
  const handleAddSection = (course: Course, section: Section) => {
    const newCourse: SelectedCourse = {
      course,
      selectedSection: section,
      color: generateCourseColor(selectedCourses.length),
    };
    setSelectedCourses([...selectedCourses, newCourse]);
  };

  // Remove a course from schedule
  const handleRemoveCourse = (index: number) => {
    setSelectedCourses(selectedCourses.filter((_, i) => i !== index));
  };

  // Clear all courses
  const handleClearSchedule = () => {
    if (confirm('Clear your entire schedule?')) {
      setSelectedCourses([]);
    }
  };

  // Calculate stats
  const totalCredits = calculateTotalCredits(selectedCourses);
  const conflicts = detectConflicts(selectedCourses);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 text-white p-3 rounded-xl shadow-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  CUHK Course Scheduler
                </h1>
                <p className="text-sm text-gray-500">
                  Plan your perfect timetable
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{selectedCourses.length}</div>
                <div className="text-xs text-gray-500">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalCredits}</div>
                <div className="text-xs text-gray-500">Credits</div>
              </div>
              {conflicts.length > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
                  <div className="text-xs text-gray-500">Conflicts</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Disclaimer */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{DISCLAIMER}</p>
        </div>

        {/* Conflicts warning */}
        {conflicts.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 mb-2">Schedule Conflicts Detected!</p>
                {conflicts.map((conflict, idx) => (
                  <p key={idx} className="text-sm text-red-700">
                    {conflict.course1.course.courseCode} conflicts with {conflict.course2.course.courseCode}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Course search */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Book className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">Find Courses</h2>
              </div>

              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search courses..."
                className="mb-4"
              />

              <FilterBar
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              >
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                    Department
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <FilterButton
                      active={selectedDepartment === null}
                      onClick={() => setSelectedDepartment(null)}
                    >
                      All
                    </FilterButton>
                    {departments.map((dept) => (
                      <FilterButton
                        key={dept}
                        active={selectedDepartment === dept}
                        onClick={() => setSelectedDepartment(dept)}
                      >
                        {dept.split(' ')[0]}
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </FilterBar>
            </div>

            {/* Course list */}
            <div className="max-h-[600px] overflow-y-auto space-y-4">
              <CourseList
                courses={filteredCourses}
                onAddSection={handleAddSection}
              />
            </div>
          </div>

          {/* Right side - Timetable */}
          <div className="lg:col-span-2 space-y-4">
            {/* My Schedule header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">My Schedule</h2>
                  <p className="text-sm text-gray-500">2025-26 Term 1</p>
                </div>
                {selectedCourses.length > 0 && (
                  <button
                    onClick={handleClearSchedule}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Timetable */}
            {selectedCourses.length > 0 ? (
              <TimetableGrid
                selectedCourses={selectedCourses}
                onCourseClick={(course) => {
                  const index = selectedCourses.indexOf(course);
                  if (confirm(`Remove ${course.course.courseCode}?`)) {
                    handleRemoveCourse(index);
                  }
                }}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your schedule is empty
                </h3>
                <p className="text-gray-500">
                  Search for courses and click the + button to add them to your schedule
                </p>
              </div>
            )}

            {/* Selected courses list */}
            {selectedCourses.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  Selected Courses ({selectedCourses.length})
                </h3>
                <div className="space-y-2">
                  {selectedCourses.map((sc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: sc.color }}
                        />
                        <div>
                          <div className="font-semibold text-sm text-gray-900">
                            {sc.course.courseCode} - {sc.selectedSection.sectionType} {sc.selectedSection.sectionId}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sc.course.credits} credits
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCourse(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
