import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 16, 0.95)',
            color: '#e0e0e8',
            fontFamily: 'sans-serif',
            padding: '24px',
            textAlign: 'center',
            zIndex: 99999,
          }}
        >
          <h2 style={{ color: '#ff5555', marginBottom: '12px' }}>A game session error occurred</h2>
          <p style={{ maxWidth: '480px', marginBottom: '20px', lineHeight: 1.5, color: '#aaa' }}>
            The application encountered an unexpected error. You can reload the page to continue.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: '#1b1b24',
                padding: '12px 16px',
                borderRadius: '6px',
                color: '#ffaaaa',
                maxWidth: '600px',
                overflowX: 'auto',
                fontSize: '12px',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 16px',
                background: '#333348',
                color: '#fff',
                border: '1px solid #555570',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                background: '#4a6fa5',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
