import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/PriorityBadge";
import type { CalendarEvent } from "@shared/schema";
import { useLocation } from "wouter";

export function CalendarCard() {
  const [, setLocation] = useLocation();

  // Get next 7 days of events
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
      );
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const upcomingEvents = events.slice(0, 5);

  return (
    <Card 
      className="p-6 hover-elevate cursor-pointer" 
      data-testid="card-calendar"
      onClick={() => setLocation('/calendar')}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">Upcoming Events</p>
          <p className="text-3xl font-bold font-heading" data-testid="text-calendar-event-count">
            {events.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Next 7 days
          </p>
        </div>
        <div className="rounded-md bg-primary/10 p-3">
          <CalendarIcon className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      {upcomingEvents.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          {upcomingEvents.map((event) => {
            const eventDate = new Date(event.date);
            const isToday = eventDate.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={event.id} 
                className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                data-testid={`calendar-event-preview-${event.id}`}
              >
                <PriorityBadge priority={event.priority} showTooltip={false} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {isToday ? 'Today' : eventDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' '}
                    {eventDate.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 border-t">
          No upcoming events
        </div>
      )}
    </Card>
  );
}
