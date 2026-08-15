import { useMemo } from 'react';
import type { SeatMap } from '../api/types';

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
      { label: 'Livre', cls: 'border-zinc-600 bg-zinc-800 hover:border-amber-400' },
      { label: 'Selecionado', cls: 'border-amber-400 bg-amber-400 text-zinc-950' },
      { label: 'Ocupado', cls: 'border-zinc-800 bg-zinc-900 text-zinc-700 cursor-not-allowed' },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="mx-auto w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-800/60 py-2 text-center text-sm font-semibold tracking-widest text-zinc-300">
        TELA / PALCO
      </div>

      <div className="space-y-2">
        {seatMap.rows.map((row) => (
          <div key={row.row} className="flex items-center justify-center gap-1.5">
            <span className="w-5 text-center text-xs font-semibold text-zinc-500">
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
                  className={`h-7 w-7 rounded-md border text-[11px] font-medium transition ${
                    isSelected
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

      <div className="flex items-center justify-center gap-5 text-xs text-zinc-400">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`h-3.5 w-3.5 rounded ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
