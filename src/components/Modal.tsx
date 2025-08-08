'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeOnBackdropClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'lg',
  closeOnBackdropClick = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original body styles
      const originalStyle = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width
      };
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock scroll on body and prevent bounce
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Prevent document scrolling on iOS
      document.documentElement.style.overflow = 'hidden';
      
      // Focus trap - focus on modal when it opens
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      return () => {
        // Restore original scroll behavior
        document.body.style.overflow = originalStyle.overflow;
        document.body.style.position = originalStyle.position;
        document.body.style.top = originalStyle.top;
        document.body.style.width = originalStyle.width;
        document.documentElement.style.overflow = 'unset';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 overflow-y-auto modal-mobile"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        touchAction: 'manipulation',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-6 lg:p-8">
        <div
          ref={modalRef}
          className={`relative w-full ${maxWidthClasses[maxWidth]} transform overflow-hidden bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 animate-modal-in
            ${maxWidth === 'full' ? 'sm:rounded-2xl' : 'rounded-t-2xl sm:rounded-2xl'}
            ${maxWidth === 'full' ? 'h-full sm:h-auto' : 'max-h-[90vh] sm:max-h-[80vh]'}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          tabIndex={-1}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate pr-4">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className={`${title ? '' : 'relative'}`}>
            {!title && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 backdrop-blur-sm transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render in portal to ensure it's at the top level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

export default Modal;
