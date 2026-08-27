import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { AlarmClock, ArrowRight, BarChart3, Bell, CalendarDays, Check, Loader2, LockKeyhole, MessageCircle, WalletCards } from 'lucide-react';

type WelcomeSlide = {
  background: string;
  eyebrow: string;
  title: string;
  body?: string;
  artwork: 'calendar' | 'payments' | 'insights' | 'reminders';
};

const slides: WelcomeSlide[] = [
  {
    background: 'bg-[#2799E6]',
    eyebrow: 'Bookings',
    title: 'Let clients book you without the back-and-forth.',
    artwork: 'calendar',
  },
  {
    background: 'bg-[#A75BF2]',
    eyebrow: 'Payments',
    title: 'Take payments early and keep every booking serious.',
    artwork: 'payments',
  },
  {
    background: 'bg-[#12B761]',
    eyebrow: 'Insights',
    title: 'See bookings, revenue and client trends in one place.',
    artwork: 'insights',
  },
  {
    background: 'bg-[#1767D5]',
    eyebrow: 'Reminders',
    title: 'Reminders are handled automatically.',
    body: 'Confirmations and appointment reminders keep everyone on schedule.',
    artwork: 'reminders',
  },
];

const FloatingLines = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute left-[-18%] top-[34%] h-28 w-[138%] rounded-[50%] border-t-[3px] border-[#A5F06C]/80 rotate-[-4deg]" />
    <div className="absolute left-[-12%] top-[47%] h-32 w-[130%] rounded-[50%] border-t-[3px] border-[#55DFE7]/75 rotate-[8deg]" />
    <div className="absolute right-[-35%] top-[40%] h-32 w-[100%] rounded-[50%] border-t-[3px] border-[#FF5EAC]/70 rotate-[23deg]" />
    <span className="absolute left-[19%] top-[27%] h-4 w-4 rounded-full border-[5px] border-[#F5EB57]" />
    <span className="absolute right-[18%] top-[34%] h-3 w-3 rounded-full border-[4px] border-[#34D67A]" />
    <span className="absolute left-[34%] top-[52%] h-3 w-3 rounded-full border-[4px] border-[#F5EB57]" />
    <span className="absolute right-[27%] top-[24%] text-5xl font-black leading-none text-[#FF5EAC]">+</span>
  </div>
);

const CalendarArtwork = () => (
  <div className="relative mx-auto h-72 w-72" aria-hidden="true">
    <div className="absolute left-8 top-8 h-52 w-52 rotate-[-8deg] rounded-[2rem] bg-[#086CCB] shadow-[14px_18px_0_rgba(0,0,0,0.16)]">
      <div className="absolute inset-6 rounded-[1.5rem] bg-[#167CE3]" />
      <div className="absolute left-0 top-12 h-8 w-3 rounded-r-full bg-[#061F3A]" />
      <div className="absolute left-0 top-28 h-8 w-3 rounded-r-full bg-[#061F3A]" />
      <div className="absolute left-16 top-20 flex h-24 w-24 items-center justify-center rounded-full border-[14px] border-[#084F94]">
        <CalendarDays className="h-10 w-10 text-[#A9D8FF]" strokeWidth={2.6} />
      </div>
    </div>
    <div className="absolute right-7 top-28 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF5EB4] shadow-[0_10px_0_rgba(0,0,0,0.12)]">
      <LockKeyhole className="h-8 w-8 text-white" fill="white" strokeWidth={2.6} />
    </div>
  </div>
);

const PaymentsArtwork = () => (
  <div className="relative mx-auto h-72 w-72" aria-hidden="true">
    <div className="absolute left-16 top-8 h-52 w-36 rotate-[10deg] rounded-[2rem] bg-[#0D59A4] shadow-[12px_16px_0_rgba(0,0,0,0.12)]">
      <div className="absolute inset-x-4 top-5 h-3 rounded-full bg-[#32A8F0]" />
      <div className="absolute left-12 top-12 h-12 w-12 rounded-full bg-[#FFE457] shadow-[0_8px_0_#FFB928]" />
      <div className="absolute left-12 top-[7.5rem] h-12 w-12 rounded-full bg-[#FFE457] shadow-[0_8px_0_#FFB928]" />
      <div className="absolute bottom-7 left-5 h-8 w-24 rounded-full bg-[#FFD136]" />
      <div className="absolute bottom-11 left-8 h-8 w-24 rounded-full bg-[#FFE457] rotate-[18deg]" />
    </div>
    <div className="absolute left-9 top-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5EB4] shadow-[0_9px_0_rgba(0,0,0,0.12)]">
      <WalletCards className="h-7 w-7 text-white" strokeWidth={2.8} />
    </div>
    <div className="absolute right-14 top-32 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#54C7F4] bg-[#2DA8E8]">
      <Check className="h-8 w-8 text-white" strokeWidth={3.2} />
    </div>
  </div>
);

