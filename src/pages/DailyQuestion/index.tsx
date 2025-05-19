import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

interface Answer {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: {
    first_name: string;
  };
}

interface DailyQuestion {
  id: string;
  question: string;
  created_at: string;
}

export default function DailyQuestion() {
  const { user } = useAuthStore();
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    fetchTodayQuestion();
    fetchAnswers();
  }, []);

  const fetchTodayQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_questions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setQuestion(data);
    } catch (error) {
      console.error('Error fetching question:', error);
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_answers')
        .select(`
          *,
          profile:profiles(first_name)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setAnswers(data);
        setHasAnswered(data.some(answer => answer.user_id === user?.id));
      }
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim() || !question) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('daily_answers')
        .insert([
          {
            user_id: user?.id,
            question_id: question.id,
            content: newAnswer.trim(),
          }
        ]);

      if (error) throw error;
      setNewAnswer('');
      setHasAnswered(true);
      fetchAnswers();
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-4">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        {question && (
          <>
            <div className="bg-white rounded-t-2xl shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900">Daily Question</h1>
              <p className="text-purple-600 text-lg mt-4">{question.question}</p>
            </div>

            {/* Answers */}
            <div className="flex-1 bg-white shadow-lg overflow-y-auto p-6">
              <div className="space-y-4">
                {answers.map((answer) => (
                  <div
                    key={answer.id}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4 text-purple-600" />
                      <p className="text-sm text-gray-600">
                        {answer.profile.first_name}
                      </p>
                    </div>
                    <p className="text-gray-900">{answer.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer Input */}
            {!hasAnswered && (
              <div className="bg-white rounded-b-2xl shadow-lg p-4">
                <form onSubmit={submitAnswer} className="space-y-4">
                  <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newAnswer.trim()}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}