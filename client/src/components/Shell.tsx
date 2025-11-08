import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Bell, ListChecks, LayoutDashboard, Calendar, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getGreeting, getFormattedTime } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DirectiveForm } from "./DirectiveForm";
import { NoticeForm } from "./NoticeForm";

const navItems = [
  {
    title: "Situation Room",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Directives",
    path: "/directives",
    icon: ListChecks,
  },
  {
    title: "Op Notices",
    path: "/notices",
    icon: Bell,
  },
  {
    title: "Calendar",
    path: "/calendar",
    icon: Calendar,
  },
  {
    title: "Resupply",
    path: "/resupply",
    icon: ShoppingCart,
  },
];

interface ShellProps {
  children: React.ReactNode;
  onCreateDirective?: (data: any) => void;
  onCreateNotice?: (data: any) => void;
  isCreatingDirective?: boolean;
  isCreatingNotice?: boolean;
}

export function Shell({ children, onCreateDirective, onCreateNotice, isCreatingDirective, isCreatingNotice }: ShellProps) {
  const [location] = useLocation();
  const [currentTime, setCurrentTime] = useState(getFormattedTime());
  const [greeting, setGreeting] = useState(getGreeting());
  const [directiveDialogOpen, setDirectiveDialogOpen] = useState(false);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);

  const currentRoute = navItems.find(item => item.path === location) || navItems[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getFormattedTime());
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <div className="px-4 py-6">
                <h1 className="text-xl font-bold font-heading text-primary" data-testid="text-app-title">
                  BLUE DOG COMMAND
                </h1>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.path} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b px-6 py-4 bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h2 className="text-2xl font-bold font-heading" data-testid="text-page-title">
                  {currentRoute.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-center">
                <p className="text-sm font-medium font-heading" data-testid="text-greeting">
                  {greeting}
                </p>
                <p className="text-xs text-muted-foreground font-mono" data-testid="text-current-time">
                  {currentTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDirectiveDialogOpen(true)}
                data-testid="button-add-directive"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Directive</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNoticeDialogOpen(true)}
                data-testid="button-add-notice"
              >
                <Bell className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Notice</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>

      <Dialog open={directiveDialogOpen} onOpenChange={setDirectiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Directive</DialogTitle>
            <DialogDescription>
              Add a new task or directive to track mission objectives
            </DialogDescription>
          </DialogHeader>
          {onCreateDirective && (
            <DirectiveForm
              onSubmit={(data) => {
                onCreateDirective(data);
                setDirectiveDialogOpen(false);
              }}
              onCancel={() => setDirectiveDialogOpen(false)}
              isPending={isCreatingDirective}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Op Notice</DialogTitle>
            <DialogDescription>
              Schedule a new operational notice or reminder
            </DialogDescription>
          </DialogHeader>
          {onCreateNotice && (
            <NoticeForm
              onSubmit={(data) => {
                onCreateNotice(data);
                setNoticeDialogOpen(false);
              }}
              onCancel={() => setNoticeDialogOpen(false)}
              isPending={isCreatingNotice}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
