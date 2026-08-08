import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';

export function generateCertificateId(): string {
  return 'CERT-' + randomBytes(5).toString('hex').toUpperCase();
}

export function verificationUrl(origin: string, certificateId: string): string {
  return `${origin}/certificates/verify/${certificateId}`;
}

export async function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 320, margin: 1 });
}

export async function getSiteTeacherName(): Promise<string> {
  const setting = await prisma.siteSetting.findUnique({ where: { id: 'platform' } });
  return setting?.teacherName || 'منصة الرائد';
}

async function issueCertificate(input: {
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  completionPercent: number;
}) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
  });
  if (existing) return existing;

  const teacherName = await getSiteTeacherName();
  const certificateId = generateCertificateId();

  return prisma.certificate.create({
    data: {
      userId: input.userId,
      certificateId,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
      completionPercent: input.completionPercent,
      studentName: input.studentName,
      teacherName,
    },
  });
}

export async function issueUnitCertificate(input: {
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  completionPercent: number;
}) {
  return issueCertificate(input);
}

export async function issueProgramCertificate(input: {
  userId: string;
  studentName: string;
  courseTitle: string;
  completionPercent: number;
}) {
  return issueCertificate({ ...input, courseId: 'program' });
}
