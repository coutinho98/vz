import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';
import logoUrl from '../blob.svg';

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <img src={logoUrl} alt="VZ" className="size-15 object-contain" />
      <span className="font-head text-xl tracking-tight">
        vz<span className="text-primary">.</span>
      </span>
    </Link>
  );
}

const ROLE_LABEL: Record<string, string> = {
  ORGANIZER: 'Organizador',
  CUSTOMER: 'Cliente',
  GATE: 'Portaria',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `border-2 px-3 py-1.5 text-sm font-bold transition-all duration-200 ${
      isActive
        ? 'border-black bg-black text-background shadow-sm'
        : 'border-transparent text-muted-foreground hover:-translate-y-0.5 hover:border-black hover:bg-card hover:text-foreground hover:shadow-sm'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />

          <nav className="flex items-center gap-1.5" aria-label="Principal">
            {user?.role === 'GATE' ? (
              <NavLink to="/portaria" className={linkClass}>
                Portaria
              </NavLink>
            ) : (
              <>
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
              </>
            )}
          </nav>

          {user ? (
            <div className="flex shrink-0 items-center gap-3">
              <div
                className="hidden items-center gap-2.5 border-2 border-black bg-card px-2.5 py-1 shadow-sm sm:flex"
                title={`${user.name} · ${ROLE_LABEL[user.role]}`}
              >
                <span className="flex size-7 items-center justify-center border-2 border-black bg-primary font-head text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold">{user.name.split(' ')[0]}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {ROLE_LABEL[user.role]}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Sair
              </Button>
            </div>
          ) : (
            <Button size="sm" nativeButton={false} render={<Link to="/entrar" />}>
              Entrar
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-4">
        <Outlet />
      </main>
    </div>
  );
}
