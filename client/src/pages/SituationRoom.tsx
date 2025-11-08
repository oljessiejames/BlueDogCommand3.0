import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Bell, ChevronRight, Send, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PriorityBadge } from "@/components/PriorityBadge";
import { sortByPriority } from "@/lib/priority";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import type { Status, Directive, Notice, ChatMessage } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export default function SituationRoom() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: status, isLoading: statusLoading } = useQuery<Status>({
    queryKey: ['/api/status'],
  });

  const { data: activeDirectives = [], isLoading: directivesLoading } = useQuery<Directive[]>({
    queryKey: ['/api/directives', 'status', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/directives?status=active');
      if (!response.ok) throw new Error('Failed to fetch directives');
      return response.json();
    },
  });

  const { data: notices = [], isLoading: noticesLoading } = useQuery<Notice[]>({
    queryKey: ['/api/notices'],
    queryFn: async () => {
      const response = await fetch('/api/notices');
      if (!response.ok) throw new Error('Failed to fetch notices');
      return response.json();
    },
  });

  const isLoading = statusLoading || directivesLoading || noticesLoading;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    let placeholderAdded = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let assistantMessage = "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);
      placeholderAdded = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: assistantMessage,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      
      if (placeholderAdded) {
        // Replace the empty placeholder with error message
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: "Error: Unable to get response. Please try again.",
          };
          return newMessages;
        });
      } else {
        // No placeholder yet, add error message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Error: Unable to get response. Please try again.",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      
      // Refresh data in case AI created directives or notices
      queryClient.invalidateQueries({ queryKey: ['/api/directives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
              <div className="space-y-2 pt-4 border-t mt-4">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Sort directives by priority (Alpha > Bravo > Charlie > Delta > Echo) and get top 5
  const topDirectives = sortByPriority(activeDirectives).slice(0, 5);

  // Get next 5 upcoming notices (sorted by datetime)
  const now = new Date();
  const upcomingNotices = [...notices]
    .filter(notice => new Date(notice.at) >= now)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 5);

  // Calculate completion rate for Command Status section
  const completionRate = status?.directives.total
    ? Math.round((status.directives.completed / status.directives.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <Card 
              className="p-6 hover-elevate cursor-pointer" 
              data-testid="card-kpi-active-directives"
              onClick={() => setLocation('/directives')}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active Directives</p>
                  <p className="text-3xl font-bold font-heading" data-testid="text-kpi-value-active-directives">
                    {status?.directives.active || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Top {topDirectives.length} highest priority
                  </p>
                </div>
                <div className="rounded-md bg-primary/10 p-3">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
              
              {topDirectives.length > 0 ? (
                <div className="space-y-2 border-t pt-4">
                  {topDirectives.map((directive) => (
                    <div 
                      key={directive.id} 
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                      data-testid={`directive-preview-${directive.id}`}
                    >
                      <PriorityBadge priority={directive.priority} showTooltip={false} className="shrink-0" />
                      <span className="text-sm flex-1 truncate">{directive.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border-t">
                  No active directives
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card 
              className="p-6 hover-elevate cursor-pointer" 
              data-testid="card-kpi-op-notices"
              onClick={() => setLocation('/notices')}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Op Notices</p>
                  <p className="text-3xl font-bold font-heading" data-testid="text-kpi-value-op-notices">
                    {upcomingNotices.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Next {upcomingNotices.length} upcoming
                  </p>
                </div>
                <div className="rounded-md bg-primary/10 p-3">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
              </div>
              
              {upcomingNotices.length > 0 ? (
                <div className="space-y-2 border-t pt-4">
                  {upcomingNotices.map((notice) => (
                    <div 
                      key={notice.id} 
                      className="flex items-start gap-3 p-2 rounded-md hover-elevate"
                      data-testid={`notice-preview-${notice.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{notice.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatRelativeTime(notice.at)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border-t">
                  No upcoming notices
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold font-heading mb-4">Command Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">Operational Status</p>
                <p className="text-xs text-muted-foreground">All systems nominal</p>
              </div>
              <div className="px-3 py-1 rounded-md bg-chart-3/10 text-chart-3 text-xs font-mono">
                ACTIVE
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">Mission Readiness</p>
                <p className="text-xs text-muted-foreground">
                  {status?.directives.active || 0} active directive{status?.directives.active !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono">
                {completionRate}%
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Alert Level</p>
                <p className="text-xs text-muted-foreground">
                  {status?.notices.upcomingCount || 0} scheduled notice{status?.notices.upcomingCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="px-3 py-1 rounded-md bg-chart-2/10 text-chart-2 text-xs font-mono">
                NORMAL
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold font-heading">Tactical AI Assistant</h3>
          </div>
          
          <div className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-[360px] text-center">
                    <div className="space-y-2">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Ask the tactical AI for assistance with mission planning,<br />
                        directive prioritization, or operational insights.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`chat-message-${message.role}-${index}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-md p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-mono mb-1 opacity-70">
                              {message.role === "user" ? "OPERATOR" : "TACTICAL AI"}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Input
                type="text"
                placeholder="Enter your tactical query..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isStreaming}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isStreaming}
                size="icon"
                data-testid="button-send-chat"
              >
                {isStreaming ? (
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
