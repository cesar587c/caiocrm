'use client';

import { useState } from 'react';
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const eventsMap = new Map();
  // Mock events based on the image's visual cues
  if (isSameMonth(currentMonth, new Date(2020, 0, 1))) {
      eventsMap.set('2020-01-20', 'bg-red-500');
      eventsMap.set('2020-01-24', 'bg-cyan-400');
      eventsMap.set('2020-01-30', 'bg-yellow-500');
  } else {
      // Add some dynamic events for other months for demonstration
      const firstDay = startOfMonth(currentMonth);
      eventsMap.set(format(addDays(firstDay, 19), 'yyyy-MM-dd'), 'bg-red-500');
      eventsMap.set(format(addDays(firstDay, 23), 'yyyy-MM-dd'), 'bg-cyan-400');
      eventsMap.set(format(addDays(firstDay, 29), 'yyyy-MM-dd'), 'bg-yellow-500');
  }


  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="flex flex-col h-full p-4 bg-background">
      <div className="flex flex-col w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900/90 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold capitalize">
              {format(currentMonth, 'MMMM', { locale: ptBR })}
            </h2>
            <p className="text-white/60">{format(currentMonth, 'yyyy')}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-lg h-10 w-10 hover:bg-white/10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-lg h-10 w-10 hover:bg-white/10">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 text-center flex-1">
          {/* Weekdays */}
          {weekdays.map((day, i) => (
            <div key={i} className="flex items-center justify-center text-sm font-medium text-white/50">
              {day}
            </div>
          ))}

          {/* Days */}
          {days.map((day, index) => {
            const eventColor = eventsMap.get(format(day, 'yyyy-MM-dd'));
            return (
              <div
                key={index}
                className="flex flex-col justify-start items-center pt-2"
                onClick={() => isSameMonth(day, currentMonth) && setSelectedDate(day)}
              >
                <div
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-xl transition-colors text-sm",
                    isSameMonth(day, currentMonth) ? 'cursor-pointer' : 'text-white/30',
                    !isSameDay(day, selectedDate) && isSameMonth(day, currentMonth) && 'hover:bg-white/10',
                    isSameDay(day, selectedDate) && 'bg-cyan-400 text-slate-900 font-bold',
                  )}
                >
                  {format(day, 'd')}
                </div>
                 {eventColor && isSameMonth(day, currentMonth) && (
                   <div className={cn("w-1.5 h-1.5 rounded-full mt-1", eventColor)}></div>
                 )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
