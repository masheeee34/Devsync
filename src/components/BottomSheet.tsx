'use client';

import { useState, useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Let render happen first, then trigger slide up animation
      const t = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(t);
    } else {
      setAnimate(false);
      const t = setTimeout(() => setIsRendered(false), 300); // Wait for transition
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Only allow dragging down
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    // Dismiss threshold (120px)
    if (dragOffset > 120) {
      onClose();
    }
    // Snap back
    setDragOffset(0);
  };

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${
        animate ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Bottom Sheet Container */}
      <div
        style={{
          transform: `translateY(${animate ? dragOffset : '100%'})`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="w-full max-w-lg bg-white rounded-t-[32px] border-t border-[#ECEAE3] shadow-2xl relative z-10 flex flex-col overflow-hidden will-change-transform pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        {/* Header Drag Handle */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full py-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
        >
          <div className="w-12 h-1.5 bg-[#ECEAE3] rounded-full" />
        </div>

        {/* Sheet Title */}
        <div className="px-6 pb-4 flex justify-between items-center border-b border-[#ECEAE3]/50">
          <h3 className="text-sm font-display font-bold text-[#1B1B1B]">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#F7F5EF] flex items-center justify-center text-xs text-[#8C8A85] hover:text-[#1B1B1B] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto max-h-[70vh] p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
