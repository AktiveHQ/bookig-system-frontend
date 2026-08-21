import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BankSelect from '@/components/shared/BankSelect';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import ProgressBar from '@/components/shared/ProgressBar';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Check, Copy, ExternalLink, Loader2, Share2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import WelcomeBackNote from '@/components/shared/WelcomeBackNote';
import type { Business } from '@/types';

const STEP_LABELS = ['Business', 'Location', 'Payments', 'Service', 'Live'];
const SETUP_DRAFT_KEY = 'akhq:businessSetupDraft';
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).trim().replace(/\/$/, '');
const PUBLIC_BASE = (
  import.meta.env.VITE_PUBLIC_BASE_URL || import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin
).trim().replace(/\/$/, '');

const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

const DAYS = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 },
];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

const inputClassName = 'h-12 rounded-xl';
const primaryButtonClassName = 'h-12 rounded-2xl border-0 bg-[#020c1a] hover:bg-[#06162b]';

const RequiredLabel = ({ children }: { children: string }) => (
  <label className="text-sm font-medium">
    {children} <span className="text-destructive">*</span>
  </label>
);

const HelperCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-2xl border bg-accent/45 p-4">
    <p className="text-sm font-bold">{title}</p>
    <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
  </div>
);

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    const message = data?.message || data?.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    // Use fallback.
  }
  return fallback;
};

const makeSlug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'booking';

