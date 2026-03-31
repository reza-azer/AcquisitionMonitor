'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface AnimatedGridProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

/**
 * AnimatedGrid - Grid container with staggered children animations
 * Children will animate in sequence with delay between each
 */
export default function AnimatedGrid({
  children,
  className = '',
  staggerDelay = 0.1,
  initialDelay = 0.1,
}: AnimatedGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{
          staggerChildren: staggerDelay,
          delayChildren: initialDelay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * AnimatedGridItem - Individual item within AnimatedGrid
 * Use this for children of AnimatedGrid
 */
export function AnimatedGridItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOutCirc
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
