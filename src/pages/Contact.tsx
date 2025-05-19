
import React, { useState } from 'react';
import { Send, Mail, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { Link } from 'react-router-dom';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert([formData]);

      if (dbError) throw dbError;
      
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const { user } = useAuthStore();

  return (
    <>
      {!user && (
        <Link
          to="/"
          className="fixed top-4 left-4 p-2 rounded-full bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </Link>
      )}
      <Layout showSidebar={!!user}>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Contact Us
              </h1>
            </div>

            <div className="mb-8">
              <p className="text-gray-600">
                Have questions or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
              <a href="mailto:support@flintxt.com" className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 mt-2">
                <Mail className="w-4 h-4" />
                support@flintxt.com
              </a>
            </div>

            {success && (
              <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl">
                Thank you for your message! We'll get back to you soon.
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      </Layout>
    </>
  );
}