const formatCurrency = (value: number) => `NGN ${Number(value || 0).toLocaleString('en-NG')}`;

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { business, setBusiness, setHasSetupComplete, addAppointment } = useData();
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [paymentsReady, setPaymentsReady] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [country] = useState('Nigeria');
  const [state, setState] = useState('Lagos');
  const [address, setAddress] = useState('');
  const [bookingImage, setBookingImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feeHandling, setFeeHandling] = useState<Business['feeHandling']>('customer');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [saving, setSaving] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [duration, setDuration] = useState(45);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const bookingSlug = useMemo(() => business?.slug || makeSlug(name), [business?.slug, name]);
  const bookingLink = `${PUBLIC_BASE}/booking/${bookingSlug}`;

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(SETUP_DRAFT_KEY);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      const restoredStep = Number.isInteger(draft.step)
        ? Math.min(Math.max(Number(draft.step), 0), 3)
        : 0;
      setStep(restoredStep);
      setName(String(draft.name ?? ''));
      setDescription(String(draft.description ?? ''));
      setState(String(draft.state ?? draft.city ?? 'Lagos'));
      setAddress(String(draft.address ?? ''));
      setBookingImage(String(draft.bookingImage ?? ''));
      setFeeHandling(draft.feeHandling === 'business' ? 'business' : 'customer');
      setAccountHolder(String(draft.accountHolder ?? ''));
      setBankName(String(draft.bankName ?? ''));
      setBankCode(String(draft.bankCode ?? ''));
      setAccountNumber(String(draft.accountNumber ?? ''));
      setServiceName(String(draft.serviceName ?? ''));
      setServicePrice(String(draft.servicePrice ?? ''));
      setDuration(Number(draft.duration ?? 45));
      setSelectedDays(Array.isArray(draft.selectedDays) ? draft.selectedDays.map(Number) : [1, 2, 3, 4, 5, 6]);
      setStartTime(String(draft.startTime ?? '09:00'));
      setEndTime(String(draft.endTime ?? '18:00'));
      toast({
        title: 'Draft restored',
        description: 'Your saved setup progress has been loaded.',
      });
    } catch (error) {
      console.error('[BusinessSetup] Failed to load setup draft:', error);
    }
  }, []);

  const createBusinessPayload = (): Business => ({
    id: business?.id || crypto.randomUUID(),
    name,
    description,
    businessDescription: description,
    country,
    city: state,
    address,
    email: business?.email || user?.email || 'hello@example.com',
    phone: business?.phone,
    headerImageUrl: bookingImage || null,
    feeHandling,
    accountHolderName: accountHolder,
    bankName,
    bankCode,
    accountNumber,
    slug: bookingSlug,
  });

  const saveSetupDraft = () => {
    const draft = {
      step,
      name,
      description,
      country,
      state,
      address,
      bookingImage,
      feeHandling,
      accountHolder,
      bankName,
      bankCode,
      accountNumber,
      serviceName,
      servicePrice,
      duration,
      selectedDays,
      startTime,
      endTime,
    };

    try {
      localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft));
      toast({
        title: 'Setup saved',
        description: 'You can come back later and continue from this device.',
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('[BusinessSetup] Failed to save setup draft:', error);
      toast({
        title: 'Could not save setup',
        description: 'Your browser could not store this draft. Try removing large uploads and save again.',
        variant: 'destructive',
      });
    }
  };

  const handleBankInputChange = useCallback(() => {
    setBankCode('');
    setAccountHolder('');
  }, []);

  const handleBankSelect = useCallback((bank: { code: string }) => {
    setBankCode(bank.code);
  }, []);

  useEffect(() => {
    const normalizedAccountNumber = accountNumber.replace(/\D/g, '');
    if (!bankCode || normalizedAccountNumber.length !== 10) {
      setResolvingAccount(false);
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setResolvingAccount(true);
      setAccountHolder('');
      try {
        const response = await fetch(
          `${API_BASE}/public/paystack/resolve-account?accountNumber=${encodeURIComponent(normalizedAccountNumber)}&bankCode=${encodeURIComponent(bankCode)}`,
        );

        if (!response.ok) {
          throw new Error(await getResponseErrorMessage(response, 'Unable to verify account number'));
        }

        const data = await response.json();
        if (isActive && data?.accountName) {
          setAccountHolder(String(data.accountName));
        }
      } catch (error) {
        console.error('[BusinessSetup] Failed to verify account:', error);
        if (isActive) {
          toast({
            title: 'Account verification failed',
            description: error instanceof Error ? error.message : 'Check the bank and account number, then try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isActive) {
          setResolvingAccount(false);
        }
      }
    }, 500);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [accountNumber, bankCode]);

  const goNext = () => {
    setTransitioning(true);
    window.setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 180);
  };

  const goBack = () => {
    if (step === 0) return;
    setTransitioning(true);
    window.setTimeout(() => {
      setStep(s => s - 1);
      setTransitioning(false);
    }, 180);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }

    const maxSizeInBytes = 3 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast({ title: 'Image too large', description: 'Please use an image smaller than 3MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setBookingImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePayments = async () => {
    setSaving(true);
    const result = await setBusiness(createBusinessPayload());
    setSaving(false);

    if (!result.ok) {
      toast({
        title: 'Setup failed',
        description: result.message || 'We could not save your business profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentsReady(true);
    goNext();
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => (prev.includes(day) ? prev.filter(value => value !== day) : [...prev, day]));
  };

  const handleCreateService = () => {
    const price = Number(servicePrice.replace(/,/g, '')) || 0;
    addAppointment({
      id: crypto.randomUUID(),
      businessId: business?.id || '',
      name: serviceName,
      description: '',
      price,
      currency: 'NGN',
      availableDays: selectedDays,
      startTime,
      endTime,
      duration,
      maxBookingsPerSlot: 1,
      createdAt: new Date().toISOString(),
    });
    setHasSetupComplete(true);
    try {
      localStorage.removeItem(SETUP_DRAFT_KEY);
    } catch {
      // ignore
    }
    toast({
      title: 'You are live',
      description: 'Your first service has been created.',
    });
    goNext();
  };

  const copyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast({ title: 'Booking link copied' });
    } catch {
      toast({ title: 'Could not copy link', description: bookingLink, variant: 'destructive' });
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Book ${name || 'my business'} here: ${bookingLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const renderBusinessStep = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Your Business</h1>
        <p className="mt-1 text-sm text-muted-foreground">This is what customers will see when they book with you.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <RequiredLabel>Business name</RequiredLabel>
          <Input value={name} onChange={e => setName(e.target.value)} className={inputClassName} required />
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Business description</RequiredLabel>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[92px] rounded-xl" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Business photo/logo - optional</label>
          <div
            className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors hover:bg-accent/50"
            onClick={() => fileInputRef.current?.click()}
          >
            {bookingImage ? (
              <img src={bookingImage} alt="Business preview" className="h-20 w-20 rounded-xl border object-cover" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <p className="text-center text-sm text-muted-foreground">
              {bookingImage ? 'Tap to change image' : 'Upload business photo or logo'}
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
      </div>

      <HelperCard title="Make it yours">
        Your business details help customers recognize and understand who they're booking with.
      </HelperCard>

      <Button onClick={goNext} className={`w-full gap-2 ${primaryButtonClassName}`} disabled={!name.trim() || !description.trim()}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderLocationStep = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Where can customers find you?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add the location customers should see when booking.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <RequiredLabel>Country</RequiredLabel>
          <Input value={country} disabled className={inputClassName} required />
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>State</RequiredLabel>
          <select value={state} onChange={e => setState(e.target.value)} className={`${inputClassName} w-full border bg-background px-3 text-sm`}>
            {NIGERIAN_STATES.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Business address</RequiredLabel>
          <Input value={address} onChange={e => setAddress(e.target.value)} className={inputClassName} required />
        </div>
      </div>

      <HelperCard title="Help customers find you easily">
        Your location appears with your booking details so customers know where they're going.
      </HelperCard>

      <Button onClick={goNext} className={`w-full gap-2 ${primaryButtonClassName}`} disabled={!state || !address.trim()}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderPaymentsStep = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Where should we send your earnings?</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <RequiredLabel>Bank</RequiredLabel>
          <BankSelect
            value={bankName}
            onChange={setBankName}
            onBankInputChange={handleBankInputChange}
            onBankSelect={handleBankSelect}
          />
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Account number</RequiredLabel>
          <Input
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className={inputClassName}
            inputMode="numeric"
            maxLength={10}
            required
          />
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Verified account name</RequiredLabel>
          <Input value={resolvingAccount ? 'Verifying account name...' : accountHolder} className={inputClassName} readOnly required />
          {accountHolder && !resolvingAccount && (
            <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <Check className="h-4 w-4" /> {accountHolder}
            </p>
          )}
        </div>
      </div>

      {accountHolder && (
        <div className="space-y-3">
          <p className="text-sm font-bold">Who pays the 5% service fee?</p>
          <button
            type="button"
            className={`w-full rounded-2xl border p-4 text-left ${feeHandling === 'customer' ? 'border-[#020c1a] bg-[#020c1a] text-white' : 'bg-card'}`}
            onClick={() => setFeeHandling('customer')}
          >
            <span className="block text-sm font-semibold">Customer pays fee</span>
            <span className={`mt-1 block text-xs ${feeHandling === 'customer' ? 'text-white/75' : 'text-muted-foreground'}`}>
              The fee is added on top of the booking amount.
            </span>
          </button>
          <button
            type="button"
            className={`w-full rounded-2xl border p-4 text-left ${feeHandling === 'business' ? 'border-[#020c1a] bg-[#020c1a] text-white' : 'bg-card'}`}
            onClick={() => setFeeHandling('business')}
          >
            <span className="block text-sm font-semibold">I pay fee</span>
            <span className={`mt-1 block text-xs ${feeHandling === 'business' ? 'text-white/75' : 'text-muted-foreground'}`}>
              The fee is deducted from your earnings.
            </span>
          </button>
        </div>
      )}

      <HelperCard title="Get paid automatically">
        Track what you've earned and what is still pending. Your earnings are currently settled to your bank account on the next working day.
        You'll also be able to see your earnings, payout history and pending settlements from your dashboard.
      </HelperCard>

      <Button
        onClick={handleSavePayments}
        className={`w-full gap-2 ${primaryButtonClassName}`}
        disabled={!bankCode || !accountHolder || accountNumber.length !== 10 || resolvingAccount || saving}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Save & Continue <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );

  const renderServiceStep = () => (
    <div className="space-y-5">
      {paymentsReady && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700">
            <Check className="h-4 w-4" /> Payments ready
          </p>
          <p className="mt-3 text-xl font-black leading-tight">You're 80% ready to receive bookings.</p>
          <p className="mt-2 text-sm text-muted-foreground">Now let's create something customers can book.</p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">What can customers book?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your first service. You can add more anytime.</p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-bold">Service</p>
        <div className="space-y-1.5">
          <RequiredLabel>Service name</RequiredLabel>
          <Input value={serviceName} onChange={e => setServiceName(e.target.value)} className={inputClassName} />
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Price</RequiredLabel>
          <div className="flex h-12 items-center rounded-xl border bg-background px-3">
            <span className="mr-2 text-sm font-semibold">NGN</span>
            <input
              value={servicePrice}
              onChange={e => setServicePrice(e.target.value.replace(/[^\d,]/g, ''))}
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Duration</RequiredLabel>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))} className={`${inputClassName} w-full border bg-background px-3 text-sm`}>
            {DURATION_OPTIONS.map(item => (
              <option key={item} value={item}>{item} minutes</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-bold">Availability</p>
        <p className="text-sm text-muted-foreground">When are you available?</p>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => (
            <button
              key={`${day.label}-${day.value}`}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`flex h-12 flex-col items-center justify-center rounded-full text-xs font-bold ${
                selectedDays.includes(day.value) ? 'bg-[#020c1a] text-white' : 'border bg-card text-muted-foreground'
              }`}
            >
              <span>{day.label}</span>
              <span className="text-lg leading-none">●</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <RequiredLabel>From</RequiredLabel>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClassName} />
          </div>
          <div className="space-y-1.5">
            <RequiredLabel>To</RequiredLabel>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClassName} />
          </div>
        </div>
      </div>

      <HelperCard title="No more booking back-and-forth">
        Customers only see available times. Once a slot is booked, your availability updates automatically.
        Your services also power your earnings and booking reports, helping you see what's performing best.
      </HelperCard>

      <Button
        onClick={handleCreateService}
        className={`w-full gap-2 ${primaryButtonClassName}`}
        disabled={!serviceName.trim() || !Number(servicePrice.replace(/,/g, '')) || selectedDays.length === 0}
      >
        Create Service <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderLiveStep = () => {
    const serviceAmount = Number(servicePrice.replace(/,/g, '')) || 0;

    return (
      <div className="space-y-6 text-center">
        <div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-3xl font-black">You're ready!</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Your business is now ready to receive bookings.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 text-left shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-accent">
            {bookingImage ? (
              <img src={bookingImage} alt={`${name} logo`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-black">{name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-lg font-bold">{name}</p>
            <p className="text-sm text-muted-foreground">{state}, Nigeria</p>
          </div>
          <div className="mt-5 border-t pt-4">
            <p className="font-semibold">{serviceName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(serviceAmount)} · {duration} mins</p>
            <Button className={`mt-4 w-full ${primaryButtonClassName}`}>Book Now</Button>
          </div>
        </div>

        <div className="space-y-3 text-left">
          <p className="text-sm font-bold">Your booking link</p>
          <p className="rounded-xl bg-muted px-3 py-3 text-sm font-semibold text-[#020c1a]">{bookingLink}</p>
          <Button type="button" onClick={copyBookingLink} className={`w-full gap-2 ${primaryButtonClassName}`}>
            <Copy className="h-4 w-4" /> Copy Booking Link
          </Button>
          <Button type="button" variant="outline" onClick={shareOnWhatsApp} className="h-12 w-full rounded-2xl border-[#020c1a] text-[#020c1a]">
            <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.open(bookingLink, '_blank', 'noopener,noreferrer')} className="h-12 w-full rounded-2xl">
            <ExternalLink className="mr-2 h-4 w-4" /> View Booking Page
          </Button>
        </div>

        <div className="rounded-2xl border bg-accent/45 p-4 text-left">
          <p className="text-sm font-bold">We'll take it from here.</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {[
              'Track your bookings',
              'Monitor earnings and payouts',
              'Automatically remind customers',
              'See your business performance',
              'Get insights as your business grows',
            ].map(item => (
              <p key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>

        <Button onClick={() => navigate('/dashboard')} className={`w-full gap-2 ${primaryButtonClassName}`}>
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      {step < 4 && (
        <>
          <div className="mb-5 flex items-center gap-3">
            <BackButton onClick={step > 0 ? goBack : undefined} />
          </div>
          <WelcomeBackNote />
          <div className="mb-4 flex justify-end">
            <Button type="button" variant="outline" className="h-10 rounded-2xl border-[#020c1a] text-[#020c1a]" onClick={saveSetupDraft}>
              Save and continue later
            </Button>
          </div>
          <ProgressBar currentStep={step} totalSteps={5} labels={STEP_LABELS} />
        </>
      )}

      <main className={`mt-6 flex-1 transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {step === 0 && renderBusinessStep()}
        {step === 1 && renderLocationStep()}
        {step === 2 && renderPaymentsStep()}
        {step === 3 && renderServiceStep()}
        {step === 4 && renderLiveStep()}
      </main>
    </div>
  );
};

export default BusinessSetup;
