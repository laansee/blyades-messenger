import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CalendarSearchPopoverProps {
  show: boolean;
  calendarViewDate: Date;
  selectedDate: Date | null;
  onMonthChange: (newDate: Date) => void;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const CalendarSearchPopover: React.FC<CalendarSearchPopoverProps> = ({
  show,
  calendarViewDate,
  selectedDate,
  onMonthChange,
  onSelectDate,
  onClose
}) => {
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{ date: Date; currentMonth: boolean }> = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        currentMonth: false
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        currentMonth: true
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        currentMonth: false
      });
    }

    return days;
  }, [calendarViewDate]);

  if (!show) return null;

  return (
    <div style={{
      position: 'absolute', top: '56px', right: '16px', zIndex: 1200,
      backgroundColor: '#21212b', border: '1px solid #2f2f3d', borderRadius: '12px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.65)', width: '280px', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px', userSelect: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>
          {MONTH_NAMES_RU[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()} г.
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '2px', display: 'flex' }}
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '2px', display: 'flex' }}
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '12px', color: '#8e8e93', marginBottom: '2px' }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span key={d}>{d}</span>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {calendarDays.map((item, idx) => {
          const isSelected = selectedDate &&
            selectedDate.getDate() === item.date.getDate() &&
            selectedDate.getMonth() === item.date.getMonth() &&
            selectedDate.getFullYear() === item.date.getFullYear();

          return (
            <button
              type="button"
              key={idx}
              onClick={() => onSelectDate(item.date)}
              style={{
                height: '32px', borderRadius: '50%', border: 'none',
                backgroundColor: isSelected ? '#8774e1' : 'transparent',
                color: isSelected ? '#fff' : item.currentMonth ? '#fff' : '#555562',
                fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'background-color 0.15s'
              }}
            >
              {item.date.getDate()}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8774e1', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};