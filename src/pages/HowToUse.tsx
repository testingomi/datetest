
import React from 'react';
import { Heart, MessageSquare, Mail, Bell, Coffee, Shield, Instagram, User, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function HowToUse() {
  const features = [
    {
      title: "Profile Setup",
      icon: User,
      steps: [
        "Complete your basic information during onboarding",
        "Add your details",
        "Set your preferences for matching",
        "Add your interests and mental aesthetic tags",
        "Customize your profile with love language and text style"
      ]
    },
    {
      title: "Finding Matches",
      icon: Heart,
      steps: [
        "Visit the 'Find Match' section",
        "Use filters to set age range and preferences",
        "Swipe right to like, left to pass",
        "Get notified when you have a mutual match",
        "Limited daily swipes to ensure quality matches"
      ]
    },
    {
      title: "Chat System",
      icon: MessageSquare,
      steps: [
        "7-day chat window with matches",
        "Exchange messages to get to know each other",
        "View profile details while chatting",
        "Like the chat to show extra interest",
        "Option to reveal Instagram after mutual likes"
      ]
    },
    {
      title: "Match Requests",
      icon: Bell,
      steps: [
        "Check 'Match Requests' for incoming matches",
        "View detailed profiles of potential matches",
        "Accept or decline match requests",
        "Start chatting immediately after accepting",
        "Get notifications for new requests"
      ]
    },
    {
      title: "Letter Exchange",
      icon: Mail,
      steps: [
        "Write thoughtful letters to potential matches",
        "Express yourself in a longer format",
        "Read and respond to received letters",
        "Connect through meaningful conversations",
        "Transform letter exchanges into chats"
      ]
    },
    {
      title: "Safety Features",
      icon: Shield,
      steps: [
        "Profile verification system",
        "Report inappropriate behavior",
        "Privacy settings management",
        "Secure chat environment"
      ]
    }
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            How to Use Flintxt
          </h1>
          <p className="text-gray-600 text-lg">
            Your guide to making meaningful connections
          </p>
        </div>

        <div className="space-y-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{feature.title}</h2>
              </div>
              
              <div className="pl-16">
                <ul className="space-y-3">
                  {feature.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-center gap-3 text-gray-700">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                        {stepIndex + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">
            Ready to start connecting with others?
          </p>
          <Link
            to="/swipe"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Heart className="w-5 h-5 mr-2" />
            Start Matching
          </Link>
        </div>
      </div>
    </Layout>
  );
}
