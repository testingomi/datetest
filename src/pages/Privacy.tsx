
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
          <h1 className="text-2xl font-bold mb-6">🔒 Privacy Policy — Flintxt</h1>
          
          <div className="prose prose-purple">
            <h2>1. Information We Collect</h2>
            <ul>
              <li>Account Information: Username, email, age.</li>
              <li>Subscription Details: Payment method (processed securely by third-party services), subscription plan.</li>
              <li>Messaging Data: Text messages exchanged within the app.</li>
              <li>Device and Usage Information: IP address, device type, and general app usage patterns.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <ul>
              <li>To operate and improve Flintxt.</li>
              <li>To process your subscription and manage billing.</li>
              <li>To ensure user safety and app integrity.</li>
              <li>To send service-related communications (important updates, billing reminders, etc.).</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <ul>
              <li>We do not sell your personal data.</li>
              <li>Information may be disclosed if required by law or to enforce our Terms of Service.</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We use reasonable security practices to protect your data, but no platform is completely secure.</p>

            <h2>5. Your Rights</h2>
            <ul>
              <li>You may request access to or deletion of your personal data by contacting us.</li>
              <li>Cancellation of subscription is possible at any time, but refunds will not be issued after purchase.</li>
            </ul>

            <h2>6. Changes to Privacy Policy</h2>
            <p>We may update this policy periodically. Continued use of Flintxt after changes means you accept the updated policy.</p>

            <h2>7. Contact Us</h2>
            <p>For questions, support, or concerns, please contact us at: support@flintxt.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
