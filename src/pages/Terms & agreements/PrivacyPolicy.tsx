const updatedAt = 'June 5, 2026';

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'We collect the information needed to create accounts, set up business profiles, manage bookings, and process customer payments. This can include names, email addresses, phone numbers, business details, service information, booking details, and payout account details.',
      'When customers book an appointment, we collect the details required to confirm the booking, process payment, prevent duplicate reservations, and send confirmations.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'We use information to provide AktiveHQ, operate booking and payment workflows, verify payout details, send service messages, improve product reliability, prevent abuse, and comply with legal obligations.',
      'We do not sell personal information.',
    ],
  },
  {
    title: 'Payments And Payouts',
    body: [
      'Payments are processed through Paystack. AktiveHQ may send required transaction, bank, and subaccount details to Paystack so vendors can receive settlement and platform fees can be collected.',
      'We do not store card details on AktiveHQ servers.',
    ],
  },
  {
    title: 'Sharing Information',
    body: [
      'We share information with service providers that help us run the platform, including payment, email, hosting, authentication, analytics, and support providers.',
      'We may also share information where required by law, to enforce our terms, or to protect users and the platform.',
    ],
  },
  {
    title: 'Data Security',
    body: [
      'We use reasonable technical and organisational safeguards to protect information. No internet service can guarantee complete security, so users should keep account credentials private and use secure devices.',
    ],
  },
  {
    title: 'Your Choices',
    body: [
      'You may request access, correction, or deletion of your personal information by contacting us. Some records may be retained where required for payment, tax, security, fraud prevention, or legal reasons.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'For questions about this Privacy Policy, contact us at hello@aktivehq.com.',
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <article className="mx-auto max-w-3xl">
        <header className="border-b pb-6">
          <p className="text-sm text-muted-foreground">AktiveHQ</p>
          <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated {updatedAt}</p>
        </header>

        <div className="space-y-8 py-8">
          <section className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              This Privacy Policy explains how AktiveHQ collects, uses, shares, and protects
              information when vendors and customers use our booking, commerce, payment, and
              operations tools.
            </p>
          </section>

          {sections.map(section => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.body.map(paragraph => (
                <p key={paragraph} className="text-sm leading-6 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
};

export default PrivacyPolicy;
