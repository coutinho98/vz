import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage } from '../api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'CUSTOMER' | 'ORGANIZER' | 'GATE'>('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ??
    (user?.role === 'ORGANIZER'
      ? '/organizador'
      : user?.role === 'GATE'
        ? '/portaria'
        : '/');

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

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-head text-3xl tracking-tight">
        {mode === 'login' ? 'Entrar' : 'Criar conta'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === 'login'
          ? 'Acesse sua conta para comprar ingressos ou gerenciar eventos.'
          : 'Escolha seu perfil e comece a usar a plataforma.'}
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Seu nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'CUSTOMER', label: 'Cliente' },
                      { value: 'ORGANIZER', label: 'Organizador' },
                      { value: 'GATE', label: 'Portaria' },
                    ] as const
                  ).map((r) => (
                    <Button
                      type="button"
                      key={r.value}
                      variant={role === r.value ? 'default' : 'outline'}
                      onClick={() => setRole(r.value)}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha (mín. 6 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <Alert status="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
            <button
              className="font-bold cursor-pointer underline underline-offset-4"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? 'Cadastre-se' : 'Entre'}
            </button>
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 rounded border-2 border-dashed border-black/40 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
        <p className="font-bold text-foreground">CONTAS DEMO (seed):</p>
        <p className="mt-1">
          cliente · cliente2 · organizador · portaria @ingressa.com · senha 123456
        </p>
      </div>
    </div>
  );
}
