import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Sparkles,
  MessageCircle,
  Users,
  Coffee,
  CheckCircle,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { supabase } from "../lib/supabase";

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  React.useEffect(() => {
    if (user) {
      // Check if profile exists and is complete before redirecting
      const checkProfile = async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile || !profile.first_name || !profile.gender) {
          navigate("/onboarding");
        } else {
          navigate("/swipe");
        }
      };

      checkProfile();
    }
  }, [user, navigate]);

  // Testimonials data
  const testimonials = [
    {
      text: "Finally found someone who appreciates my dad jokes! We've been talking for weeks!",
      name: "Shruti, 22",
    },
    {
      text: "I love that my personality shines through before my appearance. Made such genuine connections!",
      name: "Ayush, 24",
    },
    {
      text: "My match and I started as friends and now we're planning our first date. Thank you flintxt!",
      name: "Riya, 20",
    },
  ];

  // Stats data
  const stats = [
    { value: "94%", label: "Meaningful Matches" },
    { value: "100%", label: "Active Users" },
    { value: "82%", label: "Response Rate" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 overflow-x-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-200 rounded-full blur-2xl opacity-30 animate-[float_15s_ease-in-out_infinite]"></div>
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-pink-200 rounded-full blur-2xl opacity-30 animate-[float_20s_ease-in-out_infinite_2s]"></div>
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-purple-200 rounded-full blur-2xl opacity-30 animate-[float_18s_ease-in-out_infinite_1s]"></div>
        <div className="absolute -bottom-20 right-1/3 w-64 h-64 bg-pink-200 rounded-full blur-2xl opacity-30 animate-[float_12s_ease-in-out_infinite_0.5s]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="transform hover:scale-110 transition-transform duration-300">
              <Heart className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              flintxt
            </h1>
          </div>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-purple-600 font-medium hover:text-purple-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Join Now
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left animate-[slideDown_1.2s_ease-out]">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Where Friendship
                <span className="relative inline-block px-1 mx-1">
                  <span className="relative z-10 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Meets
                  </span>
                </span>
                <span className="relative inline-block px-1">
                  <span className="relative z-10 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Romance
                  </span>
                  <div className="absolute bottom-0 left-0 w-full h-3 bg-purple-100 -rotate-1 transition-transform duration-300"></div>
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mt-6 max-w-xl mx-auto lg:mx-0">
                Make genuine connections based on personality, not just
                pictures. Find friends or maybe something more through
                meaningful text-based conversations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-8 animate-[slideUp_1s_ease-out_0.6s] opacity-0 [animation-fill-mode:forwards]">
                <Link
                  to="/signup"
                  className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                  <span>Join Now</span>
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-white text-purple-600 rounded-full font-medium border-2 border-purple-200 hover:bg-purple-50 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
                >
                  Sign In
                </Link>
              </div>

              {/* App Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-8 mt-10">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="animate-[fadeIn_0.5s_ease-out_forwards] opacity-0"
                    style={{ animationDelay: `${0.8 + index * 0.2}s` }}
                  >
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="relative animate-[slideUp_1.2s_ease-out]">
              <div className="relative mx-auto w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-2xl transform -rotate-6"></div>
                <div className="relative bg-white rounded-2xl shadow-xl p-6 border border-purple-100 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>

                  {/* Mock Chat UI */}
                  <div className="flex flex-col gap-4">
                    <div className="self-start max-w-[80%] bg-gray-100 rounded-2xl rounded-tl-none p-4">
                      <p className="text-gray-800">
                        Hey there! I noticed you're into classic literature too.
                        Who's your favorite author?
                      </p>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        2:34 PM
                      </p>
                    </div>

                    <div className="self-end max-w-[80%] bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-none p-4">
                      <p>
                        Jane Austen for sure! I love how she captures the
                        subtleties of human relationships. You?
                      </p>
                      <p className="text-xs text-white/80 mt-1">2:36 PM</p>
                    </div>

                    <div className="self-start max-w-[80%] bg-gray-100 rounded-2xl rounded-tl-none p-4">
                      <p className="text-gray-800">
                        Oh, I'm a huge Dostoevsky fan! But I've been meaning to
                        read more Austen. Any recommendations on where to start?
                      </p>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        2:38 PM
                      </p>
                    </div>

                    <div className="self-end max-w-[80%] bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-none p-4 animate-pulse-soft">
                      <p>
                        Pride and Prejudice is the classic starting point, but I
                        personally love Persuasion. It's more mature and
                        heartfelt.
                      </p>
                      <p className="text-xs text-white/80 mt-1">Just now</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="w-full bg-gray-100 border-none rounded-full py-3 px-4 text-gray-700 focus:ring-2 focus:ring-purple-500"
                      disabled
                    />
                    <button className="bg-purple-600 text-white p-3 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 2-7 20-4-9-9-4Z"></path>
                        <path d="M22 2 11 13"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 bg-pink-100 p-4 rounded-2xl shadow-lg transform rotate-6 animate-float">
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
              <div
                className="absolute -bottom-4 -left-4 bg-purple-100 p-4 rounded-2xl shadow-lg transform -rotate-12 animate-float"
                style={{ animationDelay: "1s" }}
              >
                <MessageCircle className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              How Flintxt Works
            </h2>
            <p className="text-gray-600 mt-4 max-w-xl mx-auto">
              Our unique text-first approach helps you make meaningful
              connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: "Create Your Profile",
                description:
                  "Answer thoughtful questions about your personality, interests, and communication style.",
                icon: Users,
              },
              {
                step: 2,
                title: "Connect Through Text",
                description:
                  "Exchange messages with potential matches based on compatibility, not just appearances.",
                icon: MessageCircle,
              },
              {
                step: 3,
                title: "Reveal When Ready",
                description:
                  "Only share social profiles when you've established a meaningful connection.",
                icon: Heart,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-purple-50"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-6">
                  {item.step}
                </div>
                <div className="flex items-center mb-4">
                  <item.icon className="w-6 h-6 text-purple-600 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {item.title}
                  </h3>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Why Choose Flintxt
            </h2>
            <p className="text-gray-600 mt-4 max-w-xl mx-auto">
              Our app is designed to foster genuine connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Meaningful Chats",
                description:
                  "Connect through engaging conversations, not just swiping photos.",
                icon: MessageCircle,
                color: "from-purple-600 to-indigo-600",
              },
              {
                title: "Friend or Date",
                description:
                  "You decide how you want to connect - friendship, romance, or more.",
                icon: Heart,
                color: "from-pink-600 to-rose-600",
              },
              {
                title: "Daily Matches",
                description:
                  "Receive compatible matches daily based on your preferences.",
                icon: Coffee,
                color: "from-amber-600 to-orange-600",
              },
              {
                title: "Privacy First",
                description:
                  "Share your information only when you feel comfortable.",
                icon: Shield,
                color: "from-emerald-600 to-green-600",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform hover:-translate-y-1 transition-all duration-300 group hover:shadow-xl border border-white/50"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              What Our Users Say
            </h2>
            <p className="text-gray-600 mt-4 max-w-xl mx-auto">
              Real experiences from our community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg relative transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-5xl text-purple-200 absolute top-4 left-4 leading-none font-serif">
                  "
                </div>
                <div className="relative z-10">
                  <p className="text-gray-700 italic mb-6">
                    {testimonial.text}
                  </p>
                  <p className="text-purple-600 font-medium">
                    {testimonial.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Find Your Perfect Match?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are making meaningful connections based
            on personality, not just appearances.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/about"
              className="px-8 py-4 bg-white text-purple-600 rounded-xl font-medium border-2 border-purple-200 hover:bg-purple-50 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
            >
              Learn More
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6">
            {[
              { icon: CheckCircle, text: "No Photos Required" },
              { icon: Shield, text: "Privacy Protected" },
              { icon: Clock, text: "Quick Setup" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-700"
              >
                <item.icon className="w-5 h-5 text-purple-600" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <Heart className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                flintxt
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <Link
                to="/about"
                className="hover:text-purple-600 transition-colors"
              >
                About Us
              </Link>
              <Link
                to="/privacy"
                className="hover:text-purple-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="hover:text-purple-600 transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link
                to="/refunds"
                className="hover:text-purple-600 transition-colors"
              >
                Refunds
              </Link>
              <Link
                to="/contact"
                className="hover:text-purple-600 transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="border-t border-purple-100 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} Flintxt. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
