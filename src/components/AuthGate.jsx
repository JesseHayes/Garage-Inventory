import { Lock, LogIn } from 'lucide-react';
import { useState } from 'react';

export default function AuthGate({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setIsBusy(true);
    setMessage('');
    try {
      await onLogin(email, password);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <form className="panel auth-panel" onSubmit={submit}>
        <div className="panel-title">
          <Lock size={18} />
          Garage Lab Inventory
        </div>
        <p className="muted">Sign in with your Supabase account to access inventory data.</p>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <button className="primary" type="submit" disabled={isBusy}>
          <LogIn size={16} />
          {isBusy ? 'Signing in' : 'Sign In'}
        </button>
        {message && <p className="status-line">{message}</p>}
      </form>
    </main>
  );
}
