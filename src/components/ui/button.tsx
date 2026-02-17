import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  size?: 'default' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className = '', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-300 ease-out
      rounded-lg
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50
    `;

    const variants = {
      default: `
        bg-gradient-to-b from-primary to-primary/90 text-white
        hover:from-primary/90 hover:to-primary/80
        hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
        shadow-md
      `,
      ghost: `
        text-foreground bg-transparent
        hover:bg-muted/10
      `,
    };

    const sizes = {
      default: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
