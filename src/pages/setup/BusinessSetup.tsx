import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BankSelect from '@/components/shared/BankSelect';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import ProgressBar from '@/components/shared/ProgressBar';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import WelcomeBackNote from '@/components/shared/WelcomeBackNote';

const STEP_LABELS = ['3 easy steps!', 'Getting there!', 'Finish setup!'];
const SETUP_DRAFT_KEY = 'akhq:businessSetupDraft';
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).trim().replace(/\/$/, '');
const inputClassName = 'h-10 rounded-lg';
const uploadBoxClassName =
  'border-2 border-dashed rounded-lg min-h-28 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent/50 transition-colors p-3';

const RequiredLabel = ({ children }: { children: string }) => (
  <label className="text-sm font-medium">
    {children} <span className="text-destructive">*</span>
  </label>
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

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { setBusiness, setHasSetupComplete } = useData();
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2
  const [country] = useState('Nigeria');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  const [bookingImage, setBookingImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const feeHandling: 'customer' | 'business' = 'customer';
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(SETUP_DRAFT_KEY);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      const restoredStep = Number.isInteger(draft.step)
        ? Math.min(Math.max(Number(draft.step), 0), 2)
        : 0;
      setStep(restoredStep);
      setName(String(draft.name ?? ''));
      setDescription(String(draft.description ?? ''));
      setEmail(String(draft.email ?? ''));
      setPhone(String(draft.phone ?? ''));
      setCity(String(draft.city ?? ''));
      setAddress(String(draft.address ?? ''));
      setBookingImage(String(draft.bookingImage ?? ''));
      setAccountHolder(String(draft.accountHolder ?? ''));
      setBankName(String(draft.bankName ?? ''));
      setBankCode(String(draft.bankCode ?? ''));
      setAccountNumber(String(draft.accountNumber ?? ''));
      toast({
        title: 'Draft restored',
        description: 'Your saved setup progress has been loaded.',
      });
    } catch (error) {
      console.error('[BusinessSetup] Failed to load setup draft:', error);
    }
  }, []);

  const saveSetupDraft = () => {
    const draft = {
      step,
      name,
      description,
      email,
      phone,
      country,
      city,
      address,
      bookingImage,
      accountHolder,
      bankName,
      bankCode,
      accountNumber,
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
          throw new Error(
            await getResponseErrorMessage(response, 'Unable to verify account number')
          );
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
            description:
              error instanceof Error
                ? error.message
                : 'Check the bank and account number, then try again.',
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
    setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 200);
  };

  const goBack = () => {
    if (step === 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setTransitioning(false);
    }, 200);
  };

  const handleFinish = async () => {
    setSaving(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const businessPayload = {
      id: crypto.randomUUID(),
      name,
      description,
      businessDescription: description,
      country, city, address, email, phone,
      headerImageUrl: bookingImage ? bookingImage : null,
      feeHandling, accountHolderName: accountHolder, bankName, bankCode, accountNumber,
      slug,
    };
    console.log('[BusinessSetup] Finish setup payload:', businessPayload);
    const result = await setBusiness(businessPayload);
    setSaving(false);

    if (!result.ok) {
      toast({
        title: 'Setup failed',
        description: result.message || 'We could not save your business profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setHasSetupComplete(true);
    try {
      localStorage.removeItem(SETUP_DRAFT_KEY);
    } catch {
      // ignore
    }
    toast({
      title: 'Profile submitted',
      description:
        'Your business is ready. You can start creating services and accepting bookings.',
    });
    navigate('/dashboard');
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    const maxSizeInBytes = 3 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast({
        title: 'Image too large',
        description: 'Please use an image smaller than 3MB.',
        variant: 'destructive',
      });
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

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={step > 0 ? goBack : undefined} />
      </div>
      <WelcomeBackNote />
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full"
          onClick={saveSetupDraft}
        >
          Save and continue later
        </Button>
      </div>

      <ProgressBar currentStep={step} totalSteps={3} labels={STEP_LABELS} />

      <div className={`flex-1 flex flex-col mt-6 transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {step === 0 && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <h1 className="text-xl font-bold">Let's Set Up Your Booking System</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your business profile, configure your availability, and start accepting bookings online.
              </p>
            </div>
            <div className="space-y-3 flex-1">
              <div className="space-y-1.5">
                <RequiredLabel>Business Photo or logo</RequiredLabel>
                <div
                  className={uploadBoxClassName}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {bookingImage ? (
                    <img
                      src={bookingImage}
                      alt="Booking page preview"
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    {bookingImage ? 'Tap to change image' : 'Upload business photo or logo'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This image appears on your public booking page.
                </p>
                {bookingImage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-full"
                    onClick={() => setBookingImage('')}
                  >
                    Remove image
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <RequiredLabel>Business Name</RequiredLabel>
                <Input value={name} onChange={e => setName(e.target.value)} className={inputClassName} required />
              </div>
              <div className="space-y-1.5">
                <RequiredLabel>Business Description</RequiredLabel>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-lg min-h-[68px]" required />
              </div>
              <div className="space-y-1.5">
                <RequiredLabel>Contact Email</RequiredLabel>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClassName} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contact Phone (optional)</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className={inputClassName} />
              </div>
            </div>
            <Button onClick={goNext} className="w-full h-11 rounded-full gap-2" disabled={!bookingImage || !name || !description.trim() || !email}>
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h1 className="text-xl font-bold">Where is your business located?</h1>
            <div className="space-y-3 flex-1">
              <div className="space-y-1.5">
                <RequiredLabel>Country</RequiredLabel>
                <Input value={country} disabled className={inputClassName} required />
              </div>
              <div className="space-y-1.5">
                <RequiredLabel>City</RequiredLabel>
                <Input value={city} onChange={e => setCity(e.target.value)} className={inputClassName} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Business Address</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} className={inputClassName} />
              </div>
            </div>
            <Button onClick={goNext} className="w-full h-11 rounded-full gap-2" disabled={!country || !city}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <h1 className="text-xl font-bold">How you want to get paid and where your money should go</h1>
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-sm font-medium mb-2">Fee Handling</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 border rounded-xl bg-accent border-foreground">
                    <input type="radio" checked readOnly className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Customer pays the fee</p>
                      <p className="text-xs text-muted-foreground">The service fee/service charge is added on top of booking</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Platform fee is 5%. This helps us maintain the service.</p>
              </div>

              <p className="text-sm font-semibold mt-4">Where should we send your money?</p>
              <div className="space-y-1.5">
                <RequiredLabel>Bank Name/Institution</RequiredLabel>
                <BankSelect
                  value={bankName}
                  onChange={setBankName}
                  onBankInputChange={handleBankInputChange}
                  onBankSelect={handleBankSelect}
                />
              </div>
              <div className="space-y-1.5">
                <RequiredLabel>Account Number</RequiredLabel>
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
                <RequiredLabel>Account Holder Name</RequiredLabel>
                <Input
                  value={resolvingAccount ? 'Verifying account name...' : accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  className={inputClassName}
                  readOnly={resolvingAccount}
                  required
                />
                {resolvingAccount && (
                  <p className="text-xs text-muted-foreground">Verifying account name...</p>
                )}
              </div>
            </div>
            <Button onClick={handleFinish} className="w-full h-11 rounded-full gap-2" disabled={!bankCode || !accountHolder || accountNumber.length !== 10 || resolvingAccount || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Finish setup <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessSetup;
