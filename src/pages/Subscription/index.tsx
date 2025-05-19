import React from 'react';
import { useNavigate } from 'react-router-dom';

function Subscription() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Choose Your Plan</h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Free</h2>
                <p className="text-4xl font-bold text-purple-600 mt-4">$0</p>
                <p className="text-gray-500 mt-2">per month</p>
              </div>

              <ul className="space-y-4 mb-6">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  5 matches per day
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Basic profile customization
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Standard matching algorithm
                </li>
              </ul>

              <button 
                onClick={() => navigate('/swipe')}
                className="w-full py-3 px-6 text-purple-600 font-medium bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                Current Plan
              </button>
            </div>

            {/* Premium Plan */}
            <div className="bg-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Premium</h2>
                <p className="text-4xl font-bold mt-4">$14.99</p>
                <p className="text-purple-200 mt-2">per month</p>
              </div>

              <ul className="space-y-4 mb-6">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-purple-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Unlimited matches
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-purple-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Advanced profile customization
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-purple-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Priority matching algorithm
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-purple-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  See who liked you
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-purple-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Message before matching
                </li>
              </ul>

              <button 
                className="w-full py-3 px-6 bg-white text-purple-600 font-medium rounded-lg hover:bg-purple-50 transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 mt-8">
            All plans include our core features: personality-based matching, secure messaging, and 24/7 support
          </p>
        </div>
      </div>
    </div>
  );
}

export default Subscription;