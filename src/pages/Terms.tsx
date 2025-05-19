
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-4 overflow-auto">
      <div className="max-w-2xl mx-auto pb-20">
        <Link 
          to="/" 
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">📝 Terms and Conditions — Flintxt</h1>
          
          <div className="prose prose-purple">
            <h2>1. Acceptance of Terms</h2>
            <p>By creating an account or subscribing to Flintxt, you agree to these Terms and Conditions. If you do not agree, please do not use our services.</p>

            <h2>2. Eligibility</h2>
            <p>You must be at least 18 years old to register and use Flintxt.</p>

            <h2>3. Subscription and Payments</h2>
            <ul>
              <li>Certain features of Flintxt require an active subscription.</li>
              <li>All subscription purchases are final and non-refundable.</li>
              <li>By subscribing, you authorize Flintxt to charge your selected payment method.</li>
            </ul>

            <h2>4. Messaging and Conduct</h2>
            <ul>
              <li>Flintxt is a text-only dating platform.</li>
              <li>You agree to use the service respectfully and avoid harassment, offensive language, illegal activities, or any abuse of the platform.</li>
              <li>We reserve the right to monitor chats for user safety.</li>
            </ul>

            <h2>5. Account Security</h2>
            <p>You are responsible for safeguarding your account credentials. You must notify us immediately if you detect any unauthorized access.</p>

            <h2>6. Suspension and Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms or engage in behavior harmful to the community.</p>

            <h2>7. Limitation of Liability</h2>
            <p>Flintxt is provided "as is" without any warranties. We are not responsible for user interactions, missed matches, or any damages arising from app use.</p>

            <h2>8. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continuing to use Flintxt after changes means you accept the new Terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
