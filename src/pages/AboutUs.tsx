
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Users, Coffee, MessageCircle, Shield } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
            About Flintxt
          </h1>

          <div className="space-y-8">
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                Flintxt is a unique text-based dating platform that prioritizes meaningful connections through conversations. We believe that true connections start with words, not just pictures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-purple-900">Our Mission</h2>
                </div>
                <p className="text-gray-700">
                  To create genuine connections by focusing on personality and communication rather than superficial judgments.
                </p>
              </div>

              <div className="bg-pink-50 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-pink-600" />
                  <h2 className="text-xl font-semibold text-pink-900">Our Community</h2>
                </div>
                <p className="text-gray-700">
                  A diverse group of individuals seeking authentic relationships through meaningful conversations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <Coffee className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Personal Touch</h3>
                <p className="text-gray-600">Daily matches tailored to your preferences</p>
              </div>
              <div className="text-center">
                <MessageCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Quality Conversations</h3>
                <p className="text-gray-600">Focus on meaningful dialogue</p>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Safe Environment</h3>
                <p className="text-gray-600">Verified profiles and monitored interactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
