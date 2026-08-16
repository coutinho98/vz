import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded border-2 border-black bg-primary font-head text-sm shadow-sm">
        IN
      </span>
      <span className="font-head text-xl tracking-tight">ingressa.</span>
    </Link>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded border-2 px-3 py-1.5 text-sm font-bold transition ${
      isActive
        ? 'border-black bg-black text-background shadow-sm'
        : 'border-transparent text-muted-foreground hover:border-black hover:bg-card hover:text-foreground'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-1">
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
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-tight">{user.name}</p>
                <p className="font-mono text-[10px] uppercase leading-tight tracking-widest text-muted-foreground">
                  {user.role === 'ORGANIZER'
                    ? 'Organizador'
                    : user.role === 'GATE'
                      ? 'Portaria'
                      : 'Cliente'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/'); }}>
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t-2 border-black bg-black py-5 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-background/70">
        ingressa · plataforma de eventos e ingressos · teste técnico
      </footer>
    </div>
  );
}
