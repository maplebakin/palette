import React from 'react';

// Simple boundary to surface user-friendly errors and allow a reset.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled app error:', error, info);
  }

  handleReset() {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined' && this.props.resetMode !== 'soft') {
      window.location.reload();
    }
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({ reset: this.handleReset, message: this.state.errorMessage });
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500 tracking-widest">Unexpected error</p>
            <h1 className="text-lg font-bold text-slate-800">We hit a snag.</h1>
            <p className="text-sm text-slate-600">
              {this.state.errorMessage || 'Something went wrong while rendering this palette. Try reloading to continue.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 active:scale-95 transition"
              >
                Reload app
              </button>
              <a
                href={this.props.reportUrl || 'mailto:support@tokengen.app?subject=Token%20Gen%20Error'}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 active:scale-95 transition"
              >
                Report issue
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
