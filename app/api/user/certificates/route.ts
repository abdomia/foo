import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { makeQrDataUrl, verificationUrl } from '@/lib/certificates';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const origin = request.nextUrl.origin;

  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
    });

    const data = await Promise.all(
      certificates.map(async (cert) => ({
        id: cert.id,
        certificateId: cert.certificateId,
        courseId: cert.courseId,
        courseTitle: cert.courseTitle,
        completionPercent: cert.completionPercent,
        studentName: cert.studentName,
        teacherName: cert.teacherName,
        issuedAt: cert.issuedAt.toISOString(),
        verifyUrl: verificationUrl(origin, cert.certificateId),
        qrDataUrl: await makeQrDataUrl(verificationUrl(origin, cert.certificateId)),
      }))
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch certificates' }, { status: 500 });
  }
}
