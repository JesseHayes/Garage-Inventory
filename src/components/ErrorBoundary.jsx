import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    if (import.meta.env.DEV) {
      console.group('Garage Lab runtime error');
      console.error(error);
      console.info(info?.componentStack);
      console.groupEnd();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="auth-layout">
          <section className="panel auth-panel">
            <h1>Garage Lab Inventory hit a runtime error</h1>
            <p className="muted">The app shell stayed alive so the error can be fixed without a blank screen.</p>
            <pre className="error-details">{this.state.error.message}</pre>
            {import.meta.env.DEV && this.state.info?.componentStack && <pre className="error-details">{this.state.info.componentStack}</pre>}
            <button className="primary" type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
