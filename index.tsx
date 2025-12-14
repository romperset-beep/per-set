import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: '#ff5555', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Catch script errors (imports, syntax) before React
window.addEventListener('error', (event) => {
  document.body.innerHTML = `<div style="padding: 20px; background: #1a1a1a; color: #ff5555; height: 100vh; font-family: monospace;">
    <h1>Script Error</h1>
    <pre>${event.message}</pre>
    <pre>${event.filename}: ${event.lineno}</pre>
  </div>`;
});

window.addEventListener('unhandledrejection', (event) => {
  document.body.innerHTML = `<div style="padding: 20px; background: #1a1a1a; color: #ff5555; height: 100vh; font-family: monospace;">
    <h1>Unhandled Rejection</h1>
    <pre>${event.reason}</pre>
  </div>`;
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);