import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-sm font-black text-zinc-950">
        IN
      </span>
      <span className="text-lg font-bold tracking-tight">
        ingressa<span className="text-amber-400">.</span>
      </span>
    </Link>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      isActive
        ? 'bg-zinc-800 text-zinc-100'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Explorar
            </NavLink>
            {user?.role === 'CUSTOMER' && (
              <NavLink to="/ingressos" className={linkClass}>
                Meus ingressos
              </NavLink>
            )}
            {user?.role === 'ORGANIZER' && (
              <>
                <NavLink to="/organizador" className={linkClass}>
                  Meus eventos
                </NavLink>
                <NavLink to="/portaria" className={linkClass}>
                  Portaria
                </NavLink>
              </>
            )}
          </nav>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs leading-tight text-zinc-500">
                  {user.role === 'ORGANIZER' ? 'Organizador' : 'Cliente'}
                </p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              to="/entrar"
              className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              Entrar
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-600">
        Ingressa — plataforma de eventos e ingressos · teste técnico
      </footer>
    </div>
  );
}
