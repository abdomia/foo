import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { buildStudentReport } from '@/lib/report';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const report = await buildStudentReport(user.id);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Error building report:', error);
    return NextResponse.json({ success: false, error: 'Failed to build report' }, { status: 500 });
  }
}
