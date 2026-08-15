import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import type { CheckInResponse, EventItem } from '../../api/types';
import { api, apiErrorMessage, formatDateTime } from '../../api/client';
import { Spinner } from '../../components/ui';

type LastCheck =
  | { kind: 'ok'; result: CheckInResponse }
  | { kind: 'error'; message: string };

const statusVisual = (status: CheckInResponse['status']) => {
  switch (status) {
    case 'VALID':
      return {
        border: 'border-emerald-500/60',
        bg: 'bg-emerald-500/10',
        title: 'ENTRADA LIBERADA',
        titleCls: 'text-emerald-400',
        icon: '✓',
      };
    case 'ALREADY_USED':
      return {
        border: 'border-amber-500/60',
        bg: 'bg-amber-500/10',
        title: 'JÁ UTILIZADO',
        titleCls: 'text-amber-400',
        icon: '!',
      };
    default:
      return {
        border: 'border-red-500/60',
        bg: 'bg-red-500/10',
        title: 'INGRESSO INVÁLIDO',
        titleCls: 'text-red-400',
        icon: '×',
      };
  }
};

export default function GateCheckPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [cameraOn, setCameraOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [last, setLast] = useState<LastCheck | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { data: event } = useQuery<EventItem>({
    queryKey: ['event', eventId],
    queryFn: async () => (await api.get<EventItem>(`/events/${eventId}`)).data,
  });

  const checkIn = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<CheckInResponse>(
        `/gate/events/${eventId}/check-in`,
        { code },
      );
      return res.data;
    },
    onSuccess: (result) => setLast({ kind: 'ok', result }),
    onError: (err) => setLast({ kind: 'error', message: apiErrorMessage(err) }),
  });

  function extractCode(raw: string) {
    const match = raw.trim().toUpperCase().match(/\/T\/([A-Z0-9-]+)/);
    return (match ? match[1] : raw.trim().toUpperCase()).replace(/\s/g, '');
  }

  async function startCamera() {
    setCamError(null);
    setLast(null);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const code = extractCode(decoded);
          if (!checkIn.isPending) {
            scanner.stop().then(() => setCameraOn(false));
            checkIn.mutate(code);
          }
        },
        () => undefined,
      );
      setCameraOn(true);
    } catch (err) {
      setCamError(
        'Não foi possível acessar a câmera. Use a digitação manual abaixo. (' +
          String(err) +
          ')',
      );
    }
  }

  async function stopCamera() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* already stopped */
      }
    }
    setCameraOn(false);
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visual = last?.kind === 'ok' ? statusVisual(last.result.status) : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/portaria" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Portaria
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {event?.title ?? 'Validação de ingressos'}
          </h1>
          {event && (
            <p className="text-sm text-zinc-400">
              {formatDateTime(event.startsAt)} · {event.venue}
            </p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Leitor de QR Code</h2>
          {cameraOn ? (
            <button
              onClick={() => void stopCamera()}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-red-400 hover:text-red-300"
            >
              Parar câmera
            </button>
          ) : (
            <button
              onClick={() => void startCamera()}
              className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-950 transition hover:bg-amber-300"
            >
              Liga câmera
            </button>
          )}
        </div>

        <div
          id="qr-reader"
          className={`mt-4 overflow-hidden rounded-xl border ${
            cameraOn ? 'border-amber-400/60' : 'border-dashed border-zinc-700'
          } ${cameraOn ? '' : 'bg-zinc-950/60'}`}
        >
          {!cameraOn && (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              Câmera desligada — clique em “Ligar câmera” para escanear o ingresso
              ou use a digitação manual abaixo.
            </p>
          )}
        </div>
        {camError && (
          <p className="mt-2 text-xs text-amber-400/90">{camError}</p>
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = extractCode(manualCode);
          if (code) {
            setLast(null);
            checkIn.mutate(code);
          }
        }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      >
        <h2 className="font-semibold">Digitação manual</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Digite o código do ingresso (ex.: ING-AB2CD-3EFGH) ou cole o link /t/…
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="ING-XXXXX-XXXXX"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 font-mono text-sm uppercase tracking-wider outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-600 focus:border-amber-400"
          />
          <button
            disabled={checkIn.isPending || !manualCode.trim()}
            className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-40"
          >
            Validar
          </button>
        </div>
      </form>

      {checkIn.isPending && <Spinner label="Validando…" />}

      {last?.kind === 'error' && (
        <div className={`rounded-2xl border p-5 ${statusVisual('INVALID').border} ${statusVisual('INVALID').bg}`}>
          <p className={`text-lg font-black tracking-wide ${statusVisual('INVALID').titleCls}`}>
            × FALHA NA VALIDAÇÃO
          </p>
          <p className="mt-1 text-sm text-zinc-300">{last.message}</p>
        </div>
      )}

      {last?.kind === 'ok' && visual && (
        <div
          className={`rounded-2xl border p-5 ${visual.border} ${visual.bg}`}
          role="status"
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xl font-black ${visual.titleCls}`}
            >
              {visual.icon}
            </span>
            <p className={`text-lg font-black tracking-wide ${visual.titleCls}`}>
              {visual.title}
            </p>
          </div>
          <p className="mt-2 text-sm text-zinc-200">{last.result.message}</p>
          {last.result.ticket && (
            <div className="mt-3 grid gap-1 rounded-xl bg-zinc-950/60 p-3 text-sm text-zinc-300">
              <p>
                Código: <code className="tracking-wider">{last.result.ticket.code}</code>
              </p>
              <p>
                Titular: {last.result.ticket.holderFirstName}
                {last.result.ticket.seatLabel
                  ? ` · Lugar ${last.result.ticket.seatLabel}`
                  : ` · ${last.result.ticket.quantity} pessoa(s)`}
              </p>
              {last.result.ticket.checkedInAt && (
                <p className="text-zinc-500">
                  Check-in: {formatDateTime(last.result.ticket.checkedInAt)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
