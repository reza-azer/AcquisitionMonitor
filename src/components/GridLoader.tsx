'use client';

import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type Pattern =
  | 'solo-center' | 'solo-tl' | 'solo-tr' | 'solo-bl' | 'solo-br'
  | 'line-h-top' | 'line-h-mid' | 'line-h-bot' | 'line-v-left' | 'line-v-mid' | 'line-v-right'
  | 'line-diag-1' | 'line-diag-2'
  | 'wave-lr' | 'wave-rl' | 'wave-tb' | 'wave-bt'
  | 'diagonal-tl' | 'diagonal-tr' | 'diagonal-bl' | 'diagonal-br'
  | 'corners-only' | 'corners-sync' | 'corners'
  | 'plus-hollow' | 'plus-full' | 'cross'
  | 'x-shape' | 'diamond' | 'checkerboard'
  | 'L-tl' | 'L-tr' | 'L-bl' | 'L-br'
  | 'T-top' | 'T-bot' | 'T-left' | 'T-right'
  | 'stripes-h' | 'stripes-v' | 'rows-alt'
  | 'spiral-cw' | 'spiral-ccw'
  | 'snake' | 'snake-rev'
  | 'rain' | 'rain-rev'
  | 'duo-h' | 'duo-v' | 'duo-diag'
  | 'frame' | 'frame-sync' | 'border' | 'ripple-out' | 'ripple-in'
  | 'waterfall' | 'breathing' | 'heartbeat' | 'twinkle' | 'sparkle' | 'chaos'
  | 'edge-cw'
  | 'sparse-1' | 'sparse-2' | 'sparse-3'
  | number[][];

type Color = 'white' | 'red' | 'blue' | 'green' | 'amber' | string;
type Size = 'sm' | 'md' | 'lg' | 'xl' | number;
type Mode = 'pulse' | 'sequence' | 'stagger';

