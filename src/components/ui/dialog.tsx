import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </>
  );
};

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogContent = ({ className = '', children }: DialogContentProps) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-2xl shadow-2xl animate-slideUp p-6 ${className}`}
    >
      {children}
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
}

export const DialogHeader = ({ children }: DialogHeaderProps) => {
  return <div className="mb-4">{children}</div>;
};

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogTitle = ({ className = '', children }: DialogTitleProps) => {
  return (
    <h2 className={`text-xl font-semibold text-foreground ${className}`}>
      {children}
    </h2>
  );
};

interface DialogDescriptionProps {
  children: React.ReactNode;
}

export const DialogDescription = ({ children }: DialogDescriptionProps) => {
  return <p className="text-sm text-muted-foreground mt-2">{children}</p>;
};

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogFooter = ({ className = '', children }: DialogFooterProps) => {
  return <div className={`mt-6 flex gap-2 ${className}`}>{children}</div>;
};
