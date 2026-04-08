import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

import Welcome from "./pages/auth/Welcome";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import BusinessSetup from "./pages/setup/BusinessSetup";
import SetupSuccess from "./pages/setup/SetupSuccess";
import Dashboard from "./pages/dashboard/Dashboard";
import AppointmentDetail from "./pages/dashboard/AppointmentDetail";
import BusinessEdit from "./pages/dashboard/BusinessEdit";
import CreateAppointment from "./pages/appointments/CreateAppointment";
import AppointmentCreated from "./pages/appointments/AppointmentCreated";
import BusinessPage from "./pages/client/BusinessPage";
import BookingConfirmation from "./pages/client/BookingConfirmation";
import BookingConfirmed from "./pages/client/BookingConfirmed";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BusinessReview from "./pages/admin/BusinessReview";
import AdminLogin from "./pages/admin/AdminLogin";
import CreateAdminAccount from "./pages/admin/CreateAdminAccount";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Business Setup */}
              <Route path="/setup" element={<BusinessSetup />} />
              <Route path="/setup/success" element={<SetupSuccess />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/appointment/:id" element={<AppointmentDetail />} />
              <Route path="/business/edit" element={<BusinessEdit />} />

              {/* Appointments */}
              <Route path="/appointments/create" element={<CreateAppointment />} />
              <Route path="/appointments/created/:id" element={<AppointmentCreated />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/businesses/:id" element={<BusinessReview />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/create" element={<CreateAdminAccount />} />

              {/* Client Booking */}
              <Route path="/booking/:slug" element={<BusinessPage />} />
              <Route path="/booking/:slug/confirm" element={<BookingConfirmation />} />
              <Route path="/booking/:slug/confirmed" element={<BookingConfirmed />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
