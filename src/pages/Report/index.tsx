import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  sender_profile: {
    first_name: string;
    age?: number;
  };
  status: string;
}

export default function Report() {
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_matches')
        .select('id, user1_id, user2_id, user1:profiles!chat_matches_user1_id_fkey(first_name, age), user2:profiles!chat_matches_user2_id_fkey(first_name, age), status')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .in('status', ['active', 'revealed'])
        .eq('user1_liked', true)
        .eq('user2_liked', true)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      
      // Transform data to include correct profile information
      const processedMatches = (data || []).map(match => ({
        ...match,
        sender_profile: match.user1_id === user?.id ? match.user2 : match.user1
      }));
      
      setMatches(processedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !message) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_user_id: selectedUser,
        message: message
      });

      if (error) throw error;
      setSuccess(true);
      setSelectedUser('');
      setMessage('');
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">Report User</h1>
            </div>

            {success && (
              <div className="mb-6 p-4 bg-purple-50 text-purple-700 rounded-xl">
                Your report has been submitted successfully. We will review it and get back to you via email soon.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  id="user"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a user to report</option>
                  {matches.length === 0 ? (
                    <option value="" disabled>No active matches found</option>
                  ) : (
                    matches.map((match) => (
                      <option 
                        key={match.id} 
                        value={match.user1_id === user?.id ? match.user2_id : match.user1_id}
                      >
                        {match.user1_id === user?.id ? match.sender_profile?.first_name : match.sender_profile?.first_name}
                        {match.sender_profile?.age ? `, ${match.sender_profile.age}` : ''}
                        {match.status === 'revealed' ? ' (Revealed)' : ' (Active)'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Report Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={4}
                  required
                  placeholder="Please describe the issue..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !selectedUser || !message}
                className="w-full py-3 px-6 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}