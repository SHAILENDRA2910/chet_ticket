import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { relativeTime, slaInfo } from "@/lib/chetak/format";
import { useTicketStore } from "@/lib/chetak/store";
import {
  BarChart3,
  ChevronsUpDown,
  Clock,
  Inbox,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  ShieldAlert,
  Ticket as TicketIcon,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import { ChetakLogo, InitialsAvatar, StatusBadge } from "./primitives";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/** Local magnifier glyph so the `Search` name stays reserved for the dialog. */
function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m16 16 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Navigation model                                                            */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Tickets", to: "/tickets", icon: TicketIcon, end: true },
  { label: "Create Ticket", to: "/tickets/new", icon: Plus, end: true },
  { label: "Reports", to: "/reports", icon: BarChart3, end: true },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tickets": "Tickets",
  "/tickets/new": "Create Ticket",
  "/reports": "Reports",
};

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                     */
/* -------------------------------------------------------------------------- */

function ChetakSidebar() {
  const { currentExecutive, stats, tickets, resetDemo } = useTicketStore();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [resetOpen, setResetOpen] = useState(false);

  const pending = tickets.filter((ticket) => ticket.status === "Pending").length;
  const myOpen = tickets.filter(
    (ticket) =>
      ticket.executive.name === currentExecutive.name &&
      ticket.status !== "Resolved" &&
      ticket.status !== "Closed",
  ).length;
  const activeView = new URLSearchParams(search).get("view");

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  const badgeFor: Record<string, number | undefined> = {
    "/dashboard": stats.needsAction,
    "/tickets": stats.open,
  };

  const queues = [
    {
      label: "My tickets",
      view: "mine",
      to: "/tickets?view=mine",
      count: myOpen,
      icon: Inbox,
    },
    {
      label: "Pending",
      view: "pending",
      to: "/tickets?view=pending",
      count: pending,
      icon: Clock,
    },
    {
      label: "SLA at risk",
      view: "risk",
      to: "/tickets?view=risk",
      count: stats.slaAtRisk,
      icon: ShieldAlert,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Chetak Service · Ticket Executive"
              className="text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:text-sidebar-foreground"
            >
              <NavLink to="/dashboard">
                <ChetakLogo className="size-9" />
                <span className="grid min-w-0 flex-1 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-white">
                    Chetak Service
                  </span>
                  <span className="mt-1.5 truncate text-[9px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/55">
                    Ticket Executive
                  </span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-sidebar-border" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.to === "/tickets"
                  ? pathname === "/tickets" ||
                    (pathname.startsWith("/tickets/") && pathname !== "/tickets/new")
                  : pathname === item.to;
                const count = badgeFor[item.to];
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-9 gap-3 text-[13px] text-sidebar-foreground/75 transition-colors data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-brand data-[active=true]:shadow-[0_1px_3px_rgba(10,8,24,0.28)]"
                    >
                      <NavLink to={item.to} end={item.end}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {count ? (
                      <SidebarMenuBadge className="text-[10px] font-semibold tabular-nums text-sidebar-foreground/60 peer-hover/menu-button:text-brand peer-data-[active=true]/menu-button:text-brand">
                        {count}
                      </SidebarMenuBadge>
                    ) : null}
                    {isActive ? (
                      <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-aqua group-data-[collapsible=icon]:hidden" />
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
            Queues
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {queues.map((queue) => (
                <SidebarMenuItem key={queue.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeView === queue.view}
                    tooltip={queue.label}
                    className="h-8 gap-3 text-[13px] text-sidebar-foreground/70 transition-colors data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-brand"
                  >
                    <NavLink to={queue.to}>
                      <queue.icon className="size-4" />
                      <span>{queue.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-[10px] font-semibold tabular-nums text-sidebar-foreground/55 peer-hover/menu-button:text-brand peer-data-[active=true]/menu-button:text-brand">
                    {queue.count}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="mx-1 rounded-xl border border-sidebar-border bg-white/[0.06] p-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
                  SLA compliance
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-aqua">
                  {stats.slaCompliance}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-aqua"
                  style={{ width: `${stats.slaCompliance}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-sidebar-foreground/50">
                {stats.open} open · {stats.slaAtRisk} at risk
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="bg-sidebar-border" />

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={currentExecutive.name}
                  className="text-sidebar-foreground data-[state=open]:bg-white/15 data-[state=open]:text-white"
                >
                  <InitialsAvatar
                    name={currentExecutive.name}
                    className="size-8 bg-aqua text-[#1e1839]"
                  />
                  <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-[13px] font-semibold text-white">
                      {currentExecutive.name}
                    </span>
                    <span className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
                      {currentExecutive.code}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="right"
                className="w-60"
                sideOffset={8}
              >
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-semibold text-ink">
                    {currentExecutive.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {user?.email ?? "Ticket Executive · Chetak Service"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard")}
                  className="cursor-pointer"
                >
                  <UserCircle2 className="mr-2 size-4" />
                  My workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/reports")}
                  className="cursor-pointer"
                >
                  <BarChart3 className="mr-2 size-4" />
                  Reports
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 size-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setResetOpen(true)}
                  className="cursor-pointer"
                >
                  <RotateCcw className="mr-2 size-4" />
                  Reset demo data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              This removes tickets and changes created during this session —
              including imported tickets, added issues, attachments, notes and
              status changes — and restores the original seeded demo dataset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemo();
                toast.success("Demo data restored to its original state.");
              }}
              className="h-10 rounded-full bg-critical text-ivory hover:bg-critical/90"
            >
              Reset demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

/* -------------------------------------------------------------------------- */
/* Context nav                                                                 */
/* -------------------------------------------------------------------------- */

export interface ContextNavItem {
  id: string;
  label: string;
  count?: number;
}

export function ContextNav({
  items,
  value,
  onChange,
  className,
}: {
  items: ContextNavItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "relative shrink-0 px-3.5 py-3 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-muted-foreground hover:text-ink",
            )}
          >
            <span className="flex items-center gap-2">
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    active ? "bg-teal-soft text-teal" : "bg-sand text-steel",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </span>
            {active ? (
              <span className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-teal" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export function Search({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tickets } = useTicketStore();
  const navigate = useNavigate();

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search tickets"
      description="Find a ticket by number, customer, vehicle or issue."
    >
      <CommandInput placeholder="Search tickets, customers, vehicle numbers…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matching tickets.</CommandEmpty>
        <CommandGroup heading="Tickets">
          {tickets.slice(0, 8).map((ticket) => (
            <CommandItem
              key={ticket.id}
              value={`${ticket.id} ${ticket.subject} ${ticket.customer.name} ${ticket.vehicle.registrationNo}`}
              onSelect={() => go(`/tickets/${ticket.id}`)}
              className="flex items-center gap-3"
            >
              <span className="font-semibold tabular-nums">{ticket.id}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {ticket.subject}
              </span>
              <StatusBadge status={ticket.status} />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.to} onSelect={() => go(item.to)}>
              <item.icon className="mr-2 size-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

export function NotificationPanel() {
  const { tickets, now } = useTicketStore();
  const navigate = useNavigate();

  const alerts = useMemo(
    () =>
      tickets
        .filter((ticket) => {
          if (ticket.status === "Resolved" || ticket.status === "Closed") return false;
          const state = slaInfo(ticket, now).state;
          return state === "at-risk" || state === "breached" || ticket.status === "New";
        })
        .sort((a, b) => a.slaDueAt - b.slaDueAt)
        .slice(0, 5),
    [tickets, now],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-ink"
        >
          <span className="sr-only">Notifications</span>
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden="true">
            <path
              d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 19a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {alerts.length ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-critical ring-2 ring-card" />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-ink">Needs attention</p>
          <span className="text-[11px] font-medium text-muted-foreground">
            {alerts.length} alert{alerts.length === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {alerts.map((ticket) => {
            const sla = slaInfo(ticket, now);
            return (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="flex w-full flex-col gap-2 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-sand/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold tabular-nums text-ink">
                      {ticket.id}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        sla.state === "breached" ? "text-critical" : "text-warning",
                      )}
                    >
                      {sla.state === "breached" ? "SLA breached" : `${sla.value} left`}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                    {ticket.subject}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <StatusBadge status={ticket.status} />
                    <span>{relativeTime(ticket.updatedAt, now)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {!alerts.length ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing at risk. The queue is under control.
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                       */
/* -------------------------------------------------------------------------- */

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { pathname } = useLocation();
  const label =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/tickets/") ? "Ticket Details" : "Ticket Executive");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <SidebarTrigger className="size-8 text-ink" />
      <span className="hidden h-6 w-px bg-border sm:block" />
      <div className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Chetak Service
        </span>
        <span className="truncate text-[14px] font-semibold text-ink">{label}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground shadow-[0_1px_2px_rgba(30,24,57,0.05)] transition-colors hover:border-brand/25 hover:text-ink md:flex"
        >
          <MagnifierIcon className="size-4" />
          <span className="pr-6">Search tickets</span>
          <kbd className="rounded border border-border bg-sand px-1.5 py-0.5 font-sans text-[10px] font-semibold text-steel">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-ink md:hidden"
        >
          <MagnifierIcon className="size-[18px]" />
        </button>
        <NotificationPanel />
      </div>
    </header>
  );
}

export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { tickets, currentExecutive } = useTicketStore();
  const year = new Date().getFullYear();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SidebarProvider>
      <ChetakSidebar />
      <SidebarInset>
        <Topbar onOpenSearch={() => setSearchOpen(true)} />
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
        <footer className="mt-auto border-t border-border">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>
              Chetak Service · Ticket Executive workspace — frontend experience
              demonstration.
            </span>
            <span className="tabular-nums">
              {tickets.length} tickets in scope · {currentExecutive.code} · ©{" "}
              {year} demo data
            </span>
          </div>
        </footer>
      </SidebarInset>
      <Search open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
