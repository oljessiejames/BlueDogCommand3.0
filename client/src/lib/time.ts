import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';

export function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy • HH:mm');
  } catch {
    return '';
  }
}

export function formatTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  } catch {
    return '';
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

export function getCurrentDateTime(): string {
  return format(new Date(), "EEE, MMM d, yyyy • HH:mm");
}

export function getGreeting(): string {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 1 && hour < 11) {
    return "Zero Dark-Thirty, let's go Commander.";
  } else if (hour >= 11 && hour < 17) {
    return "Halfway to exfil, keep moving.";
  } else {
    return "Nightwatch ready, Commander.";
  }
}

export function getFormattedTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function isPastDue(dateString: string | null): boolean {
  if (!dateString) return false;
  try {
    const date = parseISO(dateString);
    return isBefore(date, new Date());
  } catch {
    return false;
  }
}

export function isUpcoming(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return isAfter(date, new Date());
  } catch {
    return false;
  }
}
