import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import ProgressBar from '@/components/shared/ProgressBar';
import { useData } from '@/contexts/DataContext';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DURATION_OPTIONS = [30, 45, 60];
const STEP_LABELS = ['1 easy steps!', 'Almost there!', 'Ready to publish!'];

const CreateAppointment = () => {
  const navigate = useNavigate();
  const { addAppointment, business, businessLinkCreated, setBusinessLinkCreated, appointments } = useData();
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  // Step 2
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const goNext = () => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 200);
  };

  const goBack = () => {
    if (step === 0) { navigate(-1); return; }
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setTransitioning(false);
    }, 200);
  };

  const actualDuration = isCustomDuration ? Number(customDuration) || 30 : duration;

  const handleCreate = () => {
    const newAppointment = {
      id: crypto.randomUUID(),
      businessId: business?.id || '',
      name,
      description,
      price: Number(price) || 0,
      currency: '₦',
      availableDays: selectedDays,
      startTime,
      endTime,
      duration: actualDuration,
      maxBookingsPerSlot: 1,
      messageForClients: message || undefined,
      createdAt: new Date().toISOString(),
    };
    addAppointment(newAppointment);

    const isFirstAppointment = appointments.length === 0;
    if (isFirstAppointment) {
      setBusinessLinkCreated(true);
    }

    navigate(`/appointments/created/${newAppointment.id}`, {
      state: { isFirstAppointment },
    });
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={goBack} />
      </div>

      <ProgressBar currentStep={step} totalSteps={3} labels={STEP_LABELS} />

      <div className={`flex-1 flex flex-col mt-8 transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {step === 0 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <div>
              <h1 className="text-xl font-bold">Create appointment</h1>
              <p className="text-sm text-muted-foreground">Tell others what this service is about</p>
            </div>
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Appointment Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl min-h-[80px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Price</label>
                <p className="text-xs text-muted-foreground">This is the amount clients will pay per session</p>
                <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 15,000" type="number" className="h-12 rounded-xl" />
              </div>
              {!showMessage ? (
                <button
                  onClick={() => setShowMessage(true)}
                  className="w-full text-center py-3 border border-dashed rounded-xl text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
                >
                  Add a message for clients (optional)
                </button>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message for clients</label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} className="rounded-xl" placeholder="Any special instructions..." />
                </div>
              )}
            </div>
            <Button onClick={goNext} className="w-full h-12 rounded-full gap-2" disabled={!name || !price}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <div>
              <h1 className="text-xl font-bold">Availability</h1>
              <p className="text-sm text-muted-foreground">When can clients book this service?</p>
            </div>
            <div className="space-y-6 flex-1">
              <div>
                <p className="text-sm font-semibold mb-3">Available days</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'h-10 w-10 rounded-full text-xs font-medium transition-colors',
                        selectedDays.includes(i)
                          ? 'bg-foreground text-background'
                          : 'border hover:bg-accent'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Working Hours</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Start time</label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">End time</label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-1">Service Duration</p>
                <p className="text-xs text-muted-foreground mb-3">This controls how many bookings you can take per day</p>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => { setDuration(d); setIsCustomDuration(false); }}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        !isCustomDuration && duration === d
                          ? 'bg-foreground text-background'
                          : 'border hover:bg-accent'
                      )}
                    >
                      {d === 60 ? '1 hr' : `${d} Mins`}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsCustomDuration(true)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      isCustomDuration ? 'bg-foreground text-background' : 'border hover:bg-accent'
                    )}
                  >
                    Custom
                  </button>
                </div>
                {isCustomDuration && (
                  <Input
                    type="number"
                    placeholder="Duration in minutes"
                    value={customDuration}
                    onChange={e => setCustomDuration(e.target.value)}
                    className="h-12 rounded-xl mt-3"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 h-12 rounded-full">
                Reset
              </Button>
              <Button onClick={goNext} className="flex-1 h-12 rounded-full gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <div>
              <h1 className="text-xl font-bold">Review booking</h1>
              <p className="text-sm text-muted-foreground">Make sure everything looks right</p>
            </div>
            <div className="border rounded-2xl p-5 space-y-3 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Appointment Name</span>
                <span className="font-medium">{name}</span>
              </div>
              {description && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium text-right max-w-[60%]">{description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">₦{Number(price).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Days</span>
                <span className="font-medium">{selectedDays.map(d => DAYS[d]).join(', ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours</span>
                <span className="font-medium">{startTime} - {endTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max bookings/day</span>
                <span className="font-medium">
                  {(() => {
                    const [sh, sm] = startTime.split(':').map(Number);
                    const [eh, em] = endTime.split(':').map(Number);
                    return Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / actualDuration);
                  })()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 h-12 rounded-full">
                Edit Details
              </Button>
              <Button onClick={handleCreate} className="flex-1 h-12 rounded-full gap-2">
                Create booking <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAppointment;
