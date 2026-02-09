import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, ArrowRight } from 'lucide-react';

const BookingConfirmation = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { appointments, business, addBooking } = useData();

  const state = location.state as { appointmentId: string; date: string; time: string } | null;
  const appointment = appointments.find(a => a.id === state?.appointmentId);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!state || !appointment || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Booking information not found.</p>
      </div>
    );
  }

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const serviceFee = Math.round(appointment.price * 0.05);
  const serviceCharge = business.feeHandling === 'customer' ? serviceFee : 0;
  const total = appointment.price + serviceCharge;

  const handlePay = async () => {
    setLoading(true);
    // TODO: Integrate payment gateway (e.g., Paystack, Flutterwave)
    // TODO: Send confirmation email to client via Firebase Cloud Messaging
    // TODO: Notify business owner about new booking

    const booking = {
      id: crypto.randomUUID(),
      appointmentId: appointment.id,
      businessSlug: slug!,
      clientName: fullName,
      clientEmail: email,
      date: state.date,
      time: state.time,
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
    };

    addBooking(booking);
    setLoading(false);
    navigate(`/booking/${slug}/confirmed`, {
      state: {
        appointmentName: appointment.name,
        date: state.date,
        time: state.time,
        total,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <BackButton />

      <div className="mt-6 space-y-6 flex-1">
        <h1 className="text-xl font-bold">Confirm your booking</h1>

        {/* Booking Summary Card */}
        <div className="border rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">{appointment.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(parseISO(state.date), 'EEEE, d MMMM')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(state.time)}</span>
          </div>
          <p className="text-sm font-medium">₦{appointment.price.toLocaleString()}</p>
        </div>

        {/* Payment Summary */}
        <div className="border rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item</span>
              <span className="text-muted-foreground">Amount</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service fee</span>
              <span>₦{appointment.price.toLocaleString()}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span>Service Charge (5%)</span>
                <span>₦{serviceCharge.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Client Details */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Address</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Pay Securely. Powered by Paystack
        </p>
      </div>

      <Button onClick={handlePay} className="w-full h-12 rounded-full gap-2 mt-6" disabled={!fullName || !email || loading}>
        {loading ? 'Processing...' : `Pay ₦${total.toLocaleString()}`}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default BookingConfirmation;
