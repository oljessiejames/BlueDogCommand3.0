import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/Shell";
import SituationRoom from "@/pages/SituationRoom";
import Directives from "@/pages/Directives";
import OpNotices from "@/pages/OpNotices";
import Calendar from "@/pages/Calendar";
import NotFound from "@/pages/not-found";
import type { InsertDirective, InsertNotice } from "@shared/schema";

function Router() {
  const createDirectiveMutation = useMutation({
    mutationFn: async (data: InsertDirective) =>
      apiRequest("POST", "/api/directives", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/directives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
    },
  });

  const createNoticeMutation = useMutation({
    mutationFn: async (data: InsertNotice) =>
      apiRequest("POST", "/api/notices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
    },
  });

  return (
    <Shell
      onCreateDirective={(data) => createDirectiveMutation.mutate(data)}
      onCreateNotice={(data) => createNoticeMutation.mutate(data)}
      isCreatingDirective={createDirectiveMutation.isPending}
      isCreatingNotice={createNoticeMutation.isPending}
    >
      <Switch>
        <Route path="/" component={SituationRoom} />
        <Route path="/directives" component={Directives} />
        <Route path="/notices" component={OpNotices} />
        <Route path="/calendar" component={Calendar} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  // Enable dark mode by default for tactical military theme
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
