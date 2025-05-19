
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Refunds() {
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
          <h1 className="text-2xl font-bold mb-6">💰 Cancellations & Refunds — Flintxt</h1>
          
          <div className="prose prose-purple">
            <h2>Cancellation Policy</h2>
            <p>You may cancel your subscription at any time. Upon cancellation:</p>
            <ul>
              <li>Your subscription will remain active until the end of your current billing period</li>
              <li>You will continue to have access to premium features until the subscription expires</li>
              <li>No partial refunds will be issued for unused time</li>
            </ul>

            <h2>No Refund Policy</h2>
            <p>Please note that all payments made to Flintxt are non-refundable. This includes:</p>
            <ul>
              <li>Subscription payments</li>
              <li>Premium feature purchases</li>
              <li>Any other monetary transactions within the platform</li>
            </ul>

            <h2>Important Notes</h2>
            <ul>
              <li>All sales are final</li>
              <li>We do not provide refunds for any reason</li>
              <li>Please make sure to review our services before making a purchase</li>
            </ul>

            <h2>Contact</h2>
            <p>If you have any questions about our cancellation and refund policies, please contact our support team at support@flintxt.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
