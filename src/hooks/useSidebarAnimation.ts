import { useState, useEffect, useRef } from 'react';

interface SidebarAnimationConfig {
  scaleWhenOpen?: number;
  maxTranslateX?: number;
}

export const useSidebarAnimation = (isOpen: boolean, config: SidebarAnimationConfig = {}) => {
  const { scaleWhenOpen = 0.86, maxTranslateX = 320 } = config;
  
  const [sidebarWidth, setSidebarWidth] = useState(maxTranslateX);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Measure sidebar width dynamically
  useEffect(() => {
    const measureSidebar = () => {
      if (sidebarRef.current) {
        const width = sidebarRef.current.offsetWidth;
        setSidebarWidth(width);
      }
    };

    // Initial measurement
    measureSidebar();

    // Measure on resize
    window.addEventListener('resize', measureSidebar);
    
    // If sidebar becomes visible, measure again
    if (isOpen) {
      const timeoutId = setTimeout(measureSidebar, 100);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', measureSidebar);
      };
    }

    return () => window.removeEventListener('resize', measureSidebar);
  }, [isOpen]);

  // Calculate transform values
  const transform = isOpen 
    ? {
        x: -Math.min(sidebarWidth, maxTranslateX),
        scale: scaleWhenOpen,
      }
    : {
        x: 0,
        scale: 1,
      };

  // Style for hardware acceleration and smooth animations
  const contentStyle = {
    willChange: 'transform',
    transform: `translate3d(${transform.x}px, 0, 0) scale(${transform.scale})`,
    transformOrigin: 'right center',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return {
    sidebarRef,
    contentRef,
    transform,
    contentStyle,
    sidebarWidth,
  };
};

// Alternative approach using Framer Motion for more complex animations
export const useFramerSidebarAnimation = (isOpen: boolean, config: SidebarAnimationConfig = {}) => {
  const { scaleWhenOpen = 0.86, maxTranslateX = 320 } = config;
  
  const [sidebarWidth, setSidebarWidth] = useState(maxTranslateX);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measureSidebar = () => {
      if (sidebarRef.current) {
        setSidebarWidth(sidebarRef.current.offsetWidth);
      }
    };

    measureSidebar();
    window.addEventListener('resize', measureSidebar);
    
    if (isOpen) {
      const timeoutId = setTimeout(measureSidebar, 100);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', measureSidebar);
      };
    }

    return () => window.removeEventListener('resize', measureSidebar);
  }, [isOpen]);

  const animationVariants = {
    open: {
      x: -Math.min(sidebarWidth, maxTranslateX),
      scale: scaleWhenOpen,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      },
    },
    closed: {
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      },
    },
  };

  return {
    sidebarRef