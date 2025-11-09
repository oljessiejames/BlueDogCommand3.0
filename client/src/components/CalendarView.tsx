import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import { Calendar as CalendarIcon, CheckCircle2, Clock, Repeat } from "lucide-react";
import type { CalendarEvent } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarViewProps {
  events: CalendarEvent[];
  compact?: boolean;
}

export function CalendarView({ events, compact = false }: CalendarViewProps) {
  if (events.length === 0) {
    return (
      <Card className="p-12 text-center" data-testid="calendar-empty-state">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Events Scheduled</h3>
        <p className="text-sm text-muted-foreground">
          No directives or notices found in this time range
        </p>
      </Card>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.date).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const dates = Object.keys(groupedEvents).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {dates.map((date, dayIndex) => {
          const dayEvents = groupedEvents[date];
          const dateObj = new Date(date);
          const isToday = dateObj.toDateString() === new Date().toDateString();
          const isPast = dateObj < new Date() && !isToday;

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
              data-testid={`calendar-day-${date}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`text-right ${compact ? 'w-16' : 'w-20'}`}>
                  <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold font-heading ${isToday ? 'text-primary' : isPast ? 'text-muted-foreground' : ''}`}>
                    {dateObj.getDate()}
                  </div>
                  <div className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground uppercase`}>
                    {dateObj.toLocaleString('default', { month: 'short' })}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} ${isToday ? 'text-primary' : ''}`}>
                      {isToday ? 'Today' : dateObj.toLocaleDateString('default', { weekday: 'long' })}
                    </h3>
                    {isToday && (
                      <Badge variant="default" className="text-xs" data-testid="badge-today">
                        Today
                      </Badge>
                    )}
                    {isPast && !isToday && (
                      <Badge variant="secondary" className="text-xs">
                        Past
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {dayEvents.map((event, eventIndex) => {
                      const eventTime = new Date(event.date);
                      const isEventPast = eventTime < new Date();

                      return (
                        <Card
                          key={event.id}
                          className={`p-3 hover-elevate ${isEventPast && event.completed ? 'opacity-60' : ''}`}
                          data-testid={`calendar-event-${event.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`${compact ? 'text-xs' : 'text-sm'} font-mono text-muted-foreground pt-0.5 ${compact ? 'w-12' : 'w-16'}`}>
                              {eventTime.toLocaleTimeString('default', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false 
                              })}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-1">
                                <PriorityBadge priority={event.priority} showTooltip={!compact} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} truncate`}>
                                      {event.title}
                                    </h4>
                                    {event.completed && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" data-testid={`icon-completed-${event.id}`} />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="text-xs" data-testid={`badge-type-${event.type}`}>
                                      {event.type === 'directive' ? 'Directive' : 'Notice'}
                                    </Badge>
                                    
                                    {event.repeat && event.repeat !== 'none' && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Repeat className="h-3 w-3" />
                                        <span className="capitalize">{event.repeat}</span>
                                      </div>
                                    )}
                                    
                                    {!compact && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatRelativeTime(event.date)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {event.notes && !compact && (
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                      {event.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
