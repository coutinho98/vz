import { useState, useEffect, useMemo } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string;
  onChange?: (isoDateString: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PRESET_HOURS = ['14:00', '16:00', '18:00', '20:00', '21:30'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione a data e horário...',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const initialDate = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [viewDate, setViewDate] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? initialDate : null);
  const [time, setTime] = useState<string>(() => {
    if (!value) return '20:00';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '20:00';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        setSelectedDate(d);
        setViewDate(d);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setTime(`${hh}:${mm}`);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function handleSelectDay(day: number) {
    const newDate = new Date(year, month, day);
    const [hh, mm] = (time || '20:00').split(':').map(Number);
    newDate.setHours(hh || 0, mm || 0, 0, 0);

    setSelectedDate(newDate);

    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const hours = String(newDate.getHours()).padStart(2, '0');
    const minutes = String(newDate.getMinutes()).padStart(2, '0');
    onChange?.(`${y}-${m}-${d}T${hours}:${minutes}`);
  }

  function handleTimeChange(newTime: string) {
    let digits = newTime.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    setTime(formatted);

    if (digits.length === 4) {
      let hh = Number(digits.slice(0, 2));
      if (hh > 23) hh = 23;
      let mm = Number(digits.slice(2, 4));
      if (mm > 59) mm = 59;
      const validTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      setTime(validTime);

      const base = selectedDate || new Date();
      const newDate = new Date(base);
      newDate.setHours(hh, mm, 0, 0);
      setSelectedDate(newDate);

      const y = newDate.getFullYear();
      const m = String(newDate.getMonth() + 1).padStart(2, '0');
      const d = String(newDate.getDate()).padStart(2, '0');
      onChange?.(`${y}-${m}-${d}T${validTime}`);
    }
  }

  function handlePresetTime(preset: string) {
    setTime(preset);
    const [hh, mm] = preset.split(':').map(Number);
    const base = selectedDate || new Date();
    const newDate = new Date(base);
    newDate.setHours(hh, mm, 0, 0);
    setSelectedDate(newDate);

    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    onChange?.(`${y}-${m}-${d}T${preset}`);
  }

  const displayText = useMemo(() => {
    if (!selectedDate) return null;
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const y = selectedDate.getFullYear();
    return `${d}/${m}/${y} às ${time}`;
  }, [selectedDate, time]);

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between rounded border-2 border-black bg-background px-3 py-2 text-sm font-medium shadow-md transition duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          !selectedDate && 'text-muted-foreground',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-foreground" />
          <span className="font-mono text-xs sm:text-sm font-bold">
            {displayText ?? placeholder}
          </span>
        </div>
        <Clock className="size-3.5 shrink-0 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="w-80 rounded border-2 border-black bg-card p-4 text-card-foreground shadow-[4px_4px_0px_0px_#000] outline-none animate-in fade-in-0 zoom-in-95">
            {/* Header do Mês / Ano */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <span className="font-head text-sm font-bold uppercase tracking-wider">
                {MONTHS[month]} {year}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={prevMonth}
                  aria-label="Mês anterior"
                  className="size-7"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={nextMonth}
                  aria-label="Próximo mês"
                  className="size-7"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 pt-3 text-center">
              {WEEKDAYS.map((wd) => (
                <span
                  key={wd}
                  className="font-mono text-[11px] font-bold uppercase text-muted-foreground"
                >
                  {wd}
                </span>
              ))}
            </div>

            {/* Grade de dias */}
            <div className="grid grid-cols-7 gap-1 pt-1.5">
              {/* Dias do mês anterior */}
              {Array.from({ length: firstDayIndex }).map((_, i) => {
                const dayNum = prevMonthDays - firstDayIndex + i + 1;
                return (
                  <span
                    key={`prev-${i}`}
                    className="flex size-9 items-center justify-center font-mono text-xs text-muted-foreground/30 select-none"
                  >
                    {dayNum}
                  </span>
                );
              })}

              {/* Dias do mês atual */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected =
                  selectedDate?.getFullYear() === year &&
                  selectedDate?.getMonth() === month &&
                  selectedDate?.getDate() === dayNum;
                const isToday = isCurrentMonthToday && today.getDate() === dayNum;
                // sessao so pode ser criada no futuro (nem hoje: ja comecou)
                const isPast =
                  new Date(year, month, dayNum).getTime() <=
                  new Date().setHours(0, 0, 0, 0);

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleSelectDay(dayNum)}
                    className={cn(
                      'flex size-9 cursor-pointer items-center justify-center rounded font-mono text-xs font-bold transition-all duration-150',
                      isPast
                        ? 'cursor-not-allowed text-muted-foreground/30 select-none'
                        : isSelected
                          ? 'border-2 border-black bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_#000] -translate-x-0.5 -translate-y-0.5'
                          : isToday
                            ? 'border-2 border-dashed border-black bg-accent text-foreground hover:border-solid hover:bg-primary/20'
                            : 'hover:border-2 hover:border-black hover:bg-muted text-foreground'
                    )}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Seletor de Horário RetroUI */}
            <div className="mt-3 border-t-2 border-dashed border-black/30 pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs font-bold uppercase">Horário:</span>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  placeholder="20:00"
                  maxLength={5}
                  className="h-7 w-20 px-1.5 text-center font-mono text-xs font-bold"
                  title="Horário em 24h (ex: 16:45)"
                />
              </div>

              {/* Atalhos de Horário */}
              <div className="mt-2 flex flex-wrap gap-1">
                {PRESET_HOURS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetTime(preset)}
                    className={cn(
                      'rounded border border-black px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                      time === preset
                        ? 'bg-black text-white'
                        : 'bg-muted text-foreground hover:bg-primary/30'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="default"
                  size="xs"
                  onClick={() => setOpen(false)}
                  className="font-head text-xs"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
