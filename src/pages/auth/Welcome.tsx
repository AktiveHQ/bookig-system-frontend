import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlarmClock, BarChart3, Bell, CalendarDays, Check, LockKeyhole, MessageCircle, WalletCards } from 'lucide-react';

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

const Welcome = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];

  return (
    <main className={`relative h-screen h-svh max-h-screen max-h-svh overflow-hidden text-white transition-colors duration-500 ${slide.background}`}>
      <FloatingLines />

      <div className="relative z-10 mx-auto flex h-screen h-svh max-h-screen max-h-svh w-full max-w-md flex-col px-6 pb-5 pt-8 sm:pb-6 sm:pt-10">
        <header className="text-center">
          <p className="text-2xl font-black leading-tight tracking-normal sm:text-3xl">Turn your time into business.</p>
          <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-5 text-white/85 sm:text-base sm:leading-6">
            Bookings, payments and insights in one place.
          </p>
        </header>

        <section className="flex flex-1 flex-col justify-center py-3 text-center sm:py-5">
          <div className="relative h-[13.75rem] overflow-visible sm:h-[15rem]">
            <div className="absolute left-1/2 top-0 origin-top -translate-x-1/2 scale-[0.78] sm:scale-[0.86]">
              <SlideArtwork type={slide.artwork} />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">{slide.eyebrow}</p>
          <h1 className="mx-auto mt-3 max-w-sm text-[1.7rem] font-black leading-[1.08] tracking-normal sm:text-3xl">{slide.title}</h1>
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

        <div className="space-y-3">
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
    </main>
  );
};

export default Welcome;
