import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

const PAID_BOOKING_STATUSES = ['confirmed', 'completed'];

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const SidebarButton = ({
  icon,
  label,
  onClick,
  active,
  collapsed,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  collapsed?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full rounded-xl px-3 py-2 text-left text-sm transition-colors',
      'hover:bg-accent',
      active && 'bg-accent font-medium',
      collapsed && 'flex justify-center px-0',
    )}
    title={collapsed ? label : undefined}
  >
    <div className="flex items-center gap-3">
      {icon}
      {!collapsed && label}
    </div>
  </button>
);

export const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { appointments, bookings, business } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const today = new Date().toISOString().slice(0, 10);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const go = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b pb-5">
        <div className="flex items-start justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Business</p>
              <h2 className="mt-1 truncate text-lg font-semibold">
                {business?.name || 'Your business'}
              </h2>
              {business?.email && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{business.email}</p>
              )}
            </div>
          )}
          <button
            className="hidden rounded-full border p-2 hover:bg-accent lg:block"
            onClick={() => setCollapsed(value => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        <SidebarButton
          collapsed={collapsed}
          icon={<Home className="h-4 w-4" />}
          active={location.pathname === '/dashboard'}
          label="Overview"
          onClick={() => go('/dashboard')}
        />
        <SidebarButton
          collapsed={collapsed}
          icon={<CalendarDays className="h-4 w-4" />}
          active={location.pathname === '/dashboard/bookings'}
          label="Bookings"
          onClick={() => go('/dashboard/bookings')}
        />
        <SidebarButton
          collapsed={collapsed}
          icon={<Settings className="h-4 w-4" />}
          active={location.pathname === '/business/edit'}
          label="Business settings"
          onClick={() => go('/business/edit')}
        />
      </nav>

      <div className="mt-6">
        <div className={cn('mb-2 flex items-center gap-2 px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Services
            </p>
          )}
          <button
            className="rounded-full border p-1.5 hover:bg-accent"
            onClick={() => go('/appointments/create')}
            aria-label="Add service"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-1">
            {appointments.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No services yet.</p>
            ) : (
              appointments.slice(0, 8).map(appointment => {
                const bookingCount = bookings.filter(
                  booking =>
                    booking.appointmentId === appointment.id &&
                    booking.date === today &&
                    PAID_BOOKING_STATUSES.includes(booking.status),
                ).length;

                return (
                  <button
                    key={appointment.id}
                    className={cn(
                      'w-full rounded-xl px-3 py-2 text-left hover:bg-accent',
                      location.pathname === `/dashboard/appointment/${appointment.id}` && 'bg-accent',
                    )}
                    onClick={() => go(`/dashboard/appointment/${appointment.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{appointment.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{bookingCount}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {appointment.paused ? 'Paused' : 'Active'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <Button
          variant="outline"
          className={cn('w-full rounded-full gap-2', collapsed ? 'justify-center px-0' : 'justify-start')}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Log out'}
        </Button>
      </div>
    </div>
  );

  if (!showSidebar) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{business?.name || 'Menu'}</p>
          </div>
          <Sheet
            open={mobileOpen}
            onOpenChange={open => setMobileOpen(open)}
          >
            <SheetTrigger asChild>
              <button className="rounded-full border p-2 hover:bg-accent" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 h-[calc(100%-3rem)]">{sidebar}</div>
            </SheetContent>
          </Sheet>
        </div>
        <main className="w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen lg:grid', collapsed ? 'lg:grid-cols-[84px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]')}>
      <aside className="hidden border-r bg-background px-5 py-6 lg:block">
        {sidebar}
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{business?.name || 'Dashboard'}</p>
          </div>
          <Sheet
            open={mobileOpen}
            onOpenChange={open => {
              setMobileOpen(open);
              if (open) setCollapsed(false);
            }}
          >
            <SheetTrigger asChild>
              <button className="rounded-full border p-2 hover:bg-accent" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 h-[calc(100%-3rem)]">{sidebar}</div>
            </SheetContent>
          </Sheet>
        </div>
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
