import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  Home,
  LogOut,
  Plus,
  Settings,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const navItems = [
  { label: 'Home', path: '/dashboard', icon: Home },
  { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Bookings', path: '/dashboard/bookings', icon: CalendarDays },
  { label: 'Account', path: '/business/edit', icon: UserRound },
];

const desktopItems = navItems;

export const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { business } = useData();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setCreateOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const go = (path: string) => {
    navigate(path);
    setCreateOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNewAppointment = () => {
    setCreateOpen(false);
    toast({ title: 'This feature is coming soon!' });
  };

  const createSheet = (
    <Sheet open={createOpen} onOpenChange={setCreateOpen}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle>What would you like to create?</SheetTitle>
        </SheetHeader>
        <div className="mt-5 overflow-hidden rounded-2xl border bg-card">
          <button
            className="flex w-full items-center gap-4 border-b px-4 py-4 text-left hover:bg-accent/60"
            onClick={handleNewAppointment}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarPlus className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">New Appointment</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">Book a customer manually</span>
            </span>
          </button>
          <button
            className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-accent/60"
            onClick={() => go('/appointments/create')}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">New Service</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">Add a service to your page</span>
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );

  const sidebar = (
    <aside className="hidden border-r bg-background px-5 py-6 lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b pb-5">
          <p className="text-xs text-muted-foreground">Business</p>
          <h2 className="mt-1 truncate text-lg font-semibold">{business?.name || 'Your business'}</h2>
          {business?.email && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{business.email}</p>
          )}
        </div>

        <nav className="mt-6 space-y-1">
          {desktopItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-accent',
                  isActive(item.path) && 'bg-accent font-medium text-primary',
                )}
                onClick={() => go(item.path)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <Button className="mt-6 h-11 rounded-xl gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create
        </Button>

        <Button
          variant="outline"
          className="mt-auto h-11 justify-start rounded-xl gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className={cn('min-h-screen bg-background', showSidebar && 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)]')}>
      {showSidebar && sidebar}
      <div className="min-w-0">
        <main className="w-full pb-24 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          {navItems.slice(0, 2).map(item => (
            <BottomNavItem
              key={item.path}
              active={isActive(item.path)}
              icon={item.icon}
              label={item.label}
              onClick={() => go(item.path)}
            />
          ))}
          <button
            className="mx-auto -mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-[#6B4EFF] text-white shadow-lg shadow-[#6B4EFF]/30"
            onClick={() => setCreateOpen(true)}
            aria-label="Create"
          >
            <Plus className="h-7 w-7" />
          </button>
          {navItems.slice(2).map(item => (
            <BottomNavItem
              key={item.path}
              active={isActive(item.path)}
              icon={item.icon}
              label={item.label}
              onClick={() => go(item.path)}
            />
          ))}
        </div>
      </nav>

      {createSheet}
    </div>
  );
};

const BottomNavItem = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
}) => (
  <button
    className={cn(
      'flex min-w-0 flex-col items-center gap-1 px-1 text-[11px] text-muted-foreground',
      active && 'font-medium text-[#6B4EFF]',
    )}
    onClick={onClick}
  >
    <Icon className="h-5 w-5" />
    <span className="truncate">{label}</span>
  </button>
);

export default AppLayout;
