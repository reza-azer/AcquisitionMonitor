'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsiblePanelProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsiblePanel({
  title,
  icon,
  children,
  defaultExpanded = true,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [height, setHeight] = useState<number | undefined>(defaultExpanded ? undefined : 0);
  const [opacity, setOpacity] = useState(defaultExpanded ? 1 : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && contentRef.current) {
      // Start from current scroll height for smooth animation
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        setOpacity(1);
      });
      
      // After transition completes, set to undefined for auto height
      const timer = setTimeout(() => {
        setHeight(undefined);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!expanded && contentRef.current) {
      // Set explicit height before animating to 0
      setHeight(contentRef.current.scrollHeight);
      setOpacity(1);
      
      requestAnimationFrame(() => {
        setHeight(0);
        setOpacity(0);
      });
    }
  }, [expanded]);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      
      <div
        ref={contentRef}
        style={{
          height: height !== undefined ? `${height}px` : 'auto',
          opacity,
          transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out',
          overflow: 'hidden',
        }}
      >
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
