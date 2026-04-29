/**
 * ErrorBoundary — Catches runtime errors in React component trees
 * Prevents entire app crashes and displays user-friendly error messages.
 * Reports errors to backend telemetry for AutoDebugger pipeline.
 * @crossref:used-in[App.tsx — wraps all page routes]
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { reportReactError } from '@/lib/errorReporter';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const moduleName = this.props.moduleName ?? 'Unknown';
    logger.error(`ErrorBoundary(${moduleName})`, error.message, {
      componentStack: errorInfo.componentStack,
    });

    // Report to AutoDebugger pipeline
    reportReactError(error, errorInfo.componentStack || '', moduleName);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-4 max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
