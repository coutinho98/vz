import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Compass, Calendar, BarChart3, ScanLine, Ticket, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';
import logoUrl from '../blob.svg';

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2">
      <img src={logoUrl} alt="VZ" className="size-10 sm:size-14 object-contain" />
      <span className="font-head text-lg sm:text-xl tracking-tight">
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
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fecha o menu móvel ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Previne rolagem no body quando menu móvel estiver aberto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `border-2 px-3 py-1.5 text-sm font-bold transition-all duration-200 ${
      isActive
        ? 'border-black bg-black text-background shadow-sm'
        : 'border-transparent text-muted-foreground hover:-translate-y-0.5 hover:border-black hover:bg-card hover:text-foreground hover:shadow-sm'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Logo />

          {/* Navegação Desktop (md e acima) */}
          <nav className="hidden items-center gap-1.5 md:flex" aria-label="Principal">
            {user?.role === 'GATE' ? (
              <NavLink to="/portaria" className={desktopLinkClass}>
                Portaria
              </NavLink>
            ) : (
              <>
                <NavLink to="/" end className={desktopLinkClass}>
                  Explorar
                </NavLink>
                {user?.role === 'CUSTOMER' && (
                  <NavLink to="/ingressos" className={desktopLinkClass}>
                    Meus ingressos
                  </NavLink>
                )}
                {user?.role === 'ORGANIZER' && (
                  <>
                    <NavLink to="/organizador" end className={desktopLinkClass}>
                      Meus eventos
                    </NavLink>
                    <NavLink to="/organizador/analytics" className={desktopLinkClass}>
                      Analytics
                    </NavLink>
                    <NavLink to="/portaria" className={desktopLinkClass}>
                      Portaria
                    </NavLink>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Área do Usuário Desktop */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <div className="flex shrink-0 items-center gap-3">
                <div
                  className="flex items-center gap-2.5 border-2 border-black bg-card px-2.5 py-1 shadow-sm"
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

          {/* Ações Mobile (Toggle Menu + Avatar / Entrar) */}
          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <div
                className="flex size-9 items-center justify-center border-2 border-black bg-primary font-head text-xs font-bold shadow-xs"
                title={`${user.name} (${ROLE_LABEL[user.role]})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <Button
                size="sm"
                className="border-2 border-black bg-primary font-head text-xs font-bold text-foreground shadow-xs transition hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                nativeButton={false}
                render={<Link to="/entrar" />}
              >
                <LogIn className="size-3.5 mr-1" />
                Entrar
              </Button>
            )}
            <Button
              variant={mobileMenuOpen ? 'default' : 'outline'}
              size="sm"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              className={`size-9 p-0 border-2 border-black transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                mobileMenuOpen ? 'bg-black text-background shadow-xs' : 'bg-card text-foreground shadow-xs hover:bg-accent'
              }`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Menu Móvel (Drawer / Overlay RetroUI) */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col border-t-2 border-black bg-background/98 backdrop-blur-md md:hidden animate-in fade-in-0 duration-200">
            <div className="flex flex-1 flex-col justify-between overflow-y-auto p-4 space-y-6">
              {/* Links de navegação móvel em formato de cards interativos */}
              <nav className="space-y-2.5" aria-label="Navegação mobile">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground px-1">
                  Navegação principal
                </p>

                {user?.role === 'GATE' ? (
                  <NavLink
                    to="/portaria"
                    className={({ isActive }) =>
                      `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                        isActive
                          ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                          : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                              isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                            }`}
                          >
                            <ScanLine className="size-5" />
                          </span>
                          <div className="text-left leading-tight">
                            <p className="font-head text-base tracking-tight">Portaria</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              Validação e check-in de ingressos
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                      </>
                    )}
                  </NavLink>
                ) : (
                  <>
                    <NavLink
                      to="/"
                      end
                      className={({ isActive }) =>
                        `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                          isActive
                            ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                            : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                                isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                              }`}
                            >
                              <Compass className="size-5" />
                            </span>
                            <div className="text-left leading-tight">
                              <p className="font-head text-base tracking-tight">Explorar</p>
                              <p className="font-mono text-xs text-muted-foreground">
                                Filmes em cartaz e shows
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                        </>
                      )}
                    </NavLink>

                    {user?.role === 'CUSTOMER' && (
                      <NavLink
                        to="/ingressos"
                        className={({ isActive }) =>
                          `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                            isActive
                              ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                              : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                                  isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                                }`}
                              >
                                <Ticket className="size-5" />
                              </span>
                              <div className="text-left leading-tight">
                                <p className="font-head text-base tracking-tight">Meus ingressos</p>
                                <p className="font-mono text-xs text-muted-foreground">
                                  Bilhetes comprados e QR Codes
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                          </>
                        )}
                      </NavLink>
                    )}

                    {user?.role === 'ORGANIZER' && (
                      <>
                        <NavLink
                          to="/organizador"
                          end
                          className={({ isActive }) =>
                            `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                              isActive
                                ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                                : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                                    isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                                  }`}
                                >
                                  <Calendar className="size-5" />
                                </span>
                                <div className="text-left leading-tight">
                                  <p className="font-head text-base tracking-tight">Meus eventos</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Criar, editar e publicar sessões
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                            </>
                          )}
                        </NavLink>

                        <NavLink
                          to="/organizador/analytics"
                          className={({ isActive }) =>
                            `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                              isActive
                                ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                                : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                                    isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                                  }`}
                                >
                                  <BarChart3 className="size-5" />
                                </span>
                                <div className="text-left leading-tight">
                                  <p className="font-head text-base tracking-tight">Analytics</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Vendas, receita e ocupação
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                            </>
                          )}
                        </NavLink>

                        <NavLink
                          to="/portaria"
                          className={({ isActive }) =>
                            `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                              isActive
                                ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                                : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                                    isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                                  }`}
                                >
                                  <ScanLine className="size-5" />
                                </span>
                                <div className="text-left leading-tight">
                                  <p className="font-head text-base tracking-tight">Portaria</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    Leitor QR e validação na entrada
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                            </>
                          )}
                        </NavLink>
                      </>
                    )}

                    {!user && (
                      <NavLink
                        to="/entrar"
                        className={({ isActive }) =>
                          `group flex items-center justify-between gap-3 rounded border-2 border-black p-3 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
                            isActive
                              ? 'bg-primary text-foreground shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                              : 'bg-card text-foreground shadow-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-accent/40'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`flex size-10 shrink-0 items-center justify-center border-2 border-black ${
                                  isActive ? 'bg-black text-primary' : 'bg-primary text-black'
                                }`}
                              >
                                <LogIn className="size-5" />
                              </span>
                              <div className="text-left leading-tight">
                                <p className="font-head text-base tracking-tight">Entrar na conta</p>
                                <p className="font-mono text-xs text-muted-foreground">
                                  Acessar ou cadastrar perfil
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold opacity-60 group-hover:opacity-100">→</span>
                          </>
                        )}
                      </NavLink>
                    )}
                  </>
                )}
              </nav>

              {/* Área do Usuário no menu móvel */}
              <div className="space-y-3 border-t-2 border-dashed border-black/30 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 rounded border-2 border-black bg-card p-3.5 shadow-sm">
                      <span className="flex size-10 shrink-0 items-center justify-center border-2 border-black bg-primary font-head text-base font-bold shadow-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-head text-sm">{user.name}</p>
                          <span className="border border-black bg-accent px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
                            {ROLE_LABEL[user.role]}
                          </span>
                        </div>
                        <p className="truncate font-mono text-xs text-muted-foreground mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full justify-center gap-2 py-3 font-head text-xs uppercase tracking-wider border-2 border-black shadow-xs transition active:translate-x-0.5 active:translate-y-0.5"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                        navigate('/');
                      }}
                    >
                      <LogOut className="size-4" />
                      Sair da conta
                    </Button>
                  </>
                ) : (
                  <Button
                    nativeButton={false}
                    className="w-full justify-center gap-2 py-3.5 font-head text-sm tracking-wide border-2 border-black bg-primary text-foreground shadow-md transition hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5"
                    render={<Link to="/entrar" onClick={() => setMobileMenuOpen(false)} />}
                  >
                    <LogIn className="size-4" />
                    Entrar na plataforma
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

