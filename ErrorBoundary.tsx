import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for future debugging; no external service configured.
    console.error('React error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
          <div className="max-w-xl rounded-3xl border border-red-700/40 bg-slate-900/95 p-10 text-center shadow-2xl shadow-black/20">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Something went wrong.</h1>
            <p className="text-slate-300 mb-6">The app encountered an unexpected error. Please refresh the page or return to the home screen.</p>
            <button
              onClick={() => window.location.assign('/')}
              className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold transition"
            >
              Go home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
