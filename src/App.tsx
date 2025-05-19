import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import ActivationCheck from './components/ActivationCheck';
import NotificationPrompt from './components/NotificationPrompt';
import NotificationHandler from './components/NotificationHandler';
import Welcome from './pages/Welcome';
import AboutUs from './pages/AboutUs';
import Terms from "./pages/Terms";
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ResetPassword from './pages/auth/ResetPassword';
import Onboarding from './pages/Onboarding/Onboarding';
import Swipe from './pages/Swipe';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Letters from './pages/Letters';
import DailyQuestion from './pages/DailyQuestion';
import MatchRequests from './pages/MatchRequests';
import Privacy from './pages/Privacy';
import Refunds from "./pages/Refunds";
import HowToUse from "./pages/HowToUse";
import Report from "./pages/Report";
import Contact from './pages/Contact';
import PaymentVerification from './pages/Onboarding/PaymentVerification';


const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Layout><ActivationCheck>{children}</ActivationCheck></Layout>;
};

function App() {
  return (
    <Router>
      <NotificationHandler />
      <NotificationPrompt />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/how-to-use" element={<HowToUse />} />
        <Route path="/report" element={<Report />} />
        <Route path="/contact" element={<Contact />} />

        {/* Protected routes */}
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/payment-verification" element={<PrivateRoute><PaymentVerification /></PrivateRoute>} />
        <Route path="/swipe" element={<PrivateRoute><Swipe /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/letters" element={<PrivateRoute><Letters /></PrivateRoute>} />
        <Route path="/daily-question" element={<PrivateRoute><DailyQuestion /></PrivateRoute>} />
        <Route path="/match-requests" element={<PrivateRoute><MatchRequests /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;