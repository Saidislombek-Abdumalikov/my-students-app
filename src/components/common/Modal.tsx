import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidths[maxWidth]} bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-fade-in my-auto`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 bg-white text-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
};
