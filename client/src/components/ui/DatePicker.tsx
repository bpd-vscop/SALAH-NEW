import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad2 = (value: number) => String(value).padStart(2, '0');

const parseDateValue = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [yearRaw, monthRaw, dayRaw] = trimmed.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toDateValue = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatDisplay = (value: string) => {
  const date = parseDateValue(value);
  if (!date) return '';
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const addMonths = (date: Date, delta: number) => new Date(date.getFullYear(), date.getMonth() + delta, 1, 0, 0, 0, 0);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const buildCalendarGrid = (month: Date) => {
  const first = startOfMonth(month);
  const startOffset = first.getDay(); // 0=Sun
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset, 0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i, 0, 0, 0, 0));
  }
  return days;
};

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  className,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date>(() => startOfMonth(parseDateValue(value) ?? new Date()));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (!open) return;
    initialValueRef.current = value;
    const initial = parseDateValue(value);
    const seed = initial ?? new Date();
    setDraft(initial);
    setMonth(startOfMonth(seed));
    setShowYearPicker(false);
  }, [open, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return;
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const days = useMemo(() => buildCalendarGrid(month), [month]);
  const displayed = formatDisplay(value);

  const commit = () => {
    if (!draft) {
      onChange('');
      setOpen(false);
      return;
    }
    onChange(toDateValue(draft));
    setOpen(false);
  };

  const cancel = () => {
    const initial = initialValueRef.current;
    setDraft(parseDateValue(initial));
    setMonth(startOfMonth(parseDateValue(initial) ?? new Date()));
    setOpen(false);
  };

  const visibleYear = month.getFullYear();
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = currentYear - 10;
    const end = currentYear + 10;
    const list: number[] = [];
    for (let y = start; y <= end; y += 1) list.push(y);
    return list;
  }, []);

  return (
    <div ref={wrapperRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-6 w-full items-center gap-1 rounded-full border border-border bg-white px-2 text-xs transition',
          'hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', displayed ? 'text-slate-900' : 'text-slate-400')}>
          {displayed || placeholder}
        </span>
        <Calendar className="h-3 w-3 text-slate-500" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-[120] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex">
              <div className="w-[320px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMonth((current) => addMonths(current, -1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-primary hover:text-primary"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowYearPicker((current) => !current)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    {MONTH_NAMES[month.getMonth()]} {visibleYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonth((current) => addMonths(current, 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-primary hover:text-primary"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
                  {WEEKDAY_NAMES.map((name) => (
                    <div key={name} className="py-2">
                      {name}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const inMonth = day.getMonth() === month.getMonth();
                    const isSelected = draft ? isSameDay(day, draft) : false;
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setDraft(day)}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition',
                          inMonth ? 'text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-50',
                          isSelected && 'bg-blue-600 text-white hover:bg-blue-600'
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={cancel}
                    className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={commit}
                    className="h-11 rounded-xl border border-blue-600 bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>

              {showYearPicker && (
                <div className="w-40 border-l border-slate-100 bg-slate-50 p-3">
                  <div className="mb-2 text-center text-sm font-semibold text-slate-900">Year</div>
                  <div className="max-h-[312px] overflow-y-auto rounded-xl bg-white p-1 shadow-sm">
                    {years.map((year) => {
                      const active = year === visibleYear;
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => {
                            setMonth((current) => new Date(year, current.getMonth(), 1, 0, 0, 0, 0));
                            setShowYearPicker(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-semibold transition',
                            active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
