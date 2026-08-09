'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function MathParticles({ count = 20, theme = 'light' }: { count?: number; theme?: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: seededRandom(i * 1.1) * 100,
      y: seededRandom(i * 2.2) * 100,
      size: seededRandom(i * 3.3) * 4 + 2,
      duration: seededRandom(i * 4.4) * 20 + 15,
      delay: seededRandom(i * 5.5) * 5,
      symbol: ['∑', '∫', 'π', '∞', 'Δ', '√', 'θ', 'λ', 'μ', 'σ'][Math.floor(seededRandom(i * 6.6) * 10)],
    }));
  }, [count]);

  const isDark = theme === 'dark';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute font-bold ${isDark ? 'text-primary/20' : 'text-primary/15'}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: particle.size * 4,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0.5],
            y: [0, -100, -200],
            x: [0, 30, -30],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {particle.symbol}
        </motion.div>
      ))}
    </div>
  );
}

export function FloatingEquation({
  equation = 'E = mc²',
  className = ''
}: {
  equation?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`absolute font-mono font-bold ${className}`}
      animate={{
        y: [-10, 10, -10],
        rotate: [-5, 5, -5],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <span className="text-2xl md:text-4xl text-primary/20 dark:text-primary-light/20">
        {equation}
      </span>
    </motion.div>
  );
}

export function AnimatedGraph() {
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!isMounted) return null;

  const points = [
    { x: 0, y: 80 },
    { x: 20, y: 60 },
    { x: 40, y: 70 },
    { x: 60, y: 40 },
    { x: 80, y: 30 },
    { x: 100, y: 20 },
  ];

  const pathD = `M ${points.map(p => `${p.x * 3},${p.y * 2}`).join(' L ')}`;
  const pathLength = 500;

  return (
    <svg viewBox="0 0 300 200" className="w-full h-full absolute inset-0">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="50%" stopColor="var(--secondary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        initial={{ strokeDashoffset: pathLength }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      <motion.path
        d={`${pathD} L 300,160 L 0,160 Z`}
        fill="url(#areaGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
      />

      {points.map((point, i) => (
        <motion.circle
          key={i}
          cx={point.x * 3}
          cy={point.y * 2}
          r="4"
          fill="var(--primary)"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 1 + i * 0.15, duration: 0.3 }}
        />
      ))}
    </svg>
  );
}

export function ProbabilityCircle() {
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!isMounted) return null;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full absolute inset-0">
      <defs>
        <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--secondary)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>

      <motion.circle
        cx="100"
        cy="100"
        r="80"
        fill="none"
        stroke="url(#circleGradient)"
        strokeWidth="2"
        strokeDasharray="10 5"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: 'center' }}
      />

      <motion.circle
        cx="100"
        cy="100"
        r="60"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray="5 10"
        initial={{ rotate: 360 }}
        animate={{ rotate: 0 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: 'center' }}
      />

      <motion.circle
        cx="100"
        cy="100"
        r="40"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.5 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />

      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.circle
          key={i}
          cx={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          cy={100 + 60 * Math.sin((angle * Math.PI) / 180)}
          r="4"
          fill="var(--secondary)"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
          }}
        />
      ))}
    </svg>
  );
}

export function DataPointsAnimation() {
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const dataPoints = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: (i % 6) * 50 + seededRandom(i * 7.7) * 20,
      y: seededRandom(i * 8.8) * 150 + 20,
      delay: seededRandom(i * 9.9) * 2,
    }));
  }, []);

  if (!isMounted) return null;

  return (
    <svg viewBox="0 0 320 200" className="w-full h-full absolute inset-0">
      {dataPoints.map((point) => (
        <motion.circle
          key={point.id}
          cx={point.x}
          cy={point.y}
          r="3"
          fill="var(--accent)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0],
          }}
          transition={{
            duration: 4,
            delay: point.delay,
            repeat: Infinity,
          }}
        />
      ))}

      <motion.path
        d={`M ${dataPoints.slice(0, 6).map(p => `${p.x},${p.y}`).join(' L ')}`}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeDasharray="5 5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
}

export function SigmaAnimation() {
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!isMounted) return null;

  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.4, 0],
        scale: [0, 1.5, 2],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <span className="text-[200px] md:text-[300px] font-bold text-primary/10 dark:text-primary-light/10 leading-none">
        Σ
      </span>
    </motion.div>
  );
}

export function IntegralAnimation() {
  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0, x: -100 }}
      animate={{
        opacity: [0, 0.3, 0],
        x: [-100, 100],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <span className="text-[150px] md:text-[250px] font-bold text-secondary/10 dark:text-secondary-light/10 leading-none">
        ∫
      </span>
    </motion.div>
  );
}

export function PiAnimation() {
  return (
    <motion.div
      className="absolute"
      animate={{
        y: [0, -50, 0],
        rotate: [0, 360],
        opacity: [0.2, 0.5, 0.2],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <span className="text-[100px] md:text-[180px] font-bold text-accent/15 dark:text-accent-light/15 leading-none">
        π
      </span>
    </motion.div>
  );
}

export function AnimatedOrb({
  color = 'primary',
  size = 300,
  duration = 8,
  delay = 0,
}: {
  color?: 'primary' | 'secondary' | 'accent';
  size?: number;
  duration?: number;
  delay?: number;
}) {
  const colorVar = `var(--${color})`;
  const glowVar = `var(--glow-${color})`;

  return (
    <motion.div
      className="absolute rounded-full blur-3xl"
      style={{
        width: size,
        height: size,
        background: colorVar,
        boxShadow: `0 0 ${size/2}px ${glowVar}`,
      }}
      animate={{
        scale: [1, 1.2, 0.9, 1],
        x: [-50, 50, -30, 0],
        y: [-30, 20, -20, 0],
        opacity: [0.3, 0.5, 0.3, 0.4],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function ConnectionLines() {
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!isMounted) return null;

  const lines = [
    { x1: 10, y1: 20, x2: 90, y2: 80 },
    { x1: 90, y1: 10, x2: 20, y2: 90 },
    { x1: 50, y1: 5, x2: 50, y2: 95 },
    { x1: 5, y1: 50, x2: 95, y2: 50 },
  ];

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
      {lines.map((line, i) => (
        <motion.line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="var(--primary)"
          strokeWidth="0.3"
          strokeDasharray="2 2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1, 0],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 4,
            delay: i * 1,
            repeat: Infinity,
          }}
        />
      ))}
    </svg>
  );
}

export function GlowingRing() {
  return (
    <motion.div
      className="absolute border-2 rounded-full"
      style={{
        width: '200%',
        height: '200%',
        borderColor: 'var(--primary)',
      }}
      animate={{
        scale: [0.5, 1.5],
        opacity: [0.5, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

export function CounterAnimation({
  value,
  duration = 2,
}: {
  value: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const motionValue = useMotionValue(0);
  const roundedValue = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionValue, duration]);

  useEffect(() => {
    return roundedValue.on('change', (latest) => {
      setCount(latest);
    });
  }, [roundedValue]);

  return <span>{count}</span>;
}
