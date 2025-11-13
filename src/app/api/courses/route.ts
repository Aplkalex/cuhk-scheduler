import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, Course as PrismaCourse } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mockCourses } from '@/data/mock-courses';
import { generatedCourses } from '@/data/generated-courses';
import { testCourses } from '@/data/test-courses';
import type { Course as SchedulerCourse } from '@/types';

const hasDatabase = Boolean(process.env.MONGODB_URI);
const allowFallback = process.env.ALLOW_FALLBACK_DATA !== 'false';

const normalizeCourse = (course: PrismaCourse): SchedulerCourse => ({
  _id: course.id,
  courseCode: course.courseCode,
  courseName: course.courseName,
  department: course.department,
  credits: course.credits,
  description: course.description ?? undefined,
  enrollmentRequirements: course.enrollmentRequirements ?? undefined,
  prerequisites: course.prerequisites ?? [],
  sections: course.sections as SchedulerCourse['sections'],
  term: course.term as SchedulerCourse['term'],
  career: course.career as SchedulerCourse['career'],
  lastUpdated: course.lastUpdated ?? undefined,
});

const matchesSearch = (course: SchedulerCourse, query: string) => {
  if (!query) return true;
  const code = course.courseCode.toLowerCase();
  const name = course.courseName.toLowerCase();
  if (code.includes(query) || name.includes(query)) {
    return true;
  }

  return course.sections.some((section) =>
    section.instructor?.name.toLowerCase().includes(query)
  );
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const term = params.get('term');
  const search = params.get('search')?.toLowerCase() ?? '';
  const department = params.get('department');
  const useTestData = params.get('testMode') === 'true';

  let courses: SchedulerCourse[] = [];

  if (useTestData) {
    courses = testCourses;
  } else if (hasDatabase) {
    try {
      const where: Prisma.CourseWhereInput = {};
      if (term) {
        where.term = term;
      }
      if (department) {
        where.department = department;
      }

      const dbCourses = await prisma.course.findMany({
        where,
        orderBy: { courseCode: 'asc' },
      });

      courses = dbCourses.map(normalizeCourse);
    } catch (error) {
      console.error('[courses] Failed to load courses from MongoDB:', error);
    }
  }

  if (courses.length === 0 && allowFallback) {
    const fallbackSource = useTestData
      ? testCourses
      : generatedCourses.length > 0
        ? generatedCourses
        : mockCourses;
    courses = fallbackSource;
  }

  if (courses.length === 0 && !allowFallback) {
    return NextResponse.json(
      { success: false, error: 'No course data available' },
      { status: 500 }
    );
  }

  const filtered = courses.filter((course) => {
    if (term && course.term !== term) return false;
    if (department && course.department !== department) return false;
    if (!search) return true;
    return matchesSearch(course, search);
  });

  return NextResponse.json({ success: true, count: filtered.length, data: filtered });
}
