import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ActivationCheckProps {
  children: React.ReactNode;
}

export default function ActivationCheck({ children }: ActivationCheckProps) {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [subscriptionEnded, setSubscriptionEnded] = useState<boolean>(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const checkActivation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_active, subscription_ended')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking activation:', error);
          setLoading(false);
          return;
        }

        setIsActive(profile?.is_active ?? false);
        setSubscriptionEnded(profile?.subscription_ended ?? false);
      } catch (error) {
        console.error('Error checking activation:', error);
      } finally {
        setLoading(false);
      }
    };

    checkActivation();
    const interval = setInterval(checkActivation, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoadError(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          {loadError && (
            <div className="text-red-500 text-sm mt-2">
              Slow connection detected. Please check your internet connection and refresh the page.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isActive === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if ((isActive && subscriptionEnded) || (!isActive)) {
    if (window.location.pathname !== '/payment-verification' && window.location.pathname !== '/onboarding') {
      if (isActive && subscriptionEnded) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
              <h2 className="text-2xl font-bold mb-4">Subscription Expired</h2>
              <p className="text-gray-600 mb-4">
                Your subscription has expired. Please renew your subscription to continue using all features.
              </p>
              <button
                onClick={() => navigate('/payment-verification')}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Go to Payment Page
              </button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
              <h2 className="text-2xl font-bold mb-4">Account Pending Activation</h2>
              <p className="text-gray-600 mb-4">
                Your account is currently pending activation. Please wait while we verify your payment.
                This usually takes up to 12 hours.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You'll receive access to all features once your account is activated.
              </p>
              <button
                onClick={() => navigate('/payment-verification')}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Go to Payment Page(if missed)
              </button>
            </div>
          </div>
        );
      }
    }
  }

  return <>{children}</>;
}
