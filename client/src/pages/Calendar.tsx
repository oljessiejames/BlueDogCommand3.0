import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, Calendar as CalendarIcon, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarView } from "@/components/CalendarView";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CalendarEvent } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimeRange = '1' | '3' | '7' | '14' | '30';

const timeRangeOptions = [
  { value: '1' as TimeRange, label: '1 Day' },
  { value: '3' as TimeRange, label: '3 Days' },
  { value: '7' as TimeRange, label: '7 Days' },
  { value: '14' as TimeRange, label: '14 Days' },
  { value: '30' as TimeRange, label: '30 Days' },
];

export default function Calendar() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Calculate date range
  const getDateRange = (days: TimeRange) => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(from);
    to.setDate(to.getDate() + parseInt(days));
    to.setHours(23, 59, 59, 999);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  };

  const { from, to } = getDateRange(timeRange);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events', from, to],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      return response.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/calendar/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to import file');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Import Successful",
        description: `Imported ${data.directives} directives and ${data.notices} notices. ${data.errors.length > 0 ? `${data.errors.length} errors occurred.` : ''}`,
      });
      
      if (data.errors.length > 0) {
        console.error("Import errors:", data.errors);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/directives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const template = `title,date,priority,notes,type,repeat
Review Security Protocols,2024-12-25T14:00:00Z,Alpha,Quarterly security audit,directive,none
Team Meeting,2024-12-26T09:00:00Z,Bravo,Weekly standup,notice,weekly
Equipment Check,2024-12-27T15:00:00Z,Charlie,Routine maintenance,directive,none`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-heading mb-2">Operational Calendar</h1>
            <p className="text-muted-foreground">
              View and manage scheduled directives and notices
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
            <Button
              variant="default"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              data-testid="button-upload-excel"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending ? 'Importing...' : 'Import Excel'}
            </Button>
          </div>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Time Range:</span>
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="w-32" data-testid="select-time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`option-${option.value}-days`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(from).toLocaleDateString()} - {new Date(to).toLocaleDateString()}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <CalendarView events={events} />
      </motion.div>
    </div>
  );
}
