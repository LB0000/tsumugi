import React from 'react';

interface StyledButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cta';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function StyledButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}: StyledButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-medium
    transition-all duration-300 ease-out
    rounded-lg
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50
  `;

  const variants = {
    primary: `
      bg-gradient-to-b from-primary to-primary/90 text-white
      hover:from-primary/90 hover:to-primary/80
      hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
      shadow-md
    `,
    secondary: `
      bg-gradient-to-b from-secondary to-secondary/90 text-white
      hover:from-secondary/90 hover:to-secondary/80
      hover:shadow-lg hover:shadow-secondary/25 hover:-translate-y-0.5
      shadow-md
    `,
    outline: `
      border-2 border-primary text-primary bg-transparent
      hover:bg-primary/5 hover:border-primary/80
      hover:shadow-md hover:-translate-y-0.5
    `,
    ghost: `
      text-foreground bg-transparent
      hover:bg-muted/10
    `,
    danger: `
      bg-gradient-to-b from-sale to-sale/90 text-white
      hover:from-sale/90 hover:to-sale/80
      hover:shadow-lg hover:shadow-sale/25 hover:-translate-y-0.5
      shadow-md
    `,
    cta: `
      bg-gradient-to-r from-secondary to-secondary/90 text-white
      hover:from-secondary/90 hover:to-secondary/80
      hover:shadow-xl hover:shadow-secondary/30 hover:-translate-y-1
      shadow-lg shadow-secondary/20
      relative overflow-hidden
      animate-subtlePulse
    `
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-2.5'
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
