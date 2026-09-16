import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Erreur inconnue';
      return (
        <div className="h-full flex items-center justify-center bg-[#F4EFE6] p-6">
          <div className="bg-[#FAF8F3] rounded-xl p-6 text-center max-w-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <span className="material-symbols-outlined text-[#ba1a1a] text-5xl">error</span>
            <h2 className="text-lg font-bold text-[#0D1B2A] mt-3">Erreur de chargement</h2>
            <p className="text-xs text-gray-500 mt-2">{msg}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 px-4 py-2 bg-[#00796B] text-white text-xs font-bold rounded-lg hover:bg-[#00574A]">
                Réessayer
              </button>
              <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/explorer'; }}
                className="flex-1 px-4 py-2 bg-[#E8611A] text-white text-xs font-bold rounded-lg hover:bg-[#d4550f]">
                Retour carte
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
