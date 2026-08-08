'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface CertificateViewProps {
  studentName: string;
  courseTitle: string;
  completionPercent: number;
  teacherName: string;
  certificateId: string;
  issuedAt: string;
  qrDataUrl?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function CertificateView({
  studentName,
  courseTitle,
  completionPercent,
  teacherName,
  certificateId,
  issuedAt,
  qrDataUrl,
}: CertificateViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 848;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#fdfaf2';
    ctx.fillRect(0, 0, W, H);

    // Gold double border
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 6;
    roundRect(ctx, 24, 24, W - 48, H - 48, 18);
    ctx.stroke();
    ctx.lineWidth = 2;
    roundRect(ctx, 40, 40, W - 80, H - 80, 12);
    ctx.stroke();

    // Brand
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a6d1a';
    ctx.font = 'bold 44px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('منصة الرائد', W / 2, 130);

    // Title
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 64px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('شهادة إتمام', W / 2, 220);

    ctx.font = '28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('تُمنح هذه الشهادة إلى الطالب / الطالبة', W / 2, 285);

    // Student name
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 56px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(studentName, W / 2, 380);

    // Divider
    ctx.strokeStyle = '#e5d9a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 200, 420);
    ctx.lineTo(W / 2 + 200, 420);
    ctx.stroke();

    // Course
    ctx.fillStyle = '#374151';
    ctx.font = '32px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('لإتمامه بنجاح', W / 2, 480);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 42px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(courseTitle, W / 2, 545);
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 32px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(`بنسبة إنجاز ${completionPercent}%`, W / 2, 600);

    // Footer info
    ctx.fillStyle = '#6b7280';
    ctx.font = '26px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(`التاريخ: ${formatDate(issuedAt)}`, W / 2, 665);
    ctx.fillText(`المدرس: ${teacherName}`, W / 2, 710);

    // Certificate ID
    ctx.fillStyle = '#9ca3af';
    ctx.font = '22px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(certificateId, W / 2, 775);

    // QR (bottom-left)
    if (qrDataUrl) {
      const img = new window.Image();
      img.onload = () => {
        const size = 130;
        ctx.drawImage(img, 70, H - size - 60, size, size);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '18px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('امسح للتحقق', 135, H - 40);
        setIsLoaded(true);
      };
      img.onerror = () => setIsLoaded(true);
      img.src = qrDataUrl;
    } else {
      setIsLoaded(true);
    }
  }, [studentName, courseTitle, completionPercent, teacherName, certificateId, issuedAt, qrDataUrl]);

  useEffect(() => {
    draw();
  }, [draw]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `شهادة_${certificateId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-gray-100 w-full">
        <canvas ref={canvasRef} className="w-full h-auto" style={{ maxWidth: '100%' }} />
      </div>
      <button
        onClick={download}
        disabled={!isLoaded}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        تحميل الشهادة (PNG)
      </button>
    </div>
  );
}
