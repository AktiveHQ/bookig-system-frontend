import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/components/shared/BackButton';
import WelcomeBackNote from '@/components/shared/WelcomeBackNote';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, Upload } from 'lucide-react';

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
  const [idVerificationType, setIdVerificationType] = useState<'NIN' | 'PASSPORT' | 'VOTERS_CARD' | ''>('');
  const [idDocumentData, setIdDocumentData] = useState<string>('');
  const [cacDocumentData, setCacDocumentData] = useState<string>('');
  const feeHandling: 'customer' | 'business' = 'customer';
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const cacDocInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setDescription(business.description);
    setEmail(business.email);
    setPhone(business.phone || '');
    setCity(business.city);
    setAddress(business.address);
    setBookingImage(business.headerImageUrl || '');
    setIdVerificationType((business.idVerificationType as any) || '');
    setIdDocumentData(business.idDocumentData || '');
    setCacDocumentData(business.cacDocumentData || '');
    setAccountHolder(business.accountHolderName);
    setBankName(business.bankName);
    setAccountNumber(business.accountNumber);
  }, [business]);

  const handleSave = async () => {
    if (!business) return;
    if (!name || !email || !country || !city || !accountHolder || !accountNumber) {
      toast({
        title: 'Missing required fields',
        description: 'Please complete all required fields before saving.',
        variant: 'destructive',
      });
      return;
    }

    const ok = await setBusiness({
      ...business,
      name,
      description,
      email,
      phone: phone || undefined,
      country,
      city,
      address,
      headerImageUrl: bookingImage ? bookingImage : null,
      idVerificationType: idVerificationType ? idVerificationType : null,
      idDocumentData: idDocumentData ? idDocumentData : null,
      cacDocumentData: cacDocumentData ? cacDocumentData : null,
      feeHandling,
      accountHolderName: accountHolder,
      bankName,
      accountNumber,
    });

    if (!ok) {
      toast({
        title: 'Update failed',
        description: 'We could not save your business profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Business profile updated' });
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

  const handleDocUpload = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAllowed =
      file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowed) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image or PDF file.',
        variant: 'destructive',
      });
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast({
        title: 'File too large',
        description: 'Please use a file smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setter(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderDocPreview = (dataUrl: string, label: string) => {
    if (!dataUrl) return null;
    if (dataUrl.startsWith('data:image/')) {
      return (
        <img
          src={dataUrl}
          alt={`${label} preview`}
          className="h-24 w-24 rounded-xl object-cover border"
        />
      );
    }
    if (dataUrl.startsWith('data:application/pdf')) {
      return (
        <div className="text-xs text-muted-foreground text-center">
          <p className="font-medium text-foreground">PDF selected</p>
          <a
            href={dataUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Preview PDF
          </a>
        </div>
      );
    }
    return null;
  };

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 max-w-2xl mx-auto">
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
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton />
      </div>
      <WelcomeBackNote />

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
            <Input value={country} disabled className="h-12 rounded-xl" />
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
            <label className="text-sm font-medium">Profile/Header image (optional)</label>
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
              This is what users will see on your public booking page.
            </p>
            {bookingImage && (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full mt-2"
                onClick={() => setBookingImage('')}
              >
                Remove image
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">ID Verification (select)</label>
            <select
              value={idVerificationType}
              onChange={e => setIdVerificationType(e.target.value as any)}
              className="h-12 rounded-xl border bg-background px-3 text-sm w-full"
            >
              <option value="">Select ID type</option>
              <option value="NIN">NIN</option>
              <option value="PASSPORT">Passport</option>
              <option value="VOTERS_CARD">Voters card</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Choose the ID you want to use for verification.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">ID Upload</label>
            <div
              className="border-2 border-dashed rounded-xl min-h-40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors p-4"
              onClick={() => idDocInputRef.current?.click()}
            >
              {idDocumentData ? (
                renderDocPreview(idDocumentData, 'ID document')
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground text-center">
                {idDocumentData ? 'Tap to change document' : 'Upload identification document (image/PDF)'}
              </p>
              <input
                ref={idDocInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => handleDocUpload(e, setIdDocumentData)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a clear photo or PDF of the selected ID (max 5MB).
            </p>
            {idDocumentData && (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full mt-2"
                onClick={() => setIdDocumentData('')}
              >
                Remove ID document
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Business Document (CAC)</label>
            <div
              className="border-2 border-dashed rounded-xl min-h-40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors p-4"
              onClick={() => cacDocInputRef.current?.click()}
            >
              {cacDocumentData ? (
                renderDocPreview(cacDocumentData, 'CAC document')
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground text-center">
                {cacDocumentData ? 'Tap to change document' : 'Upload business document (image/PDF)'}
              </p>
              <input
                ref={cacDocInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => handleDocUpload(e, setCacDocumentData)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your CAC/business registration document (image or PDF, max 5MB).
            </p>
            {cacDocumentData && (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full mt-2"
                onClick={() => setCacDocumentData('')}
              >
                Remove CAC document
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
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
          </div>

          <p className="text-sm font-semibold mt-2">Where should we send your money?</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bank Name/Institution</label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Account Number</label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Account Holder Name</label>
            <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="h-12 rounded-xl" />
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
