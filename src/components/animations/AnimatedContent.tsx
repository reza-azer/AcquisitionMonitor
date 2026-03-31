'use client';

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The content to animate */
  children: React.ReactNode;
  
  /** Optional custom scroll container (element, selector string, or null for window) */
  container?: Element | string | null;
  
  /** How far the element starts from its final position (in pixels) */
  distance?: number;
  
  /** Direction of the animation: 'vertical' (y-axis) or 'horizontal' (x-axis) */
  direction?: 'vertical' | 'horizontal';
  
  /** If true, animate from negative direction (e.g., from top instead of bottom) */
  reverse?: boolean;
  
  /** Duration of the animation in seconds */
  duration?: number;
  
  /** Easing function (e.g., 'power3.out', 'power2.inOut', 'elastic.out(1, 0.3)') */
  ease?: string;
  
  /** Initial opacity before animation starts (0 = invisible, 1 = fully visible) */
  initialOpacity?: number;
  
  /** If true, animate opacity from initialOpacity to 1 */
  animateOpacity?: boolean;
  
  /** Initial scale of the element (1 = normal size) */
  scale?: number;
  
  /** Threshold for when animation triggers (0 = immediately, 1 = when fully in view) */
  threshold?: number;
  
  /** Delay before animation starts (in seconds) */
  delay?: number;
  
  /** Time after animation completes before element disappears (0 = never disappear) */
  disappearAfter?: number;
  
  /** Duration of the disappearance animation */
  disappearDuration?: number;
  
  /** Easing function for disappearance animation */
  disappearEase?: string;
  
  /** Callback when entrance animation completes */
  onComplete?: () => void;
  
  /** Callback when disappearance animation completes */
  onDisappearanceComplete?: () => void;
}

/**
 * AnimatedContent - GSAP-based scroll-triggered animation component
 * 
 * Usage:
 * <AnimatedContent
 *   distance={100}        // Start 100px away from final position
 *   direction="vertical"  // Animate on y-axis
 *   reverse={false}       // From bottom to top
 *   duration={0.8}        // 0.8 seconds animation
 *   ease="power3.out"     // Ease out effect
 *   delay={0.2}           // 0.2s delay before starting
 * >
 *   <div>Your content</div>
 * </AnimatedContent>
 */
const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  container,
  distance = 100,          // Default: start 100px away
  direction = 'vertical',  // Default: vertical (y-axis) animation
  reverse = false,         // Default: from bottom/top (not top/bottom)
  duration = 0.8,          // Default: 0.8 seconds
  ease = 'power3.out',     // Default: smooth ease out
  initialOpacity = 0,      // Default: start invisible
  animateOpacity = true,   // Default: fade in during animation
  scale = 1,               // Default: normal size
  threshold = 0.1,         // Default: trigger when 10% visible
  delay = 0,               // Default: no delay
  disappearAfter = 0,      // Default: never disappear
  disappearDuration = 0.5, // Default: 0.5s disappearance
  disappearEase = 'power3.in', // Default: power3 ease in for disappearance
  onComplete,
  onDisappearanceComplete,
  className = '',
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Determine scroll container
    let scrollerTarget: Element | string | null = container || document.getElementById('snap-main-container') || null;

    if (typeof scrollerTarget === 'string') {
      scrollerTarget = document.querySelector(scrollerTarget);
    }

    // Determine animation axis
    const axis = direction === 'horizontal' ? 'x' : 'y';
    // Calculate starting offset (positive or negative based on reverse)
    const offset = reverse ? -distance : distance;
    // Calculate trigger start percentage
    const startPct = (1 - threshold) * 100;

    // Set initial state
    gsap.set(el, {
      [axis]: offset,        // Start offset from final position
      scale,                 // Initial scale
      opacity: animateOpacity ? initialOpacity : 1, // Initial opacity
      visibility: 'visible'  // Ensure element is visible
    });

    // Create animation timeline
    const tl = gsap.timeline({
      paused: true,          // Start paused, triggered by ScrollTrigger
      delay,                 // Delay before animation starts
      onComplete: () => {
        if (onComplete) onComplete();
        // Handle disappearance if configured
        if (disappearAfter > 0) {
          gsap.to(el, {
            [axis]: reverse ? distance : -distance, // Move opposite direction
            scale: 0.8,                             // Shrink slightly
            opacity: animateOpacity ? initialOpacity : 0, // Fade out
            delay: disappearAfter,                  // Wait before disappearing
            duration: disappearDuration,            // Disappearance duration
            ease: disappearEase,                    // Disappearance easing
            onComplete: () => onDisappearanceComplete?.()
          });
        }
      }
    });

    // Define entrance animation
    tl.to(el, {
      [axis]: 0,      // Move to final position
      scale: 1,       // Normal size
      opacity: 1,     // Fully visible
      duration,       // Animation duration
      ease            // Easing function
    });

    // Create ScrollTrigger
    const st = ScrollTrigger.create({
      trigger: el,
      scroller: scrollerTarget || window,
      start: `top ${startPct}%`, // Trigger when element top reaches this percentage of viewport
      once: true,                 // Only trigger once
      onEnter: () => tl.play()    // Play animation when element enters viewport
    });

    // Cleanup on unmount
    return () => {
      st.kill();
      tl.kill();
    };
  }, [
    container,
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
    disappearAfter,
    disappearDuration,
    disappearEase,
    onComplete,
    onDisappearanceComplete
  ]);

  return (
    <div ref={ref} className={`invisible ${className}`} {...props}>
      {children}
    </div>
  );
};

export default AnimatedContent;
