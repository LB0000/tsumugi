import { Component, type ReactNode } from 'react';
import { Sentry } from '../../lib/sentry';
import { StyledButton } from '../common/StyledButton';

interface Props {
  children: ReactNode;
  orderId?: string;
  cartSummary?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CheckoutErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('section', 'checkout');
      if (this.props.orderId) {
        scope.setExtra('orderId', this.props.orderId);
      }
      if (this.props.cartSummary) {
        scope.setExtra('cartSummary', this.props.cartSummary);
      }
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div role="alert" aria-live="assertive" className="rounded-xl border border-sale/20 bg-sale/5 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-sale/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-sale" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
          お支払い画面でエラーが発生しました
        </h3>
        <p className="text-sm text-muted mb-4">
          お支払いはまだ処理されていません。もう一度お試しください。
        </p>
        <div className="flex justify-center gap-3">
          <StyledButton variant="outline" size="sm" onClick={this.handleRetry}>
            再試行
          </StyledButton>
          <StyledButton size="sm" onClick={() => window.location.reload()}>
            ページを再読み込み
          </StyledButton>
        </div>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-4 p-3 bg-card rounded-lg text-left text-xs text-sale max-w-lg mx-auto overflow-auto">
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    );
  }
}
