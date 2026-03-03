import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import ProgressBar from '@/components/shared/ProgressBar';
import { useData } from '@/contexts/DataContext';
import { ArrowRight, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import WelcomeBackNote from '@/components/shared/WelcomeBackNote';

const STEP_LABELS = ['4 easy steps!', 'Getting there!', 'Almost there!', 'Finish setup!'];

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
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Step 3
  const [bookingImage, setBookingImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 4
  const [feeHandling, setFeeHandling] = useState<'customer' | 'business'>('customer');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);

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
      name, description, country, city, address, email, phone,
      bookingPageImage: bookingImage,
      feeHandling, accountHolderName: accountHolder, bankName, accountNumber,
      slug,
    };
    console.log('[BusinessSetup] Finish setup payload:', businessPayload);
    const ok = await setBusiness(businessPayload);
    setSaving(false);

    if (!ok) {
      toast({
        title: 'Setup failed',
        description: 'We could not save your business profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setHasSetupComplete(true);
    toast({ title: 'Business profile saved' });
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

      <ProgressBar currentStep={step} totalSteps={4} labels={STEP_LABELS} />

      <div className={`flex-1 flex flex-col mt-8 transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {step === 0 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <h1 className="text-xl font-bold">Let's set up your business</h1>
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Business Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl min-h-[80px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contact Email (req.email)</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contact Phone (optional)</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <Button onClick={goNext} className="w-full h-12 rounded-full gap-2" disabled={!name || !email}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <h1 className="text-xl font-bold">Where is your business located?</h1>
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Country (select)</label>
                <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Nigeria" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">City</label>
                <Input value={city} onChange={e => setCity(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Business Address</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <Button onClick={goNext} className="w-full h-12 rounded-full gap-2" disabled={!country || !city}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <h1 className="text-xl font-bold">Your booking page</h1>
            <div className="space-y-4 flex-1">
              <div
                className="border-2 border-dashed rounded-xl min-h-40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors p-4"
                onClick={() => fileInputRef.current?.click()}
              >
                {bookingImage ? (
                  <img
                    src={bookingImage}
                    alt="Booking page preview"
                    className="h-28 w-28 rounded-xl object-cover border"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground text-center">
                  {bookingImage ? 'Tap to change image' : 'Upload profile/header image'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              {bookingImage && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full"
                  onClick={() => setBookingImage('')}
                >
                  Remove image
                </Button>
              )}
              <p className="text-xs text-muted-foreground">This appears on your booking page</p>
            </div>
            <Button onClick={goNext} className="w-full h-12 rounded-full gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 flex-1 flex flex-col">
            <div>
              <h1 className="text-xl font-bold">How you want to get paid and where your money should go</h1>
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-sm font-medium mb-2">Fee Handling</p>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${feeHandling === 'customer' ? 'border-foreground bg-accent' : ''}`}>
                    <input type="radio" checked={feeHandling === 'customer'} onChange={() => setFeeHandling('customer')} className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Customer pays the fee</p>
                      <p className="text-xs text-muted-foreground">The service fee/service charge is added on top of booking</p>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Platform fee is 5%. This helps us maintain the service.</p>
              </div>

              <p className="text-sm font-semibold mt-4">Where should we send your money?</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Account Holder Name</label>
                <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bank Name/Institution</label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Account Number</label>
                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <Button onClick={handleFinish} className="w-full h-12 rounded-full gap-2" disabled={!accountHolder || !accountNumber || saving}>
              {saving ? 'Saving...' : 'Finish setup'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessSetup;
