'use client';

import { motion } from 'motion/react';
import { ReactNode, CSSProperties } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  duration?: number;
}

/**
 * AnimatedCard - Fade in + slide up animation
 * Use this wrapper for any card component that should animate on viewport entry
 */
export default function AnimatedCard({
  children,
  className = '',
  style,
  delay = 0,
  duration = 0.4,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOutCirc
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