const PATTERNS: Record<string, number[][]> = {
  'solo-center': [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  'solo-tl': [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
  'solo-tr': [[0, 0, 1], [0, 0, 0], [0, 0, 0]],
  'solo-bl': [[0, 0, 0], [0, 0, 0], [1, 0, 0]],
  'solo-br': [[0, 0, 0], [0, 0, 0], [0, 0, 1]],
  'line-h-top': [[1, 1, 1], [0, 0, 0], [0, 0, 0]],
  'line-h-mid': [[0, 0, 0], [1, 1, 1], [0, 0, 0]],
  'line-h-bot': [[0, 0, 0], [0, 0, 0], [1, 1, 1]],
  'line-v-left': [[1, 0, 0], [1, 0, 0], [1, 0, 0]],
  'line-v-mid': [[0, 1, 0], [0, 1, 0], [0, 1, 0]],
  'line-v-right': [[0, 0, 1], [0, 0, 1], [0, 0, 1]],
  'line-diag-1': [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  'line-diag-2': [[0, 0, 1], [0, 1, 0], [1, 0, 0]],
  'wave-lr': [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  'wave-rl': [[0, 0, 1], [0, 1, 0], [1, 0, 0]],
  'wave-tb': [[1, 1, 1], [0, 0, 0], [0, 0, 0]],
  'wave-bt': [[0, 0, 0], [0, 0, 0], [1, 1, 1]],
  'diagonal-tl': [[1, 1, 0], [1, 1, 0], [0, 0, 0]],
  'diagonal-tr': [[0, 1, 1], [0, 1, 1], [0, 0, 0]],
  'diagonal-bl': [[0, 0, 0], [1, 1, 0], [1, 1, 0]],
  'diagonal-br': [[0, 0, 0], [0, 1, 1], [0, 1, 1]],
  'corners-only': [[1, 0, 1], [0, 0, 0], [1, 0, 1]],
  'corners-sync': [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
  'corners': [[1, 0, 1], [0, 0, 0], [1, 0, 1]],
  'plus-hollow': [[0, 1, 0], [1, 0, 1], [0, 1, 0]],
  'plus-full': [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
  'cross': [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
  'x-shape': [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
  'diamond': [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
  'checkerboard': [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
  'L-tl': [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
  'L-tr': [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
  'L-bl': [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
  'L-br': [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
  'T-top': [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
  'T-bot': [[0, 1, 0], [0, 1, 0], [1, 1, 1]],
  'T-left': [[1, 0, 0], [1, 1, 1], [1, 0, 0]],
  'T-right': [[0, 0, 1], [1, 1, 1], [0, 0, 1]],
  'stripes-h': [[1, 1, 1], [0, 0, 0], [1, 1, 1]],
  'stripes-v': [[1, 0, 1], [1, 0, 1], [1, 0, 1]],
  'rows-alt': [[0, 0, 0], [1, 1, 1], [0, 0, 0]],
  'spiral-cw': [[1, 1, 1], [0, 0, 1], [1, 1, 1]],
  'spiral-ccw': [[1, 1, 1], [1, 0, 0], [1, 1, 1]],
  'snake': [[1, 1, 1], [1, 0, 0], [1, 1, 1]],
  'snake-rev': [[1, 1, 1], [0, 0, 1], [1, 1, 1]],
  'rain': [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
  'rain-rev': [[0, 1, 0], [0, 1, 0], [1, 1, 1]],
  'duo-h': [[1, 1, 0], [0, 0, 0], [0, 0, 0]],
  'duo-v': [[1, 0, 0], [1, 0, 0], [0, 0, 0]],
  'duo-diag': [[1, 0, 0], [0, 1, 0], [0, 0, 0]],
  'frame': [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
  'frame-sync': [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
  'border': [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
  'ripple-out': [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  'ripple-in': [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
  'waterfall': [[1, 1, 1], [1, 1, 0], [1, 0, 0]],
  'breathing': [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
  'heartbeat': [[0, 1, 0], [1, 0, 1], [0, 1, 0]],
  'twinkle': [[1, 0, 1], [0, 0, 0], [1, 0, 1]],
  'sparkle': [[0, 1, 0], [1, 0, 1], [0, 1, 0]],
  'chaos': [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
  'edge-cw': [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
  'sparse-1': [[1, 0, 0], [0, 0, 0], [0, 0, 1]],
  'sparse-2': [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  'sparse-3': [[1, 0, 1], [0, 0, 0], [1, 0, 1]],
};

const COLOR_MAP: Record<string, string> = {
  white: '#ffffff',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
};

const SIZE_MAP: Record<string, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

const SEQUENCES: Record<string, string[]> = {
  default: ['solo-center', 'plus-hollow', 'frame'],
  corners: ['solo-tl', 'solo-tr', 'solo-br', 'solo-bl'],
  wave: ['line-v-left', 'line-v-mid', 'line-v-right'],
  spin: ['solo-tl', 'solo-tr', 'solo-br', 'solo-bl'],
};

interface GridLoaderProps {
  pattern?: Pattern;
  mode?: Mode;
  color?: Color;
  size?: Size;
  sequence?: string[];
  static?: boolean;
  className?: string;
}

export default function GridLoader({
  pattern = 'plus-hollow',
  mode = 'pulse',
  color = 'blue',
  size = 'md',
  sequence,
  static: staticProp = false,
  className = '',
}: GridLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const isStatic = staticProp || prefersReducedMotion;

  const resolvedSize = typeof size === 'string' ? SIZE_MAP[size] || 32 : size;
  const resolvedColor = typeof color === 'string' ? (COLOR_MAP[color] || color) : color;

  const cellSize = resolvedSize / 3;
  const gap = resolvedSize * 0.05;

  const getPatternMatrix = (p: Pattern): number[][] => {
    if (Array.isArray(p) && Array.isArray(p[0])) {
      return p as number[][];
    }
    if (typeof p === 'string') {
      return PATTERNS[p] || PATTERNS['plus-hollow'];
    }
    return PATTERNS['plus-hollow'];
  };

  const basePattern = useMemo(() => getPatternMatrix(pattern), [pattern]);

  const sequencePatterns = useMemo(() => {
    if (mode === 'sequence') {
      const seqNames = sequence || SEQUENCES.default;
      return seqNames.map((name) => getPatternMatrix(name as Pattern));
    }
    return [basePattern];
  }, [mode, sequence, basePattern]);

  const [sequenceIndex, setSequenceIndex] = React.useState(0);

  React.useEffect(() => {
    if (mode === 'sequence' && !isStatic) {
      const interval = setInterval(() => {
        setSequenceIndex((prev) => (prev + 1) % sequencePatterns.length);
      }, 400);
      return () => clearInterval(interval);
    }
  }, [mode, isStatic, sequencePatterns.length]);

  const currentPattern = sequencePatterns[sequenceIndex] || basePattern;

  const getDelay = (row: number, col: number) => {
    if (mode === 'stagger') {
      // Diagonal stagger: cells animate from top-left to bottom-right
      // Cells on the same diagonal have the same delay
      return (row + col) * 0.15;
    }
    return 0;
  };

  return (
    <output
      aria-label="Loading"
      className={`inline-grid ${className}`}
      style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: `${gap}px`,
        width: `${resolvedSize}px`,
        height: `${resolvedSize}px`,
      }}
    >
      {currentPattern.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isActive = cell === 1;
          const delay = getDelay(rowIndex, colIndex);

          return (
            <motion.div
              key={`${rowIndex}-${colIndex}`}
              initial={{ opacity: isStatic ? (isActive ? 1 : 0.2) : 0.2, scale: isStatic ? 1 : 0.5 }}
              animate={
                isStatic
                  ? {}
                  : mode === 'pulse'
                  ? {
                      opacity: isActive ? [0.4, 1, 0.4] : 0.15,
                      scale: isActive ? [0.9, 1.1, 0.9] : 1,
                    }
                  : mode === 'stagger'
                  ? {
                      opacity: isActive ? [0.2, 1, 0.2] : 0.15,
                      scale: isActive ? [0.8, 1.2, 0.8] : 1,
                    }
                  : {
                      opacity: isActive ? 1 : 0.15,
                      scale: isActive ? 1 : 0.8,
                    }
              }
              transition={
                isStatic
                  ? {}
                  : {
                      duration: mode === 'pulse' ? 1.5 : 0.4,
                      repeat: Infinity,
                      delay,
                      ease: 'easeInOut',
                    }
              }
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                borderRadius: resolvedSize * 0.15,
                backgroundColor: resolvedColor,
                opacity: isActive ? 1 : 0.15,
                boxShadow: isActive
                  ? `0 0 ${resolvedSize * 0.3}px ${resolvedColor}, 0 0 ${resolvedSize * 0.6}px ${resolvedColor}40`
                  : 'none',
              }}
            />
          );
        })
      )}
    </output>
  );
}
