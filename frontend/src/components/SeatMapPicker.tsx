import { useMemo } from 'react';
import type { SeatMap } from '../api/types';

function StageHeader({
  category,
  room,
}: {
  category: SeatMap['category'];
  room?: string | null;
}) {
  const label = category === 'MOVIE' ? 'TELA' : 'PALCO';
  const display = room ? `${label} · ${room.toUpperCase()}` : label;

  if (category === 'MOVIE') {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded border-2 border-black bg-black px-6 py-2.5 text-center font-head text-xs tracking-[0.3em] text-white shadow-sm sm:text-sm">
          {display}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded border-2 border-black bg-primary px-6 py-2.5 text-center font-head text-xs tracking-[0.3em] shadow-sm sm:text-sm">
        {display}
      </div>
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
  const lastRowLetter = useMemo(() => {
    if (!seatMap.rows.length) return '';
    return seatMap.rows[seatMap.rows.length - 1].row;
  }, [seatMap]);

  const hasPcdSelected = useMemo(() => {
    for (const row of seatMap.rows) {
      for (const seat of row.seats) {
        if (selected.has(seat.id) && (seat.isPcd || row.row === lastRowLetter)) {
          return true;
        }
      }
    }
    return false;
  }, [seatMap, selected, lastRowLetter]);

  const legend = useMemo(
    () => [
      { label: 'Livre', cls: 'bg-card' },
      { label: 'PCD / Acessível', cls: 'bg-blue-100 text-blue-900', icon: '♿' },
      { label: 'Selecionado', cls: 'bg-primary' },
      { label: 'Ocupado', cls: 'bg-muted text-muted-foreground' },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <StageHeader category={seatMap.category} room={seatMap.room} />

      <div className="overflow-x-auto py-2 -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="min-w-fit space-y-2 mx-auto flex flex-col items-center">
          {seatMap.rows.map((row) => {
            const isRowPcd = row.row === lastRowLetter;
            return (
              <div key={row.row} className="flex items-center justify-center gap-1.5">
                <span className="w-5 text-center font-head text-xs text-muted-foreground">
                  {row.row}
                </span>
                {row.seats.map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const isTaken = seat.status === 'TAKEN';
                  const isPcd = seat.isPcd || isRowPcd;

                  let seatClass = 'bg-card hover:-translate-y-0.5 hover:shadow-sm';
                  if (isTaken) {
                    seatClass = 'bg-muted text-muted-foreground cursor-not-allowed border-black/40';
                  } else if (isSelected) {
                    seatClass = 'bg-primary shadow-sm text-foreground';
                  } else if (isPcd) {
                    seatClass = 'bg-blue-100 text-blue-950 hover:-translate-y-0.5 hover:bg-blue-200 hover:shadow-sm';
                  }

                  return (
                    <button
                      key={seat.id}
                      disabled={isTaken}
                      onClick={() => onToggle(seat.id)}
                      title={`Fileira ${row.row} · Assento ${seat.number}${isPcd ? ' (PCD / Acessível)' : ''}${
                        isTaken ? ' (ocupado)' : ''
                      }`}
                      aria-label={`Fileira ${row.row} Assento ${seat.number}${isPcd ? ' PCD' : ''}`}
                      className={`relative flex h-7 w-7 items-center justify-center rounded-none border-2 border-black text-[11px] font-bold transition ${seatClass}`}
                    >
                      {isPcd && !isSelected && !isTaken ? (
                        <span className="text-[12px] leading-none" title="Assento PCD">♿</span>
                      ) : (
                        seat.number
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda do Mapa */}
      <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-xs text-muted-foreground sm:gap-6">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center border-2 border-black text-[10px] font-bold ${l.cls}`}
            >
              {l.icon}
            </span>
            {l.label}
          </span>
        ))}
      </div>

      {/* Nota de Acessibilidade */}
      <div className="rounded border-2 border-black bg-blue-50/80 p-3 text-xs text-blue-950 shadow-xs">
        <p className="flex items-center gap-1.5 font-bold">
          <span>♿</span> Espaço e Assentos Reservados para PCD
        </p>
        <p className="mt-0.5 text-blue-900">
          A última fileira {lastRowLetter ? (<strong>({lastRowLetter})</strong>) : ''} ao fundo possui assentos com espaço adaptado para cadeirantes, pessoas com deficiência, mobilidade reduzida e seus acompanhantes, com fácil acesso às saídas e rampas.
        </p>
        {hasPcdSelected && (
          <p className="mt-1.5 border-t border-blue-200 pt-1.5 font-bold text-blue-950">
            ✓ Você selecionou assento(s) PCD acessível(is).
          </p>
        )}
      </div>
    </div>
  );
}
