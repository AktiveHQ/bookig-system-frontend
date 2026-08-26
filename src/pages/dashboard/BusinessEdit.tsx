import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import BankSelect from '@/components/shared/BankSelect';
import ImageCropDialog from '@/components/shared/ImageCropDialog';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, Loader2, Upload } from 'lucide-react';
import type { Business } from '@/types';
import { cn } from '@/lib/utils';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
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

const BusinessEdit = () => {
  const navigate = useNavigate();
  const { business, setBusiness } = useData();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country] = useState('Nigeria');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [bookingImage, setBookingImage] = useState('');
  const [imageToCrop, setImageToCrop] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [feeHandling, setFeeHandling] = useState<Business['feeHandling']>('customer');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setDescription(business.businessDescription || business.description);
    setEmail(business.email);
    setPhone(business.phone || '');
    setCity(business.city);
    setAddress(business.address);
    setBookingImage(business.headerImageUrl || '');
    setFeeHandling(business.feeHandling || 'customer');
    setAccountHolder(business.accountHolderName);
    setBankName(business.bankName);
    setBankCode(business.bankCode || '');
    setAccountNumber(business.accountNumber);
  }, [business]);

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
        console.error('[BusinessEdit] Failed to verify account:', error);
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

  const handleSave = async () => {
    if (!business) return;
    if (!name || !email || !country || !city || !bookingImage || !accountHolder || !accountNumber) {
      toast({
        title: 'Missing required fields',
        description: 'Please complete all required fields before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const result = await setBusiness({
      ...business,
      name,
      description,
      businessDescription: description,
      email,
      phone: phone || undefined,
      country,
      city,
      address,
      headerImageUrl: bookingImage ? bookingImage : null,
      feeHandling,
      accountHolderName: accountHolder,
      bankName,
      bankCode,
      accountNumber,
    });
    setSaving(false);

    if (!result.ok) {
      toast({
        title: 'Update failed',
        description: result.message || 'We could not save your business profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Business settings updated' });
    navigate('/business/edit');
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
        setImageToCrop(result);
        setCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        <BackButton />
        <div className="flex-1 flex flex-col justify-center text-center space-y-4">
          <p className="text-muted-foreground">No business profile found.</p>
          <Button onClick={() => navigate('/setup')} className="h-12 rounded-xl gap-2">
            Complete setup <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 md:px-8 lg:px-10 max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton />
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <h1 className="text-2xl font-bold">Business information</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your business details and payouts</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="border rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Business details</p>
                <p className="text-xs text-muted-foreground mt-1">These details appear on your public booking page.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl min-h-[96px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Contact Email</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Contact Phone (optional)</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="border rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Location & profile</p>
                <p className="text-xs text-muted-foreground mt-1">Used to help clients find you and recognize your page.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Country</label>
                  <Input value={country} disabled className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">State</label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="h-12 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Business Address</label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">
                    Business Photo or logo <span className="text-destructive">*</span>
                  </label>
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
                  <p className="text-xs text-muted-foreground">
                    Required. This image appears on your public booking page. Use Adjust photo to crop it to your preference.
                  </p>
                  {bookingImage && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-full"
                        onClick={() => {
                          setImageToCrop(bookingImage);
                          setCropOpen(true);
                        }}
                      >
                        Adjust photo to fit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-full"
                        onClick={() => setBookingImage('')}
                      >
                        Remove image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Payout details</p>
                <p className="text-xs text-muted-foreground mt-1">Where we should send money from successful bookings.</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Fee Handling</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left',
                      feeHandling === 'customer' ? 'border-foreground bg-accent' : 'bg-background',
                    )}
                    onClick={() => setFeeHandling('customer')}
                  >
                    <input type="radio" checked={feeHandling === 'customer'} readOnly className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Customer pays the fee</p>
                      <p className="text-xs text-muted-foreground">The service fee/service charge is added on top of booking</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left',
                      feeHandling === 'business' ? 'border-foreground bg-accent' : 'bg-background',
                    )}
                    onClick={() => setFeeHandling('business')}
                  >
                    <input type="radio" checked={feeHandling === 'business'} readOnly className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Business pays the fee</p>
                      <p className="text-xs text-muted-foreground">The service fee/service charge is deducted from your earnings</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bank Name/Institution</label>
                  <BankSelect
                    value={bankName}
                    onChange={setBankName}
                    onBankInputChange={handleBankInputChange}
                    onBankSelect={handleBankSelect}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Account Number</label>
                  <Input
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-12 rounded-xl"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Account Holder Name</label>
                  <Input
                    value={resolvingAccount ? 'Verifying account name...' : accountHolder}
                    onChange={e => setAccountHolder(e.target.value)}
                    className="h-12 rounded-xl"
                    readOnly={resolvingAccount}
                  />
                  {resolvingAccount && (
                    <p className="text-xs text-muted-foreground">Verifying account name...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button onClick={handleSave} disabled={saving || resolvingAccount} className="w-full md:w-auto h-12 rounded-xl gap-2 md:px-10">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save changes <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
      <ImageCropDialog
        image={imageToCrop}
        open={cropOpen}
        onApply={setBookingImage}
        onOpenChange={setCropOpen}
      />
    </div>
  );
};

export default BusinessEdit;
