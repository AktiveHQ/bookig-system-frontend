import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import { toast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

const BusinessEdit = () => {
  const navigate = useNavigate();
  const { business, setBusiness } = useData();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [bookingImage, setBookingImage] = useState('');
  const [feeHandling, setFeeHandling] = useState<'customer' | 'business'>('customer');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setDescription(business.description);
    setEmail(business.email);
    setPhone(business.phone || '');
    setCountry(business.country);
    setCity(business.city);
    setAddress(business.address);
    setBookingImage(business.bookingPageImage || '');
    setFeeHandling(business.feeHandling);
    setAccountHolder(business.accountHolderName);
    setBankName(business.bankName);
    setAccountNumber(business.accountNumber);
  }, [business]);

  const handleSave = () => {
    if (!business) return;
    if (!name || !email || !country || !city || !accountHolder || !accountNumber) {
      toast({
        title: 'Missing required fields',
        description: 'Please complete all required fields before saving.',
        variant: 'destructive',
      });
      return;
    }

    setBusiness({
      ...business,
      name,
      description,
      email,
      phone: phone || undefined,
      country,
      city,
      address,
      bookingPageImage: bookingImage || undefined,
      feeHandling,
      accountHolderName: accountHolder,
      bankName,
      accountNumber,
    });

    toast({ title: 'Business profile updated' });
    navigate('/dashboard');
  };

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
        <BackButton />
        <div className="flex-1 flex flex-col justify-center text-center space-y-4">
          <p className="text-muted-foreground">No business profile found.</p>
          <Button onClick={() => navigate('/setup')} className="h-12 rounded-full gap-2">
            Complete setup <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton />
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <h1 className="text-2xl font-bold">Edit business profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your business details and payouts</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Business Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl min-h-[80px]" />
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

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Country</label>
            <Input value={country} onChange={e => setCountry(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">City</label>
            <Input value={city} onChange={e => setCity(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Business Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Booking Page Image URL (optional)</label>
            <Input value={bookingImage} onChange={e => setBookingImage(e.target.value)} className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="space-y-4">
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
              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${feeHandling === 'business' ? 'border-foreground bg-accent' : ''}`}>
                <input type="radio" checked={feeHandling === 'business'} onChange={() => setFeeHandling('business')} className="mt-1" />
                <div>
                  <p className="text-sm font-medium">Business pays the fee</p>
                  <p className="text-xs text-muted-foreground">The service fee/service charge is deducted from payout</p>
                </div>
              </label>
            </div>
          </div>

          <p className="text-sm font-semibold mt-2">Where should we send your money?</p>
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

        <Button onClick={handleSave} className="w-full h-12 rounded-full gap-2">
          Save changes <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BusinessEdit;
