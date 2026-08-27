import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider, useData } from "@/contexts/DataContext";
import AppLayout from "@/components/dashboard/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

const Welcome = lazy(() => import("./pages/auth/Welcome"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const BusinessSetup = lazy(() => import("./pages/setup/BusinessSetup"));
const SetupSuccess = lazy(() => import("./pages/setup/SetupSuccess"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const AppointmentDetail = lazy(() => import("./pages/dashboard/AppointmentDetail"));
const BookingDetail = lazy(() => import("./pages/dashboard/BookingDetail"));
const BookingsList = lazy(() => import("./pages/dashboard/BookingsList"));
const ServicesList = lazy(() => import("./pages/dashboard/ServicesList"));
const BusinessEdit = lazy(() => import("./pages/dashboard/BusinessEdit"));
const Account = lazy(() => import("./pages/dashboard/Account"));
const Transactions = lazy(() => import("./pages/dashboard/Transactions"));
const CreateAppointment = lazy(() => import("./pages/appointments/CreateAppointment"));
const AppointmentCreated = lazy(() => import("./pages/appointments/AppointmentCreated"));
const BusinessPage = lazy(() => import("./pages/client/BusinessPage"));
const BookingConfirmation = lazy(() => import("./pages/client/BookingConfirmation"));
const BookingConfirmed = lazy(() => import("./pages/client/BookingConfirmed"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const BusinessReview = lazy(() => import("./pages/admin/BusinessReview"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const CreateAdminAccount = lazy(() => import("./pages/admin/CreateAdminAccount"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center px-4">
    <p className="text-sm text-muted-foreground">Loading...</p>
  </div>
);

const ProtectedAppLayout = () => {
  const { user, loading } = useAuth();
  const { dashboardLoaded } = useData();

  if (loading || (user && !dashboardLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Auth */}
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route element={<ProtectedAppLayout />}>
                {/* Business Setup */}
                <Route path="/setup" element={<BusinessSetup />} />
                <Route path="/onboarding" element={<BusinessSetup />} />
                <Route path="/setup/success" element={<SetupSuccess />} />

                {/* Dashboard */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/analytics" element={<Analytics />} />
                <Route path="/dashboard/transactions" element={<Transactions />} />
                <Route path="/dashboard/bookings" element={<BookingsList />} />
                <Route path="/dashboard/services" element={<ServicesList />} />
                <Route path="/dashboard/bookings/:bookingId" element={<BookingDetail />} />
                <Route path="/dashboard/appointment/:id" element={<AppointmentDetail />} />
                <Route path="/business/edit" element={<Account />} />
                <Route path="/business/edit/details" element={<BusinessEdit />} />

                {/* Appointments */}
                <Route path="/appointments/create" element={<CreateAppointment />} />
                <Route path="/appointments/edit/:id" element={<CreateAppointment />} />
                <Route path="/appointments/created/:id" element={<AppointmentCreated />} />
              </Route>

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/businesses/:id" element={<BusinessReview />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/create" element={<CreateAdminAccount />} />

              {/* Client Booking */}
              <Route path="/booking/:slug" element={<BusinessPage />} />
              <Route path="/booking/:slug/confirm" element={<BookingConfirmation />} />
              <Route path="/booking/:slug/confirmed" element={<BookingConfirmed />} />
              {/* <Route path="/booking/:slug/confirmed" element={<BookingConfirmed />} /> */}

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
