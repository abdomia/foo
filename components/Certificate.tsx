'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface CertificateProps {
  userName: string;
  onClose?: () => void;
}

export function Certificate({ userName, onClose }: CertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  const generateCertificate = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load the background image
    const img = new window.Image();
    img.src = '/certifacate.jpeg';

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the background image
      ctx.drawImage(img, 0, 0);

      // Set text properties for user name
      ctx.font = 'italic bold 60px "IBM Plex Sans Arabic", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Add text shadow for better readability
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Position in middle right (65% from left, 50% from top)
      const xPos = canvas.width * 0.65;
      const yPos = canvas.height * 0.5;

      // Draw the user name in the middle right of the certificate
      ctx.fillStyle = '#1a1a2e';
      ctx.fillText(userName, xPos, yPos);

      setIsLoaded(true);
      setIsGenerating(false);
    };

    img.onerror = () => {
      // Fallback: just show the name without image
      canvas.width = 800;
      canvas.height = 600;
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 48px "IBM Plex Sans Arabic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1a1a2e';
      ctx.fillText(`شهادة إتمام`, canvas.width / 2, 150);
      ctx.fillText(userName, canvas.width / 2, canvas.height / 2);
      ctx.font = '24px "IBM Plex Sans Arabic", sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('لقد أكملت الاختبار بنجاح', canvas.width / 2, canvas.height / 2 + 80);

      setIsLoaded(true);
      setIsGenerating(false);
    };
  }, [userName]);

  useEffect(() => {
    generateCertificate();
  }, [generateCertificate]);

  const downloadCertificate = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `شهادة_${userName}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-gray-100 w-full">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxWidth: '100%' }}
        />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={downloadCertificate}
          disabled={!isLoaded || isGenerating}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          تحميل الشهادة
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            إغلاق
          </button>
        )}
      </div>
    </div>
  );
}

export function CertificateSimple({ userName }: { userName: string }) {
  return (
    <div className="relative w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/certifacate.jpeg"
        alt="شهادة إتمام"
        className="w-full h-auto"
      />
      <div className="absolute top-[54.5%] left-[65%] transform -translate-x-1/2 -translate-y-1/2">
        <h2 className="text-3xl md:text-4xl font-bold italic text-[#1a1a2e]">
          {userName}
        </h2>
      </div>
    </div>
  );
}
