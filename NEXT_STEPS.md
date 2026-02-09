# Booking System - Next Steps

## 🔥 Firebase Setup (Required)

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com)
2. **Enable Authentication** → Sign-in method → Enable Email/Password and Google
3. **Copy your Firebase config** from Project Settings → General → Your apps → Web app
4. **Paste config** into `src/lib/firebase.ts`

## 📧 Auto-Messaging Setup (Firebase Cloud Messaging / Cloud Functions)

### On Client Books an Appointment:
1. **Client confirmation email**: Use Firebase Cloud Functions with a mail service (e.g., SendGrid, Mailgun)
2. **Business notification**: Send push notification or email to business owner

### Implementation Steps:
```bash
# Install Firebase Admin SDK in your Cloud Functions
npm install firebase-admin @sendgrid/mail
```

#### Cloud Function Example:
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const onBookingCreated = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap) => {
    const booking = snap.data();
    
    // Email to client
    await sgMail.send({
      to: booking.clientEmail,
      from: 'noreply@yourbusiness.com',
      subject: `Booking Confirmed - ${booking.appointmentName}`,
      html: `<p>Your booking for ${booking.date} at ${booking.time} has been confirmed.</p>`,
    });

    // Email to business owner
    await sgMail.send({
      to: booking.businessEmail,
      from: 'noreply@yourbusiness.com',
      subject: `New Booking - ${booking.clientName}`,
      html: `<p>${booking.clientName} booked ${booking.appointmentName} for ${booking.date} at ${booking.time}.</p>`,
    });
  });
```

## 💳 Payment Integration

### Paystack (Recommended for Nigeria):
1. Create account at [paystack.com](https://paystack.com)
2. Get your **Public Key** and **Secret Key**
3. Install: `npm install @paystack/inline-js`
4. Replace the `handlePay` function in `BookingConfirmation.tsx` with Paystack integration

### Implementation:
```typescript
// In BookingConfirmation.tsx
import PaystackPop from '@paystack/inline-js';

const handlePay = () => {
  const paystack = new PaystackPop();
  paystack.newTransaction({
    key: 'YOUR_PAYSTACK_PUBLIC_KEY',
    email: email,
    amount: total * 100, // Amount in kobo
    onSuccess: (transaction) => {
      // Verify payment on backend, then create booking
      // TODO: Call your backend to verify transaction.reference
      addBooking(booking);
      navigate(`/booking/${slug}/confirmed`, { state: ... });
    },
    onCancel: () => {
      toast({ title: 'Payment cancelled', variant: 'destructive' });
    },
  });
};
```

## 🗄️ Backend Database (Firestore)

### Collections Structure:
```
businesses/
  {businessId}/
    name, description, slug, email, ...

appointments/
  {appointmentId}/
    businessId, name, price, duration, availableDays, ...

bookings/
  {bookingId}/
    appointmentId, clientName, clientEmail, date, time, status, ...
```

### Migration Steps:
1. Enable Firestore in Firebase Console
2. Replace localStorage calls in `DataContext.tsx` with Firestore operations
3. Add Firestore security rules

### Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /businesses/{businessId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
    match /appointments/{appointmentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /bookings/{bookingId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if request.auth != null;
    }
  }
}
```

## 📱 Push Notifications (Optional)

1. Enable Firebase Cloud Messaging in console
2. Add service worker for web push
3. Request notification permission on business dashboard
4. Send push when new booking is created

## 🚀 Deployment

1. Build: `npm run build`
2. Deploy to Firebase Hosting:
   ```bash
   firebase init hosting
   firebase deploy
   ```

## ✅ Checklist

- [ ] Add Firebase config to `src/lib/firebase.ts`
- [ ] Enable Email/Password & Google auth in Firebase
- [ ] Set up Firestore database
- [ ] Replace localStorage with Firestore in DataContext
- [ ] Integrate Paystack for payments
- [ ] Set up Cloud Functions for email notifications
- [ ] Add image upload with Firebase Storage
- [ ] Deploy to Firebase Hosting
- [ ] Set up custom domain for booking links
