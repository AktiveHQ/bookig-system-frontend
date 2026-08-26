import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import type { Appointment } from '@/types';

const ServicesList = () => {
  const navigate = useNavigate();
  const { appointments } = useData();

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Services</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage what you offer</p>
          </div>
          <Button
            className="h-10 shrink-0 rounded-full gap-2"
            onClick={() => navigate('/appointments/create')}
          >
            <Plus className="h-4 w-4" />
            New Service
          </Button>
        </header>

        {appointments.length === 0 ? (
          <section className="rounded-2xl border border-dashed bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BriefcaseBusiness className="h-6 w-6" />
            </div>
            <p className="mt-4 font-semibold">No services yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Add the first service customers can book from your public page.
            </p>
            <Button
              className="mt-5 h-11 rounded-xl gap-2"
              onClick={() => navigate('/appointments/create')}
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border bg-card">
            {appointments.map(appointment => (
              <ServiceRow
                key={appointment.id}
                appointment={appointment}
                onClick={() => navigate(`/dashboard/appointment/${appointment.id}`)}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

const ServiceRow = ({
  appointment,
  onClick,
}: {
  appointment: Appointment;
  onClick: () => void;
}) => (
  <button
    className="flex w-full items-center justify-between gap-3 border-b px-4 py-4 text-left last:border-b-0 hover:bg-accent/60"
    onClick={onClick}
  >
    <span className="min-w-0">
      <span className="block truncate font-semibold">{appointment.name}</span>
      <span className="mt-0.5 block text-sm text-muted-foreground">
        {appointment.duration} mins
        {appointment.paused ? ' | Paused' : ''}
      </span>
    </span>
    <span className="flex shrink-0 items-center gap-2 font-semibold">
      {formatCurrency(appointment.price)}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </span>
  </button>
);

const formatCurrency = (value: number) =>
  `NGN ${Number(value || 0).toLocaleString('en-NG')}`;

export default ServicesList;
