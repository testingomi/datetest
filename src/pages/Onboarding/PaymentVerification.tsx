import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Save } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth";
import paymentQR from './flintxtpayment.png';

export default function PaymentVerification() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [utrId, setUtrId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [couponError, setCouponError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setLoading(true);
    setCouponError("");
    setCouponSuccess(false);

    try {
      const { data, error } = await supabase.rpc(
        "validate_coupon_and_activate",
        {
          coupon_code: couponCode.trim().toUpperCase(),
          user_id: user?.id,
        },
      );

      if (error) {
        console.error("Validation error:", error);
        if (error.message.includes("duplicate key")) {
          setCouponError("This coupon has already been used");
        } else if (error.code === "PGRST116") {
          setCouponError("Invalid or expired coupon code");
        } else {
          setCouponError("An error occurred. Please try again later");
        }
        return;
      }

      if (data === true) {
        setCouponSuccess(true);
        setTimeout(() => {
          navigate('/swipe');
        }, 2000);
      } else {
        setCouponError("Invalid or expired coupon code");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setCouponError("An unexpected error occurred. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const { error: paymentError } = await supabase
        .from("payment_verifications")
        .insert({
          user_id: user.id,
          name: name,
          utr_id: utrId,
          status: "pending",
        });

      if (paymentError) throw paymentError;

      alert(
        "Payment verification submitted successfully! Your account will be activated within 12 hours.",
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate('/swipe');
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to submit payment verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-100 to-pink-50">
      <div className="h-full w-full flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
              Activate Your Account
            </h1>
            <p className="text-gray-600">
              Choose your preferred activation method
            </p>
          </div>

          {!showPaymentForm && !couponSuccess && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Have a Coupon Code?
              </h2>
              <form onSubmit={handleCouponSubmit} className="space-y-4">
                {couponError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {couponError}
                  </div>
                )}
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-100 focus:border-pink-300"
                  placeholder="Enter your coupon code"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "Apply Coupon"
                  )}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="text-pink-500 hover:text-pink-600 font-medium"
                >
                  Or continue with payment →
                </button>
              </div>
            </div>
          )}

          {couponSuccess && (
            <div className="bg-green-50 rounded-xl p-8 text-center animate-fade-in">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Coupon Applied Successfully!
              </h2>
              <p className="text-gray-600">
                Your account has been activated. Redirecting...
              </p>
            </div>
          )}

          {showPaymentForm && !couponSuccess && (
            <div className="bg-white rounded-xl shadow-sm">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-pink-500 hover:text-pink-600 p-6 flex items-center"
              >
                ← Back to coupon
              </button>

              <div className="px-6 pb-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-3xl font-bold text-gray-800">₹79</p>
                    <span className="text-gray-400">/</span>
                    <p className="text-gray-600">19 Days</p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <p className="flex items-center text-gray-600 text-sm">
                      <span className="mr-2">•</span>7 Swipes Per Day
                    </p>
                    <p className="flex items-center text-gray-600 text-sm">
                      <span className="mr-2">•</span>Letter Exchange
                    </p>
                    <p className="flex items-center text-gray-600 text-sm">
                      <span className="mr-2">•</span>Chat Access
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <p className="font-medium mb-1 text-gray-600 text-sm">UPI ID:</p>
                    <p className="text-gray-800 text-lg font-semibold select-all">
                      flintxt.payment@ybl
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="font-medium mb-3 text-gray-600 text-sm">Scan QR Code:</p>
                    <div className="relative w-full max-w-[200px] mx-auto bg-white p-3 rounded-lg shadow-sm">
                      <img
                        src={paymentQR}
                        alt="Payment QR Code"
                        className="w-full aspect-square object-contain rounded"
                      />
                      <div className="flex items-center justify-center gap-2 mt-2 text-pink-500 text-sm">
                        <Save className="w-4 h-4" />
                        Hold & save QR
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (as shown in UPI app)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-100 focus:border-pink-300"
                      placeholder="Enter name used for payment"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTR/UPI Transaction ID
                    </label>
                    <input
                      type="text"
                      value={utrId}
                      onChange={(e) => setUtrId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-pink-100 focus:border-pink-300"
                      placeholder="Enter UTR or UPI Transaction ID"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find this in PhonePe (UTR) or Google Pay (UPI Transaction
                      ID)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      "Submit Payment Verification"
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
