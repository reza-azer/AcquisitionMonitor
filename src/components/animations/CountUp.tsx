'use client';

import { motion, useSpring, useTransform, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  className?: string;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatWithCommas?: boolean;
  delay?: number;
}

/**
 * CountUp - Animated number counter
 * Animates from 0 to target value with easeInOut
 */
export default function CountUp({
  value,
  className = '',
  duration = 1.5,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatWithCommas = false,
  delay = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  // Spring physics for smooth counting
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 20,
    mass: 1,
    restDelta: 0.001,
  });

  // Transform spring value to display value
  const transformedValue = useTransform(springValue, (latest) => {
    const rounded = parseFloat(latest.toFixed(decimals));
    if (formatWithCommas) {
      return rounded.toLocaleString('id-ID');
    }
    return rounded;
  });

  // Update spring when in view (with optional delay)
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        springValue.set(value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, springValue, delay]);

  // Sync display value with transformed value
  useEffect(() => {
    const unsubscribe = transformedValue.on('change', (latest) => {
      setDisplayValue(latest as number);
    });
    return () => unsubscribe();
  }, [transformedValue]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
}
