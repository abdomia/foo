'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HeroAnimation({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-logo', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' });
      gsap.from('.hero-title', { y: 40, opacity: 0, duration: 0.7, delay: 0.2, ease: 'power2.out' });
      gsap.from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.7, delay: 0.35, ease: 'power2.out' });
      gsap.from('.hero-description', { y: 20, opacity: 0, duration: 0.6, delay: 0.5, ease: 'power2.out' });
      gsap.from('.hero-cta', { y: 20, opacity: 0, duration: 0.6, delay: 0.65, ease: 'power2.out', stagger: 0.1 });
      gsap.from('.hero-stats', { y: 30, opacity: 0, duration: 0.7, delay: 0.8, ease: 'power2.out' });
    }, containerRef);
    return () => ctx.revert();
  }, { scope: containerRef });
  return <div ref={containerRef}>{children}</div>;
}

export function ImageReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    gsap.set(ref.current, { clipPath: 'inset(0 100% 0 0)' });
    gsap.to(ref.current, {
      clipPath: 'inset(0 0% 0 0)',
      duration: 1.2,
      delay: 0.3,
      ease: 'power3.out',
    });
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}

export function FloatingPillNav({ children }: { children: React.ReactNode }) {
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!navRef.current) return;
    gsap.set(navRef.current, { y: -20, opacity: 0 });
    gsap.to(navRef.current, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      delay: 0.3,
      ease: 'power2.out',
    });
    const handleScroll = () => {
      if (!navRef.current) return;
      const scrollY = window.scrollY;
      gsap.to(navRef.current, {
        boxShadow: scrollY > 50
          ? 'rgba(0, 0, 0, 0.06) 0px 4px 24px 0px'
          : 'rgba(0, 0, 0, 0.04) 0px 4px 24px 0px',
        duration: 0.3,
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <div ref={navRef} className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-surface/95 backdrop-blur-sm rounded-full px-10 py-4 shadow-[rgba(0,0,0,0.04)_0px_4px_24px_0px] flex items-center justify-between max-w-5xl mx-auto" style={{ minWidth: 'clamp(320px, 80vw, 1100px)' }}>
        {children}
      </div>
    </div>
  );
}
