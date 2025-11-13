import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, Course as PrismaCourse } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mockCourses } from '@/data/mock-courses';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { courseCode: string } }
) {
  const useTestData = request.nextUrl.searchParams.get('testMode') === 'true';

  if (useTestData) {
    const testCourse = testCourses.find((c) => c.courseCode === params.courseCode);
    if (testCourse) {
      return NextResponse.json({ success: true, data: testCourse });
    }
  } else if (hasDatabase) {
    try {
      const dbCourse = await prisma.course.findUnique({
        where: { courseCode: params.courseCode },
      });

      if (dbCourse) {
        return NextResponse.json({ success: true, data: normalizeCourse(dbCourse) });
      }
    } catch (error) {
      console.error('[course detail] Failed to load course from MongoDB:', error);
    }
  }

  if (allowFallback) {
    const fallbackCourse = mockCourses.find((c) => c.courseCode === params.courseCode);

    if (fallbackCourse) {
      return NextResponse.json({ success: true, data: fallbackCourse });
    }
  }

  return NextResponse.json(
    { success: false, error: 'Course not found' },
    { status: 404 }
  );
}
