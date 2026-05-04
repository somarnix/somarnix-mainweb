// app/components/AntiCopy.tsx
// Free Anti-Copy Protection Component

"use client";

import { useEffect } from 'react';

interface AntiCopyProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function AntiCopy({ children, enabled = true }: AntiCopyProps) {
  useEffect(() => {
    if (!enabled) return;

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'U') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 'S') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+A (Select All) - Optional
      // if (e.ctrlKey && e.key === 'A') {
      //   e.preventDefault();
      //   return false;
      // }
    };

    // Disable text selection (optional - use CSS instead)
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('.no-copy')) {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [enabled]);

  return <>{children}</>;
}

/**
 * Protected Image Component
 * Prevents right-click and drag on images
 */
export function ProtectedImage({ 
  src, 
  alt, 
  className = "",
  watermark = true 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  watermark?: boolean;
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      {watermark && (
        <div className="absolute bottom-2 right-2 text-white/50 text-xs font-bold pointer-events-none select-none drop-shadow-md">
          © SOMARNIX
        </div>
      )}
    </div>
  );
}

/**
 * Protected Content Wrapper
 * Adds no-copy class to prevent selection
 */
export function ProtectedContent({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`no-copy ${className}`}>
      {children}
    </div>
  );
}
