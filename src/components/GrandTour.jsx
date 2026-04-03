import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';

/**
 * GrandTour
 *
 * Props:
 *   steps: Array of { targetId, title, message, position? ('top'|'bottom'|'left'|'right') }
 *   onComplete: () => void  — called when user finishes or skips
 */
export default function GrandTour({ steps, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [bubbleStyle, setBubbleStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});
  const [arrowDir, setArrowDir] = useState('top'); // which side the arrow points FROM
  const resizeRef = useRef(null);

  const step = steps[currentStep];

  useEffect(() => {
    positionBubble();
    // Reposition on resize
    resizeRef.current = () => positionBubble();
    window.addEventListener('resize', resizeRef.current);
    window.addEventListener('scroll', resizeRef.current, true);
    return () => {
      window.removeEventListener('resize', resizeRef.current);
      window.removeEventListener('scroll', resizeRef.current, true);
    };
  }, [currentStep]);

  const positionBubble = () => {
    const el = document.getElementById(step.targetId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const BUBBLE_W = Math.min(280, vw - 32);
    const BUBBLE_H = 160; // approx
    const GAP = 12;
    const ARROW_SIZE = 10;

    let preferred = step.position || 'bottom';

    // Auto-flip if not enough space
    if (preferred === 'bottom' && rect.bottom + BUBBLE_H + GAP > vh) preferred = 'top';
    if (preferred === 'top' && rect.top - BUBBLE_H - GAP < 0) preferred = 'bottom';
    if (preferred === 'right' && rect.right + BUBBLE_W + GAP > vw) preferred = 'left';
    if (preferred === 'left' && rect.left - BUBBLE_W - GAP < 0) preferred = 'right';

    let top, left;

    if (preferred === 'bottom') {
      top = rect.bottom + GAP + ARROW_SIZE;
      left = rect.left + rect.width / 2 - BUBBLE_W / 2;
      setArrowDir('top'); // arrow at the top of bubble pointing up to the element
    } else if (preferred === 'top') {
      top = rect.top - BUBBLE_H - GAP - ARROW_SIZE;
      left = rect.left + rect.width / 2 - BUBBLE_W / 2;
      setArrowDir('bottom');
    } else if (preferred === 'right') {
      top = rect.top + rect.height / 2 - BUBBLE_H / 2;
      left = rect.right + GAP + ARROW_SIZE;
      setArrowDir('left');
    } else {
      top = rect.top + rect.height / 2 - BUBBLE_H / 2;
      left = rect.left - BUBBLE_W - GAP - ARROW_SIZE;
      setArrowDir('right');
    }

    // Clamp horizontally
    left = Math.max(12, Math.min(left, vw - BUBBLE_W - 12));
    // Clamp vertically
    top = Math.max(12, Math.min(top, vh - BUBBLE_H - 12));

    setBubbleStyle({ top, left, width: BUBBLE_W });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  // Highlight ring around target
  const HighlightRing = () => {
    const el = document.getElementById(step.targetId);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const PAD = 6;
    return (
      <div
        className="fixed pointer-events-none z-[9998]"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 12,
          boxShadow: '0 0 0 3px #0d9488, 0 0 0 9999px rgba(0,0,0,0.35)',
        }}
      />
    );
  };

  const arrowClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-0 border-l-transparent border-r-transparent border-t-transparent border-b-teal-400',
    bottom: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-teal-400',
    left: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-teal-400',
    right: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-teal-400',
  };

  return createPortal(
    <>
      <HighlightRing />

      {/* Bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[9999] rounded-2xl border border-teal-400/60 shadow-2xl p-4"
          style={{
            ...bubbleStyle,
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[10px] ${arrowClasses[arrowDir]}`}
            style={arrowDir === 'top' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)' }
              : arrowDir === 'bottom' ? { top: '100%', left: '50%', transform: 'translateX(-50%)' }
              : arrowDir === 'left' ? { right: '100%', top: '50%', transform: 'translateY(-50%)' }
              : { left: '100%', top: '50%', transform: 'translateY(-50%)' }}
          />

          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
              Step {currentStep + 1} of {steps.length}
            </p>
            <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 flex-shrink-0 -mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {step.title && (
            <p className="font-semibold text-gray-800 text-sm mb-1">{step.title}</p>
          )}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{step.message}</p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Skip tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)' }}
            >
              {currentStep < steps.length - 1 ? (
                <>Next <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                "Let's go! 🎉"
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}