import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import LoginPage from './pages/LoginPage';
import ExplorePage from './pages/ExplorePage';
import EventDetailPage from './pages/EventDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';
import TicketSharePage from './pages/TicketSharePage';
import OrganizerEventsPage from './pages/organizer/OrganizerEventsPage';
import OrganizerEventFormPage from './pages/organizer/OrganizerEventFormPage';
import GateEventsPage from './pages/gate/GateEventsPage';
import { Spinner } from './components/ui';

const GateCheckPage = lazy(() => import('./pages/gate/GateCheckPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ExplorePage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/eventos/:id" element={<EventDetailPage />} />
        <Route path="/t/:code" element={<TicketSharePage />} />

        <Route element={<RequireRole roles={['CUSTOMER']} />}>
          <Route path="/checkout/:reservationId" element={<CheckoutPage />} />
          <Route path="/ingressos" element={<MyTicketsPage />} />
        </Route>

        <Route element={<RequireRole roles={['ORGANIZER']} />}>
          <Route path="/organizador" element={<OrganizerEventsPage />} />
          <Route path="/organizador/novo" element={<OrganizerEventFormPage />} />
          <Route path="/organizador/:id/editar" element={<OrganizerEventFormPage />} />
        </Route>

        <Route element={<RequireRole roles={['ORGANIZER', 'GATE']} />}>
          <Route path="/portaria" element={<GateEventsPage />} />
          <Route
            path="/portaria/:eventId"
            element={
              <Suspense fallback={<Spinner label="Abrindo portaria…" />}>
                <GateCheckPage />
              </Suspense>
            }
          />
        </Route>

        <Route path="*" element={<ExplorePage />} />
      </Route>
    </Routes>
  );
}
