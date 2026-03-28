'use client';

import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded' | 'table-row' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'shimmer' | 'pulse' | 'wave';
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  animation = 'shimmer',
}: SkeletonProps) {
  const baseClasses = `bg-slate-200 ${className}`;
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-lg',
    'table-row': 'rounded',
    card: 'rounded-2xl',
  };

  const getAnimation = () => {
    if (animation === 'pulse') {
      return {
        animate: { opacity: [0.6, 1, 0.6] },
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const },
      };
    }
    
    if (animation === 'wave') {
      return {
        animate: { opacity: [0.4, 0.8, 0.4] },
        transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const },
      };
    }

    // Shimmer animation (default)
    return {
      animate: {
        backgroundPosition: ['200% 0', '-200% 0'],
      },
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    };
  };

  const animationProps = getAnimation();

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'circular' ? '32px' : '1em'),
    backgroundImage: animation === 'shimmer' 
      ? 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)'
      : undefined,
    backgroundSize: animation === 'shimmer' ? '200% 100%' : undefined,
  };

  if (variant === 'table-row') {
    return (
      <tr className={baseClasses}>
        <td className="px-4 py-3">
          <motion.div
            className="h-4 bg-slate-300 rounded w-3/4"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </td>
        <td className="px-4 py-3">
          <motion.div
            className="h-4 bg-slate-300 rounded w-1/2"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </td>
        <td className="px-4 py-3">
          <motion.div
            className="h-4 bg-slate-300 rounded w-1/2"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </td>
        <td className="px-4 py-3">
          <motion.div
            className="h-4 bg-slate-300 rounded w-1/3"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </td>
        <td className="px-4 py-3">
          <motion.div
            className="h-4 bg-slate-300 rounded w-1/4"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </td>
      </tr>
    );
  }

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]}`}
      style={style}
      {...animationProps}
    />
  );
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="0.875rem"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 space-y-4 ${className}`}>
      <Skeleton variant="circular" width="48px" height="48px" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonStatsCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-3xl p-6 border border-slate-200 space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width="20px" height="20px" />
        <Skeleton variant="text" width="100px" height="0.75rem" />
      </div>
      <Skeleton variant="text" width="80px" height="2rem" />
      <Skeleton variant="text" width="120px" height="0.75rem" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width="60px" height="0.75rem" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton variant="text" width="100%" height="1rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = {
    sm: '32px',
    md: '40px',
    lg: '64px',
  };

  return (
    <Skeleton
      variant="circular"
      width={sizeMap[size]}
      height={sizeMap[size]}
      className={className}
    />
  );
}
