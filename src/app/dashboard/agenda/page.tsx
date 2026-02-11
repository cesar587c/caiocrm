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
  // weekStartsOn: 0 makes Sunday the first day of the week
  const startDate = startOfWeek(monthStart, { locale: ptBR, weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { locale: ptBR, weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const eventsMap = new Map();
  // Mock events using theme colors
  const firstDayOfMonth = startOfMonth(currentMonth);
  eventsMap.set(format(addDays(firstDayOfMonth, 19), 'yyyy-MM-dd'), 'bg-chart-3');
  eventsMap.set(format(addDays(firstDayOfMonth, 23), 'yyyy-MM-dd'), 'bg-chart-2');
  eventsMap.set(format(addDays(firstDayOfMonth, 29), 'yyyy-MM-dd'), 'bg-chart-5');


  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="flex h-full flex-col p-4 bg-background">
      {/* Use bg-card and text-card-foreground to match project theme */}
      <div className="flex w-full flex-1 flex-col rounded-2xl bg-card p-6 text-card-foreground shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {/* Increase font size for better visibility */}
            <h2 className="text-2xl font-bold capitalize text-foreground">
              {format(currentMonth, 'MMMM', { locale: ptBR })}
            </h2>
            {/* Use muted-foreground for secondary text */}
            <p className="text-lg text-muted-foreground">{format(currentMonth, 'yyyy')}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Use accent color for hover state */}
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-lg h-10 w-10 hover:bg-accent/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-lg h-10 w-10 hover:bg-accent/50">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid flex-1 grid-cols-7 text-center">
          {/* Weekdays */}
          {weekdays.map((day, i) => (
            <div key={i} className="flex items-center justify-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Days */}
          {days.map((day) => {
            const eventColor = eventsMap.get(format(day, 'yyyy-MM-dd'));
            return (
              <div
                key={day.toString()}
                className="flex flex-col items-center justify-start py-2"
                onClick={() => isSameMonth(day, currentMonth) && setSelectedDate(day)}
              >
                <div
                  className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-full transition-colors text-base font-medium",
                    // Use muted-foreground for days outside the current month
                    isSameMonth(day, currentMonth) ? 'cursor-pointer' : 'text-muted-foreground/50',
                    // Use accent for hover
                    !isSameDay(day, selectedDate) && isSameMonth(day, currentMonth) && 'hover:bg-accent/50',
                    // Use primary color for the selected day
                    isSameDay(day, selectedDate) && 'bg-primary text-primary-foreground',
                    // Add a subtle border for today's date if not selected
                    isToday(day) && !isSameDay(day, selectedDate) && 'border-2 border-primary/50'
                  )}
                >
                  {format(day, 'd')}
                </div>
                 {eventColor && isSameMonth(day, currentMonth) && (
                   <div className={cn("w-2 h-2 rounded-full mt-2", eventColor)}></div>
                 )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
