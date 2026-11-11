import React, { useMemo, useEffect, useRef } from 'react';
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
  const popoverRef = useRef<HTMLDivElement>(null);

  // 🎯 Закрытие при клике вне зоны календаря
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  // Нормализованная сегодняшняя дата (полночь)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Запрет перехода на следующий месяц, если он весь в будущем
  const isNextMonthDisabled = useMemo(() => {
    const nextMonthFirstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    nextMonthFirstDay.setHours(0, 0, 0, 0);
    return nextMonthFirstDay.getTime() > today.getTime();
  }, [calendarViewDate, today]);

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
    <div 
      ref={popoverRef}
      style={{
        position: 'absolute', top: '56px', right: '16px', zIndex: 1200,
        backgroundColor: '#21212b', border: '1px solid #2f2f3d', borderRadius: '12px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.65)', width: '280px', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px', userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>
          {MONTH_NAMES_RU[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()} г.
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '2px', display: 'flex' }}
            title="Предыдущий месяц"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            disabled={isNextMonthDisabled}
            onClick={() => onMonthChange(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: isNextMonthDisabled ? '#444452' : '#8e8e93', 
              cursor: isNextMonthDisabled ? 'not-allowed' : 'pointer', 
              padding: '2px', 
              display: 'flex' 
            }}
            title={isNextMonthDisabled ? 'Будущий месяц недоступен' : 'Следующий месяц'}
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
          // Проверка: совпадает ли день с выбранным пользователем
          const isSelected = selectedDate &&
            selectedDate.getDate() === item.date.getDate() &&
            selectedDate.getMonth() === item.date.getMonth() &&
            selectedDate.getFullYear() === item.date.getFullYear();

          // 🎯 Проверка: является ли дата сегодняшней
          const isToday = 
            item.date.getDate() === today.getDate() &&
            item.date.getMonth() === today.getMonth() &&
            item.date.getFullYear() === today.getFullYear();

          // 🎯 Проверка: дата находится в будущем относительно сегодня
          const itemDateZero = new Date(item.date);
          itemDateZero.setHours(0, 0, 0, 0);
          const isFuture = itemDateZero.getTime() > today.getTime();

          return (
            <button
              type="button"
              key={idx}
              disabled={isFuture}
              onClick={() => {
                if (!isFuture) onSelectDate(item.date);
              }}
              style={{
                height: '32px',
                borderRadius: '50%',
                boxSizing: 'border-box',
                border: isSelected 
                  ? 'none' 
                  : isToday 
                  ? '1.5px solid #8774e1' // Рамка на сегодняшнюю дату
                  : 'none',
                backgroundColor: isSelected 
                  ? '#8774e1' 
                  : 'transparent',
                color: isFuture 
                  ? '#3d3d4a' // Приглушённый цвет для будущих дат
                  : isSelected 
                  ? '#fff' 
                  : isToday 
                  ? '#a797ec' 
                  : item.currentMonth 
                  ? '#fff' 
                  : '#555562',
                cursor: isFuture ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: isToday || isSelected ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s, border-color 0.15s'
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