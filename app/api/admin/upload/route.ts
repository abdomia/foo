import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Only PDF files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Private storage: files are never served from `public`. They are streamed
    // through the authorized endpoint GET /api/files/pdf/[id].
    const uploadsDir = path.join(process.cwd(), 'private', 'uploads');
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    // The returned value is the stored file name (resolved server-side later).
    const fileUrl = fileName;

    return NextResponse.json({ 
      success: true, 
      data: { 
        url: fileUrl,
        fileName: file.name,
        size: file.size
      } 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}