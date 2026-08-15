import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'CUSTOMER' | 'ORGANIZER'>('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ??
    (user?.role === 'ORGANIZER' ? '/organizador' : '/');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password, role);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-amber-400';

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === 'login' ? 'Entrar' : 'Criar conta'}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {mode === 'login'
          ? 'Acesse sua conta para comprar ingressos ou gerenciar eventos.'
          : 'Escolha seu perfil e comece a usar a plataforma.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <>
            <input
              className={input}
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
            <div className="grid grid-cols-2 gap-2">
              {(['CUSTOMER', 'ORGANIZER'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    role === r
                      ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {r === 'CUSTOMER' ? 'Cliente' : 'Organizador'}
                </button>
              ))}
            </div>
          </>
        )}
        <input
          className={input}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={input}
          type="password"
          placeholder="Senha (mín. 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
        <button
          className="font-medium text-amber-400 hover:underline"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Cadastre-se' : 'Entre'}
        </button>
      </p>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="font-semibold text-zinc-400">Contas de demonstração (seed):</p>
        <p className="mt-1">
          cliente@ingressa.com · organizador@ingressa.com — senha <code>123456</code>
        </p>
        <p className="mt-1">
          Ainda sem cadastro?{' '}
          <Link to="/entrar" className="text-amber-400">
            use o formulário
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
