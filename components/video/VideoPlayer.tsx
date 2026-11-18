'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Play, Check, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  videoUrl: string;
  lessonId: string;
  title: string;
  startSeconds?: number;
  completed?: boolean;
  onComplete: () => void;
  onPositionSaved?: (watchSeconds: number) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: Record<string, (e: unknown) => void>;
        }
      ) => YTPlayerInstance;
      PlayerState?: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  destroy?: () => void;
}

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

function cleanYouTubeId(value: string | null | undefined): string | null {
  if (!value) return null;
  // `youtu.be/ID?si=...`, `watch?v=ID&t=...`, `embed/ID?start=...`
  const id = value.split(/[?&#/]/)[0].trim();
  return YOUTUBE_ID_PATTERN.test(id) ? id : null;
}

/**
 * Accepts every common YouTube link shape and returns a validated video id:
 *   https://www.youtube.com/watch?v=ID          https://youtu.be/ID
 *   https://youtu.be/ID?si=SHARE_TOKEN          https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID           https://www.youtube.com/live/ID
 *   https://m.youtube.com/watch?v=ID&t=30s      https://music.youtube.com/watch?v=ID
 * Returns null when no usable id can be found (caller shows a placeholder
 * instead of handing an invalid id to the YouTube player, which throws).
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL | null = null;
  try {
    parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    parsed = null;
  }

  if (parsed) {
    const host = parsed.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be') {
      return cleanYouTubeId(parts[0]);
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (parts[0] === 'watch') return cleanYouTubeId(parsed.searchParams.get('v'));
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') {
        return cleanYouTubeId(parts[1]);
      }
    }
  }

  // Fallback for links without a protocol or with unusual formatting.
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/
  );
  return match ? cleanYouTubeId(match[1]) : null;
}

export function VideoPlayer({
  videoUrl,
  lessonId,
  title,
  startSeconds = 0,
  completed = false,
  onComplete,
  onPositionSaved,
}: VideoPlayerProps) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [saved, setSaved] = useState(completed);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const lastReportRef = useRef<number>(Date.now());
  const startSecondsRef = useRef<number>(startSeconds);

  // Keep the latest callback without re-running effects on every parent render.
  const onPositionSavedRef = useRef(onPositionSaved);
  useEffect(() => {
    onPositionSavedRef.current = onPositionSaved;
  }, [onPositionSaved]);

  useEffect(() => {
    startSecondsRef.current = startSeconds;
  }, [startSeconds]);

  useEffect(() => {
    setSaved(completed);
  }, [completed]);

  const videoId = getYouTubeVideoId(videoUrl);

  const savePosition = useCallback(
    async (watchSeconds: number, timeSpentSeconds: number, markComplete = false) => {
      if (!lessonId) return;
      const safeWatch = Number.isFinite(watchSeconds) ? Math.max(0, Math.floor(watchSeconds)) : 0;
      const safeSpent = Number.isFinite(timeSpentSeconds) ? Math.max(0, Math.floor(timeSpentSeconds)) : 0;
      try {
        await fetch('/api/user/lesson-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            progress: markComplete ? 100 : 0,
            watchSeconds: safeWatch,
            timeSpentSeconds: safeSpent,
            completed: markComplete,
          }),
        });
      } catch (err) {
        console.error('Error saving progress:', err);
      }
      onPositionSavedRef.current?.(safeWatch);
    },
    [lessonId]
  );

  useEffect(() => {
    if (!videoId) return;
    const host = containerRef.current;
    if (!host) return;

    let cancelled = false;
    let readyHandler: (() => void) | null = null;
    // YouTube replaces this node with its <iframe>. It stays outside React's
    // tree so React never tries to remove a DOM node the iframe API took over.
    let mountNode: HTMLDivElement | null = null;

    const initPlayer = () => {
      if (cancelled || !host || !window.YT?.Player) return;
      if (playerRef.current) return;
      mountNode = document.createElement('div');
      host.appendChild(mountNode);
      const initial = Math.floor(startSecondsRef.current || 0);
      try {
        playerRef.current = new window.YT.Player(mountNode, {
          videoId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            start: initial > 0 ? initial : undefined,
            autoplay: 0,
          },
          events: {
            onReady: (e: unknown) => {
              lastReportRef.current = Date.now();
              const player = e as { target?: YTPlayerInstance };
              const initialStart = Math.floor(startSecondsRef.current || 0);
              if (initialStart > 0 && player.target?.seekTo) {
                try {
                  player.target.seekTo(initialStart, true);
                } catch {
                  // Seeking is best-effort.
                }
              }
            },
            onStateChange: (e: unknown) => {
              const state = e as { data?: number };
              if (state?.data === 1) {
                lastReportRef.current = Date.now();
              }
            },
          },
        });
      } catch (err) {
        // Never let a bad/blocked video take down the whole page.
        console.error('Failed to initialise YouTube player:', err);
        setApiFailed(true);
      }
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      readyHandler = () => initPlayer();
      window.onYouTubeIframeAPIReady = readyHandler;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const first = document.getElementsByTagName('script')[0];
        first?.parentNode?.insertBefore(tag, first);
      }
    }

    const failTimer = setTimeout(() => {
      if (!playerRef.current && !cancelled) setApiFailed(true);
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(failTimer);
      if (readyHandler && window.onYouTubeIframeAPIReady === readyHandler) {
        delete window.onYouTubeIframeAPIReady;
      }
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.destroy?.();
      } catch {
        // Ignore teardown errors from the iframe API.
      }
      mountNode?.remove();
      mountNode = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;
      let ct: number;
      try {
        ct = player.getCurrentTime();
      } catch {
        return;
      }
      const now = Date.now();
      const delta = Math.min(30, Math.max(0, Math.floor((now - lastReportRef.current) / 1000)));
      lastReportRef.current = now;
      if (delta > 0) {
        savePosition(ct, delta, false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [videoId, savePosition]);

  useEffect(() => {
    if (!videoId) return;
    const handleUnload = () => {
      const player = playerRef.current;
      let ct = 0;
      if (player && typeof player.getCurrentTime === 'function') {
        try {
          ct = player.getCurrentTime();
        } catch {
          ct = 0;
        }
      }
      const now = Date.now();
      const delta = Math.min(30, Math.max(0, Math.floor((now - lastReportRef.current) / 1000)));
      lastReportRef.current = now;
      if (delta > 0) {
        savePosition(ct, delta, false);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [videoId, savePosition]);

  const handleMarkComplete = async () => {
    if (!lessonId) return;
    try {
      const player = playerRef.current;
      let ct = 0;
      if (player && typeof player.getCurrentTime === 'function') {
        try {
          ct = player.getCurrentTime();
        } catch {
          ct = 0;
        }
      }
      await fetch('/api/user/lesson-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, progress: 100, watchSeconds: Math.floor(ct), completed: true }),
      });
    } catch (err) {
      console.error('Error:', err);
    }
    setSaved(true);
    setShowCompleteModal(false);
    onComplete();
  };

  if (!videoId) {
    return (
      <motion.div
        className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">رابط الفيديو غير صالح</p>
        </div>
      </motion.div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?modestbranding=1&rel=0&playsinline=1${
    startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : ''
  }`;

  return (
    <>
      <motion.div
        className="aspect-video bg-black relative rounded-t-2xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, type: 'spring' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={containerRef}
          className={`w-full h-full absolute inset-0 ${apiFailed ? 'hidden' : ''}`}
        />

        {apiFailed && (
          <motion.iframe
            key="fallback"
            src={embedUrl}
            className="w-full h-full absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          />
        )}

        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        <motion.div
          className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full max-w-[80%]"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white text-sm font-medium truncate">🎬 {title}</p>
        </motion.div>
      </motion.div>

      <motion.div
        className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-b-2xl shadow-lg border-t border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {saved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-3 py-7 text-xl font-bold text-success bg-success/10 rounded-xl border-2 border-success/30"
          >
            <CheckCircle2 className="w-7 h-7" />
            <span>تم إكمال الدرس بنجاح 🎉</span>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <motion.div
              animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Button
                onClick={() => setShowCompleteModal(true)}
                className="w-full gap-3 py-7 text-xl font-bold bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
              >
                <motion.div className="flex items-center gap-3" whileHover={{ x: 5 }}>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <CheckCircle2 className="w-7 h-7" />
                  </motion.div>
                  <span>تم إكمال الدرس</span>
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.3, opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 12, stiffness: 150 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-2xl overflow-hidden rounded-2xl">
                <motion.div
                  className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                />
                <CardContent className="p-8 text-center">
                  <motion.div
                    className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.2, damping: 10, stiffness: 100 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-white" />
                  </motion.div>

                  <motion.h2
                    className="text-3xl font-bold text-gray-800 dark:text-white mb-3"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    هل أكملت المشاهدة؟
                  </motion.h2>

                  <motion.p
                    className="text-gray-500 dark:text-gray-400 mb-8 text-lg"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    تأكد أنك شاهدت الفيديو كاملاً قبل التأكيد
                  </motion.p>

                  <motion.div
                    className="flex gap-4"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        onClick={() => setShowCompleteModal(false)}
                        className="flex-1 py-7 text-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl px-6"
                      >
                        <X className="w-5 h-5 mr-2" />
                        لا بعد
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleMarkComplete}
                        className="flex-1 py-7 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg px-6"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        نعم
                      </Button>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!completed && startSeconds > 0 && !apiFailed && (
        <motion.div
          className="flex items-center gap-2 text-sm text-text-secondary mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <RotateCcw className="w-4 h-4" />
          <span>سيتم استكمال الدرس من حيث توقفت (آخر مشاهدة تُحفظ تلقائياً)</span>
        </motion.div>
      )}
    </>
  );
}