const InsightsArtwork = () => (
  <div className="relative mx-auto h-72 w-80" aria-hidden="true">
    <div className="absolute left-7 top-16 h-16 w-64 rotate-[5deg] rounded-2xl bg-[#B3FFD7] shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
      <div className="absolute left-5 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#81F1BB] text-xl">N</div>
      <div className="absolute left-[4.5rem] top-5 h-3 w-24 rounded-full bg-[#0D7F4C]" />
      <div className="absolute left-[4.5rem] top-10 h-2 w-40 rounded-full bg-white" />
      <div className="absolute left-[4.5rem] top-10 h-2 w-24 rounded-full bg-[#12B761]" />
    </div>
    <div className="absolute left-5 top-32 h-16 w-64 rotate-[4deg] rounded-2xl bg-[#B3FFD7] shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
      <div className="absolute left-5 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#81F1BB] text-xl">P</div>
      <div className="absolute left-[4.5rem] top-5 h-3 w-32 rounded-full bg-[#0D7F4C]" />
      <div className="absolute left-[4.5rem] top-10 h-2 w-40 rounded-full bg-white" />
      <div className="absolute left-[4.5rem] top-10 h-2 w-28 rounded-full bg-[#12B761]" />
    </div>
    <div className="absolute left-10 top-48 h-16 w-64 rotate-[6deg] rounded-2xl bg-[#B3FFD7] shadow-[10px_10px_0_rgba(0,0,0,0.12)]">
      <div className="absolute left-5 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#81F1BB]">
        <BarChart3 className="h-6 w-6 text-[#187E55]" />
      </div>
      <div className="absolute left-[4.5rem] top-5 h-3 w-20 rounded-full bg-[#0D7F4C]" />
      <div className="absolute left-[4.5rem] top-10 h-2 w-40 rounded-full bg-white" />
      <div className="absolute left-[4.5rem] top-10 h-2 w-20 rounded-full bg-[#12B761]" />
    </div>
    <div className="absolute right-7 top-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF5EB4] shadow-[0_9px_0_rgba(0,0,0,0.12)]">
      <BarChart3 className="h-8 w-8 text-white" strokeWidth={2.8} />
    </div>
  </div>
);

const RemindersArtwork = () => (
  <div className="relative mx-auto h-72 w-72" aria-hidden="true">
    <div className="absolute left-7 top-10 h-52 w-52 rotate-[-7deg] rounded-[2rem] bg-[#0C4EA8] shadow-[14px_18px_0_rgba(0,0,0,0.14)]">
      <div className="absolute inset-6 rounded-[1.5rem] bg-[#207DE2]" />
      <div className="absolute left-10 top-9 flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-[#83D8FF] bg-[#145EBA]">
        <AlarmClock className="h-16 w-16 text-white" strokeWidth={2.8} />
      </div>
      <div className="absolute bottom-8 left-8 h-4 w-32 rounded-full bg-white/80" />
      <div className="absolute bottom-8 left-8 h-4 w-20 rounded-full bg-[#A5F06C]" />
      <div className="absolute bottom-16 left-8 h-3 w-24 rounded-full bg-white/45" />
    </div>
    <div className="absolute right-6 top-24 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF5EB4] shadow-[0_10px_0_rgba(0,0,0,0.12)]">
      <Bell className="h-8 w-8 text-white" fill="white" strokeWidth={2.5} />
    </div>
    <div className="absolute bottom-10 left-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFE457] shadow-[0_9px_0_rgba(0,0,0,0.12)]">
      <MessageCircle className="h-8 w-8 text-[#1767D5]" fill="#1767D5" strokeWidth={2.4} />
    </div>
  </div>
);

