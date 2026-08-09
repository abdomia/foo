import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getEffectiveAccessLevel } from '@/lib/content-access';
import { canAccessContent } from '@/lib/subscription';

const PRIVATE_UPLOADS_DIR = path.join(process.cwd(), 'private', 'uploads');

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pdf = await prisma.pdf.findUnique({ where: { id } });
    if (!pdf) {
      return NextResponse.json({ success: false, error: 'PDF not found' }, { status: 404 });
    }

    // Authorize: FREE files can be opened by anyone (including anonymous),
    // SUBSCRIBER/PREMIUM files require an active subscription (expiry is
    // checked inside getUserAccessLevel / getActiveSubscription).
    const user = await getSessionUser();
    const accessLevel = await getEffectiveAccessLevel(user);
    if (!canAccessContent(accessLevel, pdf.accessType)) {
      return user
        ? NextResponse.json({ success: false, error: 'هذا الملف يتطلب اشتراكاً' }, { status: 403 })
        : NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    // Resolve the physical file by its stored file name. Files live in the
    // private directory (outside `public`) so they are never statically served.
    const fileName = path.basename(pdf.fileUrl);
    if (!fileName || fileName === '.') {
      return NextResponse.json({ success: false, error: 'PDF not found' }, { status: 404 });
    }

    const filePath = path.join(PRIVATE_UPLOADS_DIR, fileName);
    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('not a file');
    } catch {
      return NextResponse.json({ success: false, error: 'PDF not found' }, { status: 404 });
    }

    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `inline; filename="${encodeURIComponent(pdf.title)}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ success: false, error: 'Failed to serve PDF' }, { status: 500 });
  }
}
