import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart, Send, ChevronLeft, Instagram, ExternalLink, Info, Trash2, Clock, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  is_sender?: boolean;
}

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  expires_at: string;
  partner_id?: string;
  partner_name?: string;
  partner_profile?: any;
  messages?: Message[];
  user1_liked: boolean;
  user2_liked: boolean;
  both_liked?: boolean;
  user1_reveal_instagram: boolean;
  user2_reveal_instagram: boolean;
  both_reveal_instagram?: boolean;
}

export default function Chat() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentChat, setCurrentChat] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpiry, setShowExpiry] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [instagramRevealed, setInstagramRevealed] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const matchId = params.get('matchId');
    const autoSelect = params.get('autoSelect') === 'true';
    const newMatch = params.get('newMatch') === 'true';
    
    if (matchId && autoSelect) {
      fetchMatches(matchId, newMatch);
    } else {
      fetchMatches();
    }
  }, [location]);

  useEffect(() => {
    // Check if there's a match in location state (from other components)
    if (location.state?.chatMatch && location.state?.matchId) {
      const { chatMatch, matchId, autoSelect, newMatch } = location.state;
      
      if (chatMatch && matchId && autoSelect) {
        fetchMatches(matchId, newMatch);
      }
    }
  }, [location.state]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentChat]);

  // Setup real-time updates for new messages
  useEffect(() => {
    if (!user?.id) return;
    
    const subscription = supabase
      .channel('chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, handleNewMessage)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, selectedMatch]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMatches = async (selectMatchId?: string, isNewMatch?: boolean) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get all matches for the current user
      const { data, error } = await supabase
        .from('chat_matches')
        .select(`
          *,
          partner_profile:profiles!chat_matches_user2_id_fkey(
            id, first_name, age, instagram_id, city, state, occupation, 
            gender, bio, tagline, mental_tags, looking_for, love_language, 
            text_style, current_song, ick, green_flag
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .in('status', ['active', 'revealed', 'pending_reveal'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Process match data
        const processedMatches = await Promise.all(data.map(async (match) => {
          // Determine partner ID based on which user is the current user
          const partnerId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          
          // Check which user is current user to determine liked status
          const isUser1 = match.user1_id === user.id;
          const userLiked = isUser1 ? match.user1_liked : match.user2_liked;
          const partnerLiked = isUser1 ? match.user2_liked : match.user1_liked;
          const bothLiked = userLiked && partnerLiked;
          
          // Similarly determine instagram reveal status
          const userRevealInstagram = isUser1 ? match.user1_reveal_instagram : match.user2_reveal_instagram;
          const partnerRevealInstagram = isUser1 ? match.user2_reveal_instagram : match.user1_reveal_instagram;
          const bothRevealInstagram = userRevealInstagram && partnerRevealInstagram;

          // Fetch partner profile if needed
          let partnerProfile = null;
          if (isUser1) {
            partnerProfile = match.partner_profile;
          } else {
            // For user2, we need to fetch user1's profile separately
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, first_name, age, instagram_id, city, state, occupation, gender, bio, tagline, mental_tags, looking_for, love_language, text_style, current_song, ick, green_flag')
              .eq('id', match.user1_id)
              .single();
            
            partnerProfile = profile;
          }
          
          // Get recent messages for the match
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (messagesError) console.error('Error fetching messages:', messagesError);
          
          return {
            ...match,
            partner_id: partnerId,
            partner_name: partnerProfile?.first_name || 'Unknown',
            partner_profile: partnerProfile,
            last_message: messages && messages.length > 0 ? messages[0] : null,
            user_liked: userLiked,
            partner_liked: partnerLiked,
            both_liked: bothLiked,
            user_reveal_instagram: userRevealInstagram,
            partner_reveal_instagram: partnerRevealInstagram,
            both_reveal_instagram: bothRevealInstagram
          };
        }));
        
        setMatches(processedMatches);
        
        // Auto-select a match if ID provided
        if (selectMatchId) {
          const matchToSelect = processedMatches.find(m => m.id === selectMatchId);
          if (matchToSelect) {
            setSelectedMatch(matchToSelect);
            fetchMessages(matchToSelect.id);
            
            if (isNewMatch) {
              // Show welcome message for new matches
              setTimeout(() => {
                alert(`You've matched with ${matchToSelect.partner_name}! Say hello and start chatting.`);
              }, 500);
            }
          }
        } else if (processedMatches.length > 0 && !selectedMatch) {
          // Auto-select first match if none selected
          setSelectedMatch(processedMatches[0]);
          fetchMessages(processedMatches[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (matchId: string) => {
    if (!matchId) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        // Mark messages as read
        const unreadMessages = data.filter(msg => 
          msg.receiver_id === user?.id && !msg.read_at
        );
        
        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map(msg => msg.id);
          await supabase
            .from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
        }
        
        // Add a property to identify sender messages
        const formattedMessages = data.map(message => ({
          ...message,
          is_sender: message.sender_id === user?.id
        }));
        
        setCurrentChat(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleNewMessage = async (payload: any) => {
    const newMessage = payload.new;
    
    // Only process if related to selected match
    if (selectedMatch && newMessage.match_id === selectedMatch.id) {
      // Check if the message is already in the chat
      const messageExists = currentChat.some(msg => msg.id === newMessage.id);
      
      if (!messageExists) {
        // Add is_sender property
        const formattedMessage = {
          ...newMessage,
          is_sender: newMessage.sender_id === user?.id
        };
        
        // Add to current chat
        setCurrentChat(prev => [...prev, formattedMessage]);
        
        // Mark as read if receiving
        if (newMessage.receiver_id === user?.id) {
          await supabase
            .from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', newMessage.id);
        }
      }
    }
    
    // Refresh match list to update last message
    fetchMatches();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMatch || !newMessage.trim() || !user?.id) return;
    
    // Determine if current match allows sending messages
    const isValidStatus = ['active', 'revealed', 'pending_reveal'].includes(selectedMatch.status);
    
    if (!isValidStatus) {
      alert('You cannot send messages in this chat.');
      return;
    }
    
    setSending(true);
    try {
      const message = {
        match_id: selectedMatch.id,
        sender_id: user.id,
        receiver_id: selectedMatch.partner_id,
        content: newMessage.trim(),
      };
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(message)
        .select();
        
      if (error) throw error;
      
      if (data) {
        // Add the message to the current chat
        const newMsg = {
          ...data[0],
          is_sender: true
        };
        
        setCurrentChat(prev => [...prev, newMsg]);
        setNewMessage('');
        
        // Update the match's updated_at timestamp
        await supabase
          .from('chat_matches')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedMatch.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
    fetchMessages(match.id);
    
    // Set UI states based on selected match
    const isUser1 = match.user1_id === user?.id;
    setUserLiked(isUser1 ? match.user1_liked : match.user2_liked);
    setInstagramRevealed(isUser1 ? match.user1_reveal_instagram : match.user2_reveal_instagram);
  };

  const toggleLike = async () => {
    if (!selectedMatch || !user?.id) return;
    
    setLikeLoading(true);
    try {
      const isUser1 = selectedMatch.user1_id === user.id;
      const field = isUser1 ? 'user1_liked' : 'user2_liked';
      const newLikeValue = !userLiked;
      
      // Update the like status
      const { error } = await supabase
        .from('chat_matches')
        .update({ [field]: newLikeValue })
        .eq('id', selectedMatch.id);
        
      if (error) throw error;
      
      // Update local state
      setUserLiked(newLikeValue);
      
      // Refresh matches to update the both_liked status
      fetchMatches(selectedMatch.id);
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const toggleRevealInstagram = async () => {
    if (!selectedMatch || !user?.id) return;
    
    setRevealLoading(true);
    try {
      const isUser1 = selectedMatch.user1_id === user.id;
      const field = isUser1 ? 'user1_reveal_instagram' : 'user2_reveal_instagram';
      const newRevealValue = !instagramRevealed;
      
      // Update the reveal status
      const { error } = await supabase
        .from('chat_matches')
        .update({ [field]: newRevealValue })
        .eq('id', selectedMatch.id);
        
      if (error) throw error;
      
      // If both now reveal, update match status to revealed
      if (newRevealValue && (isUser1 ? selectedMatch.partner_reveal_instagram : selectedMatch.user1_reveal_instagram)) {
        await supabase
          .from('chat_matches')
          .update({ status: 'revealed' })
          .eq('id', selectedMatch.id);
      } else if (!newRevealValue && selectedMatch.status === 'revealed') {
        // If removing reveal and status was revealed, go back to pending_reveal
        await supabase
          .from('chat_matches')
          .update({ status: 'pending_reveal' })
          .eq('id', selectedMatch.id);
      }
      
      // Update local state
      setInstagramRevealed(newRevealValue);
      
      // Refresh matches to update all the states
      fetchMatches(selectedMatch.id);
    } catch (error) {
      console.error('Error toggling instagram reveal:', error);
      alert('Failed to update instagram reveal status. Please try again.');
    } finally {
      setRevealLoading(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  const getRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h left`;
  };

  const filteredMatches = matches.filter(match => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return match.partner_name.toLowerCase().includes(query);
  });
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 flex">
        {/* Match List (left sidebar) */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white ${selectedMatch ? 'hidden md:block' : ''}`}>
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div className="h-[calc(100vh-10rem)] overflow-y-auto">
            {loading && matches.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <div className="bg-purple-100 p-4 rounded-full mb-4">
                  <Heart className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">No Matches Yet</h3>
                <p className="text-gray-600 mb-4">
                  Find new people to chat with by swiping in the Match screen.
                </p>
                <button
                  onClick={() => navigate('/swipe')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Find Matches
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredMatches.map((match) => (
                  <div
                    key={match.id}
                    onClick={() => handleSelectMatch(match)}
                    className={cn(
                      "p-4 hover:bg-purple-50 cursor-pointer transition-colors",
                      selectedMatch?.id === match.id ? "bg-purple-50" : ""
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <h3 className="font-medium text-gray-900">
                              {match.partner_name}, {match.partner_profile?.age}
                            </h3>
                            {match.both_liked && (
                              <Heart className="w-4 h-4 ml-2 text-pink-500 fill-pink-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {match.last_message ? 
                              formatMessageTime(match.last_message.created_at) : 
                              match.status === 'active' ? 
                                getRemainingTime(match.expires_at) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {match.last_message ? 
                            (match.last_message.sender_id === user?.id ? 'You: ' : '') + match.last_message.content :
                            'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area (right content) */}
        <div className={`flex-1 flex flex-col ${!selectedMatch ? 'hidden md:flex' : ''}`}>
          {selectedMatch ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="md:hidden mr-3 p-1 rounded-full hover:bg-gray-100"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900">
                          {selectedMatch.partner_name}, {selectedMatch.partner_profile?.age}
                        </h2>
                        {selectedMatch.both_liked && (
                          <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        {/* Show expiry for active matches */}
                        {selectedMatch.status === 'active' && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{getRemainingTime(selectedMatch.expires_at)}</span>
                          </div>
                        )}
                        
                        {/* Show status for other matches */}
                        {selectedMatch.status === 'revealed' && (
                          <div className="flex items-center">
                            <Shield className="w-3 h-3 mr-1 text-green-500" />
                            <span className="text-green-500">Instagram Revealed</span>
                          </div>
                        )}
                        
                        {selectedMatch.status === 'pending_reveal' && (
                          <div className="flex items-center">
                            <Info className="w-3 h-3 mr-1 text-blue-500" />
                            <span className="text-blue-500">Reveal Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={toggleLike}
                      disabled={likeLoading}
                      className={`p-2 rounded-full ${
                        userLiked
                          ? "bg-pink-100 text-pink-500 hover:bg-pink-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      } transition-colors`}
                    >
                      <Heart className={`w-5 h-5 ${userLiked ? "fill-pink-500" : ""}`} />
                    </button>
                    
                    <button
                      onClick={() => setProfileExpanded(!profileExpanded)}
                      className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Profile Preview (expanded) */}
                {profileExpanded && selectedMatch.partner_profile && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Location:</p>
                        <p className="text-gray-900">{selectedMatch.partner_profile.city}, {selectedMatch.partner_profile.state}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Occupation:</p>
                        <p className="text-gray-900">{selectedMatch.partner_profile.occupation}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Bio:</p>
                        <p className="text-gray-900">{selectedMatch.partner_profile.bio}</p>
                      </div>
                      
                      {/* Instagram Section */}
                      <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Instagram className="w-5 h-5 text-gray-700" />
                            <p className="font-medium text-gray-700">Instagram:</p>
                          </div>
                          
                          <button
                            onClick={toggleRevealInstagram}
                            disabled={revealLoading}
                            className={`px-3 py-1 text-sm rounded-full ${
                              instagramRevealed
                                ? "bg-green-100 text-green-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {instagramRevealed ? "Shared" : "Share Mine"}
                          </button>
                        </div>
                        
                        {selectedMatch.both_reveal_instagram ? (
                          <div className="mt-3 p-3 bg-white rounded-lg shadow-sm">
                            <a
                              href={selectedMatch.partner_profile.instagram_id}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-pink-500 hover:text-pink-600"
                            >
                              <Instagram className="w-4 h-4" />
                              <span>{selectedMatch.partner_profile.instagram_id.replace('https://instagram.com/', '@')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-gray-500">
                            {instagramRevealed ? 
                              "Waiting for your match to share their Instagram..." :
                              "Share your Instagram to reveal your match's profile"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
                {currentChat.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="bg-purple-100 p-4 rounded-full mb-4">
                      <Heart className="w-8 h-8 text-purple-500" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">Start chatting with {selectedMatch.partner_name}</h3>
                    <p className="text-gray-600 max-w-md">
                      Send a message to start your conversation. Remember, you have limited time to make a connection!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {showExpiry && selectedMatch.status === 'active' && (
                      <div className="bg-yellow-50 p-3 rounded-lg text-center text-sm text-yellow-700 mb-4">
                        <p className="font-medium">Chat expires in {getRemainingTime(selectedMatch.expires_at)}</p>
                        <p>Make your connection count!</p>
                        <button 
                          onClick={() => setShowExpiry(false)}
                          className="text-xs text-yellow-600 hover:text-yellow-700 underline mt-1"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {currentChat.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_sender ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                            message.is_sender
                              ? 'bg-purple-600 text-white rounded-br-none'
                              : 'bg-white text-gray-800 rounded-bl-none'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p
                            className={`text-xs mt-1 text-right ${
                              message.is_sender ? 'text-purple-200' : 'text-gray-500'
                            }`}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={
                      !['active', 'revealed', 'pending_reveal'].includes(selectedMatch.status) || 
                      sending
                    }
                  />
                  <button
                    type="submit"
                    disabled={
                      !newMessage.trim() || 
                      sending || 
                      !['active', 'revealed', 'pending_reveal'].includes(selectedMatch.status)
                    }
                    className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md p-6">
                <div className="bg-purple-100 p-6 rounded-full inline-block mb-6">
                  <Heart className="w-12 h-12 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Conversations</h2>
                <p className="text-gray-600 mb-6">
                  Select a chat from the list to view your conversation or find new matches to talk to.
                </p>
                <button
                  onClick={() => navigate('/swipe')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Find New Matches
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}