const SlideArtwork = ({ type }: { type: WelcomeSlide['artwork'] }) => {
  if (type === 'calendar') return <CalendarArtwork />;
  if (type === 'payments') return <PaymentsArtwork />;
  if (type === 'reminders') return <RemindersArtwork />;
  return <InsightsArtwork />;
};

const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Welcome = () => {
  const navigate = useNavigate();
  const { signupWithGoogle, getPostAuthRedirect } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];

  const handleGoogleContinue = async () => {
    setGoogleLoading(true);
    try {
      await signupWithGoogle();
      navigate(await getPostAuthRedirect());
    } catch (error: any) {
      toast({
        title: 'Google sign-in failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background md:grid md:h-screen md:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)]">
      <section className={`relative h-screen h-svh max-h-screen max-h-svh overflow-hidden text-white transition-colors duration-500 md:h-screen md:max-h-none ${slide.background}`}>
        <FloatingLines />

        <div className="relative z-10 mx-auto flex h-screen h-svh max-h-screen max-h-svh w-full max-w-md flex-col px-6 pb-5 pt-8 sm:pb-6 sm:pt-10 md:max-w-xl md:px-10 md:pb-10">
          <header className="text-center">
            <p className="text-2xl font-black leading-tight tracking-normal sm:text-3xl md:text-4xl">Turn your time into business.</p>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-5 text-white/85 sm:text-base sm:leading-6">
              Bookings, payments and insights in one place.
            </p>
          </header>

          <section className="flex flex-1 flex-col justify-center py-3 text-center sm:py-5">
            <div className="relative h-[13.75rem] overflow-visible sm:h-[15rem] md:h-[18rem]">
              <div className="absolute left-1/2 top-0 origin-top -translate-x-1/2 scale-[0.78] sm:scale-[0.86] md:scale-100">
                <SlideArtwork type={slide.artwork} />
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">{slide.eyebrow}</p>
            <h1 className="mx-auto mt-3 max-w-sm text-[1.7rem] font-black leading-[1.08] tracking-normal sm:text-3xl md:text-4xl">{slide.title}</h1>
            {slide.body && <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-5 text-white/85 sm:text-base sm:leading-6">{slide.body}</p>}

            <div className="mt-5 flex items-center justify-center gap-3" aria-label={`Slide ${activeSlide + 1} of ${slides.length}`}>
              {slides.map((item, index) => (
                <button
                  key={item.eyebrow}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    activeSlide === index ? 'w-7 bg-white' : 'w-2.5 bg-black/20 hover:bg-white/50'
                  }`}
                  aria-label={`Show ${item.eyebrow} slide`}
                  aria-current={activeSlide === index}
                />
              ))}
            </div>
          </section>

          <div className="space-y-3 md:hidden">
            <Button
              type="button"
              className="h-14 w-full rounded-2xl bg-white text-base font-bold text-[#111827] shadow-none hover:bg-white/90"
              onClick={() => navigate('/signup')}
            >
              Create an account
            </Button>
            <Button
              type="button"
              className="h-14 w-full rounded-2xl bg-[#202234] text-base font-bold text-white shadow-none hover:bg-[#292B40]"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      <section className="hidden min-h-screen items-center justify-center bg-background px-10 py-12 text-foreground md:flex">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6B4EFF]">AktiveHQ</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose how you want to continue.</p>
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              className="h-12 w-full rounded-xl border-0 bg-[#020c1a] text-base font-bold hover:bg-[#06162b]"
              onClick={() => navigate('/login')}
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-xl border-[#020c1a] bg-white text-base font-bold text-[#020c1a] hover:bg-[#020c1a]/5 hover:text-[#020c1a]"
              onClick={() => navigate('/signup')}
            >
              Create account
            </Button>
          </div>

          <div className="my-8 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl border-[#020c1a] bg-white justify-center gap-3 text-base font-bold text-[#020c1a] hover:bg-[#020c1a]/5 hover:text-[#020c1a]"
            disabled={googleLoading}
            onClick={handleGoogleContinue}
          >
            {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleLogo />}
            Continue with Google
          </Button>
        </div>
      </section>
    </main>
  );
};

export default Welcome;
