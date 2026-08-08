import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { makeQrDataUrl, verificationUrl } from '@/lib/certificates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const { certificateId } = await params;
  const origin = request.nextUrl.origin;

  try {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId },
    });

    if (!certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    const verifyUrl = verificationUrl(origin, certificate.certificateId);

    return NextResponse.json({
      success: true,
      data: {
        certificateId: certificate.certificateId,
        courseTitle: certificate.courseTitle,
        completionPercent: certificate.completionPercent,
        studentName: certificate.studentName,
        teacherName: certificate.teacherName,
        issuedAt: certificate.issuedAt.toISOString(),
        verifyUrl,
        qrDataUrl: await makeQrDataUrl(verifyUrl),
      },
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify certificate' }, { status: 500 });
  }
}
