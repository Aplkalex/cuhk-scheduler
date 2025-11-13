import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const FALLBACK_TERMS = [
  { id: '2025-26-T1', name: '2025-26 Term 1' },
  { id: '2025-26-T2', name: '2025-26 Term 2' },
  { id: '2025-26-Summer', name: '2025-26 Summer' },
];

const hasDatabase = Boolean(process.env.MONGODB_URI);

export async function GET() {
  if (hasDatabase) {
    try {
      const terms = await prisma.term.findMany({
        orderBy: { id: 'asc' },
      });

      if (terms.length > 0) {
        const payload = terms.map(({ id, name }) => ({ id, name }));
        return NextResponse.json({ success: true, count: payload.length, data: payload });
      }
    } catch (error) {
      console.error('[terms] Failed to load terms from MongoDB:', error);
    }
  }

  return NextResponse.json({
    success: true,
    count: FALLBACK_TERMS.length,
    data: FALLBACK_TERMS,
  });
}
