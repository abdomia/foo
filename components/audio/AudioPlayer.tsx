'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Headphones, FileAudio } from 'lucide-react';

export default function AudioPlayer({
  audioUrl,
  title,
}: {
  audioUrl: string;
  title: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">الملخص الصوتي للدرس</h2>
            <p className="text-xs text-text-secondary">
              استمع للملخص الصوتي الخاص بـ «{title}»
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FileAudio className="w-4 h-4 text-primary" />
            استمع للملخص أو حمّله من الأسفل
          </div>
          <audio
            controls
            src={audioUrl}
            preload="metadata"
            className="w-full"
            style={{ height: '48px' }}
          >
            متصفحك لا يدعم تشغيل الصوت.
          </audio>
          <a
            href={audioUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            تحميل الملف الصوتي
          </a>
        </div>
      </CardContent>
    </Card>
  );
}