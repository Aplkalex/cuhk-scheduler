/**
 * Import previously scraped JSON into MongoDB via Prisma.
 *
 * Usage:
 *   npm run import:courses -- data/cusis-export-2025-26-T1-*.json
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { Course } from '@/types';

const prisma = new PrismaClient();

const usage = () => {
  console.error('Usage: npm run import:courses -- <path-to-json>');
  process.exit(1);
};

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    usage();
  }

  const resolvedPath = path.resolve(process.cwd(), fileArg);
  console.log(`📄 Reading ${resolvedPath}`);
  const raw = await readFile(resolvedPath, 'utf-8');

  let courses: Course[];
  try {
    courses = JSON.parse(raw);
  } catch (error) {
    console.error('❌ Invalid JSON file:', error);
    process.exit(1);
  }

  if (!Array.isArray(courses)) {
    console.error('❌ Expected JSON array of courses');
    process.exit(1);
  }

  console.log('🧹 Clearing existing terms/courses...');
  await prisma.course.deleteMany();
  await prisma.term.deleteMany();

  const termSet = new Map<string, string>();
  courses.forEach((course) => {
    const label = course.term.replace(/-/g, ' ');
    termSet.set(course.term, course.lastUpdated ? label : label);
  });

  console.log(`🗂️  Inserting ${termSet.size} terms`);
  await prisma.term.createMany({
    data: Array.from(termSet.entries()).map(([id, name]) => ({ id, name })),
  });

  console.log(`📚 Inserting ${courses.length} courses`);
  await prisma.course.createMany({
    data: courses.map((course) => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      department: course.department,
      credits: course.credits,
      description: course.description ?? null,
      enrollmentRequirements: course.enrollmentRequirements ?? null,
      prerequisites: course.prerequisites ?? [],
      sections: course.sections ?? [],
      term: course.term,
      career: course.career,
      lastUpdated: course.lastUpdated ? new Date(course.lastUpdated) : new Date(),
    })),
  });

  console.log('✅ Import complete.');
}

main()
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
