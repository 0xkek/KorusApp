'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-korus-dark-400">
          <div className="max-w-md w-full bg-korus-surface/90 backdrop-blur-xl rounded-2xl border border-korus-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="heading-2 text-white mb-2">Something went wrong</h2>
            <p className="text-korus-textSecondary mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            <div className="space-y-3">
              <Button onClick={this.handleReset} variant="primary" fullWidth>
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="secondary" fullWidth>
                Go Home
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-korus-textSecondary cursor-pointer hover:text-korus-text">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 p-3 bg-korus-dark-400 rounded text-xs text-red-400 overflow-auto max-h-48">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for modals
export function ModalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center">
          <p className="text-red-400 mb-4">Failed to load modal content</p>
          <Button onClick={() => window.location.reload()} variant="secondary" size="sm">
            Reload Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
