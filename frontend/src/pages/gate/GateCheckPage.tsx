import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { Check, X, AlertTriangle } from 'lucide-react';
import type { CheckInResponse, EventItem } from '../../api/types';
import { api, apiErrorMessage, formatDateTime } from '../../api/client';
import { Spinner } from '../../components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type LastCheck =
  | { kind: 'ok'; result: CheckInResponse }
  | { kind: 'error'; message: string };

export default function GateCheckPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
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

  function cameraErrorMessage(err: unknown): string {
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Permissão de câmera negada. Toque no ícone de cadeado/localização na barra do navegador e permita o acesso à câmera, ou use a digitação manual abaixo.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Nenhuma câmera encontrada neste dispositivo. Use a digitação manual abaixo.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'A câmera está em uso por outro aplicativo. Feche os outros apps/navegadores e tente novamente, ou use a digitação manual abaixo.';
    }
    return 'Não foi possível acessar a câmera. Use a digitação manual abaixo. (' + String(err) + ')';
  }

  async function startScanner(
    camera: string | { facingMode: string },
    onScan: (decoded: string) => void,
  ) {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    await scanner.start(
      camera,
      {
        fps: 10,
        qrbox: (vw: number) => {
          const size = Math.max(180, Math.min(280, Math.floor(vw * 0.7)));
          return { width: size, height: size };
        },
      },
      onScan,
      () => undefined,
    );
  }

  async function resetScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      /* já parado */
    }
    try {
      await scanner.clear();
    } catch {
      /* já limpo */
    }
  }

  async function startCamera() {
    setCamError(null);
    setLast(null);
    setStarting(true);

    if (typeof window !== 'undefined' && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
      setStarting(false);
      setCamError(
        'A câmera só funciona em conexão segura (HTTPS) e não é suportada em navegadores embutidos (Instagram, Facebook etc.). Abra o site direto no navegador em https://… e tente novamente, ou use a digitação manual abaixo.',
      );
      return;
    }

    const onScan = (decoded: string) => {
      const code = extractCode(decoded);
      if (!checkIn.isPending) {
        scannerRef.current
          ?.stop()
          .then(() => setCameraOn(false))
          .catch(() => setCameraOn(false));
        checkIn.mutate(code);
      }
    };

    try {
      // no iOS o facingMode costuma falhar: enumera as câmeras (isso também
      // dispara o prompt de permissão corretamente) e usa o ID da traseira
      let cameraId: string | null = null;
      try {
        const cameras = await Html5Qrcode.getCameras();
        const back = cameras.find((c) =>
          /back|rear|traseira|environment|arrière/i.test(c.label),
        );
        cameraId = back?.id ?? (cameras.length ? cameras[cameras.length - 1].id : null);
      } catch (err) {
        // se a enumeração falhou por permissão negada, esse é o erro real
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') throw err;
      }

      try {
        await startScanner(cameraId ?? { facingMode: 'environment' }, onScan);
      } catch (err) {
        if (!cameraId) throw err;
        await resetScanner();
        await startScanner({ facingMode: 'environment' }, onScan);
      }
      setCameraOn(true);
    } catch (err) {
      setCamError(cameraErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  async function stopCamera() {
    await resetScanner();
    setCameraOn(false);
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = last?.kind === 'ok' ? last.result : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/portaria" className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:underline">
            ← Portaria
          </Link>
          <h1 className="mt-1 font-head text-2xl tracking-tight">
            {event?.title ?? 'Validação de ingressos'}
          </h1>
          {event && (
            <p className="text-sm text-muted-foreground">
              {formatDateTime(event.startsAt)} · {event.venue}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-head">Leitor de QR Code</h2>
            {cameraOn ? (
              <Button variant="outline" size="sm" onClick={() => void stopCamera()}>
                Parar câmera
              </Button>
            ) : (
              <Button size="sm" disabled={starting} onClick={() => void startCamera()}>
                {starting ? 'Iniciando…' : 'Ligar câmera'}
              </Button>
            )}
          </div>

          <div
            id="qr-reader"
            className={`relative overflow-hidden rounded border-2 ${
              cameraOn || starting
                ? 'min-h-[340px] border-black bg-black'
                : 'border-dashed border-black/40 bg-muted/40'
            }`}
          >
            {starting && !cameraOn && (
              <p className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-white/80">
                abrindo câmera…
              </p>
            )}
            {!cameraOn && !starting && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Câmera desligada. Clique em “Ligar câmera” para escanear o ingresso
                ou use a digitação manual abaixo.
              </p>
            )}
          </div>
          {camError && (
            <p className="font-mono text-xs text-destructive">{camError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-head">Digitação manual</h2>
          <p className="font-mono text-xs text-muted-foreground">
            código do ingresso (ING-XXXXX-XXXXX) ou cole o link /t/…
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = extractCode(manualCode);
              if (code) {
                setLast(null);
                checkIn.mutate(code);
              }
            }}
            className="flex gap-2"
          >
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="ING-XXXXX-XXXXX"
              className="flex-1 font-mono uppercase tracking-wider"
            />
            <Button type="submit" disabled={checkIn.isPending || !manualCode.trim()}>Validar</Button>
          </form>
        </CardContent>
      </Card>

      {checkIn.isPending && <Spinner label="Validando…" />}

      {last?.kind === 'error' && (
        <Alert status="error">
          <X />
          <AlertTitle>Falha na validação</AlertTitle>
          <AlertDescription>{last.message}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert
          status={
            result.status === 'VALID'
              ? 'success'
              : result.status === 'ALREADY_USED'
                ? 'warning'
                : 'error'
          }
        >
          {result.status === 'VALID' ? <Check /> : result.status === 'ALREADY_USED' ? <AlertTriangle /> : <X />}
          <AlertTitle>
            {result.status === 'VALID'
              ? 'Entrada liberada'
              : result.status === 'ALREADY_USED'
                ? 'Ingresso já utilizado'
                : 'Ingresso inválido'}
          </AlertTitle>
          <AlertDescription>
            {result.message}
            {result.ticket && (
              <div className="mt-2 grid gap-1 rounded border-2 border-black/30 bg-card/60 p-3 font-mono text-xs">
                <p>código: {result.ticket.code}</p>
                <p>
                  titular: {result.ticket.holderFirstName}
                  {result.ticket.seatLabel
                    ? ` · lugar ${result.ticket.seatLabel}`
                    : ' · pista'}
                  {result.ticket.kind === 'HALF' && (
                    <strong className="text-yellow-700"> · MEIA — pedir documento</strong>
                  )}
                </p>
                {result.ticket.checkedInAt && (
                  <p>check-in: {formatDateTime(result.ticket.checkedInAt)}</p>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
