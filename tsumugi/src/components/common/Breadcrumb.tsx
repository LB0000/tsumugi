import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="パンくずリスト"
      className={`flex items-center text-sm text-muted ${className}`}
    >
      <Link
        to="/"
        className="flex items-center hover:text-primary transition-colors"
        aria-label="ホーム"
      >
        <Home className="w-4 h-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-2 text-muted/50" />
            {isLast || !item.path ? (
              <span
                className={isLast ? 'text-foreground font-medium' : ''}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
