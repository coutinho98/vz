import { useMemo } from 'react';
import type { SeatMap } from '../api/types';

/**
 * O topo do mapa conversa com o cliente no vocabulário do evento:
 * cinema vê TELA, show vê PALCO com holofotes.
 */
function StageHeader({ category }: { category: SeatMap['category'] }) {
  if (category === 'MOVIE') {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded border-2 border-black bg-ink px-6 py-3 text-center font-head text-sm tracking-[0.4em] text-background shadow-sm">
          TELA
        </div>
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          sessão com som remasterizado
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex justify-center gap-6" aria-hidden="true">
        <span className="font-mono text-lg leading-none">☀</span>
        <span className="font-mono text-lg leading-none">☀</span>
        <span className="font-mono text-lg leading-none">☀</span>
      </div>
      <div className="-mt-1 rounded border-2 border-black bg-primary px-6 py-3 text-center font-head text-sm tracking-[0.4em] shadow-sm">
        PALCO
      </div>
      <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        a área da pista fica atrás das fileiras
      </p>
    </div>
  );
}

export default function SeatMapPicker({
  seatMap,
  selected,
  onToggle,
}: {
  seatMap: SeatMap;
  selected: Set<string>;
  onToggle: (seatId: string) => void;
}) {
  const legend = useMemo(
    () => [
      { label: 'Livre', cls: 'bg-card hover:-translate-y-0.5 hover:shadow-sm' },
      { label: 'Selecionado', cls: 'bg-primary shadow-sm' },
      { label: 'Ocupado', cls: 'bg-muted text-muted-foreground cursor-not-allowed' },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <StageHeader category={seatMap.category} />

      <div className="space-y-2">
        {seatMap.rows.map((row) => (
          <div key={row.row} className="flex items-center justify-center gap-1.5">
            <span className="w-5 text-center font-head text-xs text-muted-foreground">
              {row.row}
            </span>
            {row.seats.map((seat) => {
              const isSelected = selected.has(seat.id);
              const isTaken = seat.status === 'TAKEN';
              return (
                <button
                  key={seat.id}
                  disabled={isTaken}
                  onClick={() => onToggle(seat.id)}
                  title={`Fileira ${row.row} · Assento ${seat.number}${isTaken ? ' (ocupado)' : ''}`}
                  className={`h-7 w-7 rounded-none border-2 border-black text-[11px] font-bold transition ${isSelected
                    ? legend[1].cls
                    : isTaken
                      ? legend[2].cls
                      : legend[0].cls
                  }`}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-5 font-mono text-xs text-muted-foreground">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 border-2 border-black ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
