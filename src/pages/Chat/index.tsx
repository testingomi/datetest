import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Clock,
  Heart,
  X,
  Instagram,
  AlertCircle,
  MessageSquare,
  User,
  ChevronLeft,
  MapPin,
  Briefcase,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

interface ChatMatch {
  id: string;
  user1_id: string;
  user2_id: string;
  expires_at: string;
  status: "active" | "pending_reveal" | "revealed" | "expired" | "declined";
  reveal_requested_by: string | null;
  viewed: boolean;
  created_at: string;
  updated_at: string;
  user1_liked: boolean;
  user2_liked: boolean;
  partner_profile: {
    id: string;
    first_name: string;
    age: number;
    instagram_id: string | null;
    city: string;
    state: string;
    occupation: string;
    gender: string;
    bio: string;
    tagline: string;
    mental_tags: string[];
    looking_for: string[];
    love_language: string;
    text_style: string;
    current_song: string | null;
    ick: string | null;
    green_flag: string | null;
  } | null;
  user_has_liked: boolean;
  partner_has_liked: boolean;
  active_chat: boolean; // Added active_chat field
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

import { useLocation, useNavigate } from "react-router-dom";
import { Coffee } from "lucide-react";

export default function Chat() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<ChatMatch[]>([]);
  const [activeChat, setActiveChat] = useState<ChatMatch | null>(null);

  // Get URL params and navigation state
  const searchParams = new URLSearchParams(location.search);
  const matchId = searchParams.get("matchId");
  const autoSelect = searchParams.get("autoSelect") === "true";
  const isNewMatch = searchParams.get("newMatch") === "true";
  const chatMatchFromLetters = location.state?.chatMatch;

  // Handle chat match from Letters component
  useEffect(() => {
    const handleLettersNavigation = async () => {
      if (location.state?.fromLetters && location.state?.chatMatch) {
        const matchData = location.state.chatMatch;

        // Set active chat immediately
        setActiveChat(matchData);
        setShowMobileChats(false);

        // Fetch messages for this chat
        if (matchData.id) {
          try {
            const { data, error } = await supabase
              .from("chat_messages")
              .select("*")
              .eq("match_id", matchData.id)
              .order("created_at", { ascending: true });

            if (error) throw error;
            if (data) setMessages(data);
          } catch (error) {
            console.error("Error fetching messages:", error);
          }
        }

        // Fetch all chats to ensure everything is in sync
        await fetchChats();

        // Clear the navigation state
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    handleLettersNavigation();
  }, [location.state]);

  // Clear URL params after processing
  useEffect(() => {
    if (matchId) {
      const newUrl = `${window.location.pathname}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [matchId]);

  // Handle navigation from match requests
  useEffect(() => {
    const handleMatchRequest = async () => {
      if (location.state?.fromRequest && location.state?.matchId) {
        const matchId = location.state.matchId;

        // Verify match is active and properly accepted
        const { data: match, error: matchError } = await supabase
          .from("chat_matches")
          .select("*")
          .eq("id", matchId)
          .single();

        if (matchError || !match || !match.active_chat || !match.user2_liked) {
          // Match not properly accepted, redirect back
          navigate("/match-requests");
          return;
        }

        // Match is valid, fetch chats
        await fetchChats();
      } else if (isNewMatch) {
        fetchChats();
      }
    };

    handleMatchRequest();
  }, [isNewMatch, location.state]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showRevealPrompt, setShowRevealPrompt] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showMobileChats, setShowMobileChats] = useState(true);
  const [messageSending, setMessageSending] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [recentLike, setRecentLike] = useState<string | null>(null);
  const [likeNotification, setLikeNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChats();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      const unsubMessages = subscribeToMessages();
      const unsubMatches = subscribeToMatchUpdates();
      updateTimeLeft();

      // Focus the input field when chat changes
      setTimeout(() => textInputRef.current?.focus(), 100);

      return () => {
        unsubMessages && unsubMessages();
        unsubMatches && unsubMatches();
      };
    }
  }, [activeChat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Smooth scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  const updateTimeLeft = () => {
    if (!activeChat) return;

    try {
      const expiresAt = new Date(activeChat.expires_at);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    } catch (error) {
      console.error("Error updating time left:", error);
      setTimeLeft("--");
    }
  };

  const fetchChats = async () => {
    if (!user?.id) return;

    setLoadingChats(true);
    try {
      // Get all active chats where the user is either user1 or user2
      const { data, error } = await supabase
        .from("chat_matches")
        .select(
          `
          id, user1_id, user2_id, expires_at, status, reveal_requested_by, viewed, 
          created_at, updated_at, user1_liked, user2_liked
        `,
        )
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .in("status", ["active", "revealed", "pending_reveal"])
        .eq("user2_liked", true) // Added condition to only include chats where user2 has liked
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Process each chat to get partner profiles
        const processedChats = await Promise.all(
          data.map(async (chat) => {
            // Determine if user is user1 or user2
            const isUser1 = chat.user1_id === user.id;
            const partnerId = isUser1 ? chat.user2_id : chat.user1_id;

            try {
              // First attempt: Use RPC function to get profile
              const { data: profileData, error: profileError } =
                await supabase.rpc("get_profile_by_id", {
                  profile_id: partnerId,
                });

              if (profileError) throw profileError;

              if (
                !profileData ||
                (Array.isArray(profileData) && profileData.length === 0)
              ) {
                throw new Error("No profile data returned from RPC call");
              }

              const profile = Array.isArray(profileData)
                ? profileData[0]
                : profileData;

              // Ensure first_name and age are present
              if (!profile?.first_name) {
                throw new Error("Profile missing required fields");
              }

              // Determine like status based on user1/user2 position
              const userHasLiked = isUser1
                ? chat.user1_liked
                : chat.user2_liked;
              const partnerHasLiked = isUser1
                ? chat.user2_liked
                : chat.user1_liked;

              return {
                ...chat,
                partner_profile: profile,
                user_has_liked: !!userHasLiked,
                partner_has_liked: !!partnerHasLiked,
              };
            } catch (profileError) {
              console.error("Error fetching profile via RPC:", profileError);

              try {
                // Second attempt: Direct query to profiles table
                const { data: fallbackData, error: fallbackError } =
                  await supabase
                    .from("profiles")
                    .select(
                      "id, first_name, age, instagram_id, city, state, occupation, gender, bio, tagline, mental_tags, looking_for, love_language, text_style, current_song, ick, green_flag",
                    )
                    .eq("id", partnerId)
                    .single();

                if (fallbackError) throw fallbackError;

                if (!fallbackData?.first_name) {
                  throw new Error(
                    "Profile missing required fields from direct query",
                  );
                }

                return {
                  ...chat,
                  partner_profile: fallbackData,
                  user_has_liked: isUser1
                    ? !!chat.user1_liked
                    : !!chat.user2_liked,
                  partner_has_liked: isUser1
                    ? !!chat.user2_liked
                    : !!chat.user1_liked,
                };
              } catch (fallbackErr) {
                console.error(
                  "Fallback profile fetch also failed:",
                  fallbackErr,
                );

                // Create a minimal profile with default values
                return {
                  ...chat,
                  partner_profile: {
                    id: partnerId,
                    first_name: "Chat",
                    age: 0,
                    instagram_id: null,
                    city: "Unknown",
                    state: "Unknown",
                    occupation: "User",
                    gender: "",
                    bio: "",
                    tagline: "",
                    mental_tags: [],
                    looking_for: [],
                    love_language: "",
                    text_style: "",
                    current_song: null,
                    ick: null,
                    green_flag: null,
                  },
                  user_has_liked: isUser1
                    ? !!chat.user1_liked
                    : !!chat.user2_liked,
                  partner_has_liked: isUser1
                    ? !!chat.user2_liked
                    : !!chat.user1_liked,
                };
              }
            }
          }),
        );

        setChats(processedChats);

        // If we have a matchId in URL, select that chat
        if (matchId && autoSelect && processedChats.length > 0) {
          const targetChat = processedChats.find((chat) => chat.id === matchId);
          if (targetChat) {
            setActiveChat(targetChat);
            setShowMobileChats(false);
            // Force scroll to chat after a brief delay
            setTimeout(() => {
              const chatElement = document.getElementById(
                `chat-${targetChat.id}`,
              );
              if (chatElement) {
                chatElement.scrollIntoView({ behavior: "smooth" });
              }
            }, 200);
          }
        } else if (!activeChat && processedChats.length > 0) {
          setActiveChat(processedChats[0]);
        } else if (activeChat) {
          // Update active chat with new data
          const updatedActiveChat = processedChats.find(
            (c) => c.id === activeChat.id,
          );
          if (updatedActiveChat) {
            setActiveChat(updatedActiveChat);

            // Check if partner has liked while we're active
            if (
              !activeChat.partner_has_liked &&
              updatedActiveChat.partner_has_liked
            ) {
              setLikeNotification(true);
              setTimeout(() => setLikeNotification(false), 5000);
            }
          }
        }
      } else {
        setChats([]);
        setActiveChat(null);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoadingChats(false);
      setInitialLoad(false);
    }
  };

  const fetchMessages = async () => {
    if (!activeChat) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("match_id", activeChat.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const subscribeToMessages = () => {
    if (!activeChat) return;

    const channel = supabase
      .channel(`chat_messages:${activeChat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `match_id=eq.${activeChat.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;

          // Only handle partner messages through subscription
          if (newMessage.sender_id !== user?.id) {
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              setMessages((prev) => {
                // Check if message already exists
                const exists = prev.some((msg) => msg.id === newMessage.id);
                return exists ? prev : [...prev, newMessage];
              });
              setTimeout(scrollToBottom, 100);
            }, 500);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `match_id=eq.${activeChat.id}`,
        },
        (payload) => {
          // Handle deleted messages
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== payload.old.id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToMatchUpdates = () => {
    if (!activeChat) return;

    const channel = supabase
      .channel(`chat_matches:${activeChat.id}`)
      .on("UPDATE", (payload) => {
        const newData = payload.new;
        const oldData = payload.old;

        setActiveChat((prev) => {
          if (!prev) return null;

          // Check if partner has liked
          const isUser1 = prev.user1_id === user?.id;
          const oldPartnerLiked = isUser1
            ? oldData.user2_liked
            : oldData.user1_liked;
          const newPartnerLiked = isUser1
            ? newData.user2_liked
            : newData.user1_liked;

          // If partner just liked, show notification
          if (!oldPartnerLiked && newPartnerLiked) {
            setRecentLike(prev.partner_profile?.first_name || "Your match");
            setTimeout(() => setRecentLike(null), 5000);
          }

          const updatedChat = {
            ...prev,
            ...newData,
            user_has_liked: isUser1
              ? !!newData.user1_liked
              : !!newData.user2_liked,
            partner_has_liked: isUser1
              ? !!newData.user2_liked
              : !!newData.user1_liked,
          };

          return updatedChat;
        });

        // If both users have liked, show reveal prompt
        const isUser1 = activeChat.user1_id === user?.id;
        const userLiked = isUser1 ? newData.user1_liked : newData.user2_liked;
        const partnerLiked = isUser1
          ? newData.user2_liked
          : newData.user1_liked;

        if (userLiked && partnerLiked && !showRevealPrompt) {
          setShowRevealPrompt(true);
        }

        fetchChats(); // Refresh all chats when one is updated
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Simulate typing indicator when user is typing
  const handleMessageTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Cancel existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to simulate typing status
    const newTimeout = setTimeout(() => {
      // This would be where you'd emit typing status to the server
      // But for now we'll just use it for UI effects
    }, 500);

    setTypingTimeout(newTimeout);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageContent = newMessage.trim();
    if (!messageContent || !activeChat || messageSending) return;

    // Check if chat is active or revealed and not expired before sending
    if (!["active", "revealed"].includes(activeChat.status)) {
      alert("You can only send messages in active chats.");
      return;
    }

    // Check if chat has expired
    try {
      const expiresAt = new Date(activeChat.expires_at);
      const now = new Date();
      if (expiresAt < now) {
        alert("This chat has expired. You can no longer send messages.");
        return;
      }
    } catch (error) {
      console.error("Error checking chat expiration:", error);
      alert("Error checking chat status. Please try again.");
      return;
    }

    setMessageSending(true);
    try {
      // Clear input immediately for better UX
      setNewMessage("");

      // Create a temporary message ID
      const tempId = `temp-${Date.now()}`;

      // Optimistically add message to UI
      const optimisticMessage = {
        id: tempId,
        sender_id: user?.id!,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        match_id: activeChat.id,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Send the actual message
      const { data, error } = await supabase
        .from("chat_messages")
        .insert([
          {
            match_id: activeChat.id,
            sender_id: user?.id,
            content: newMessage.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      if (data) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? data : msg)),
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore the message to input if failed
      setNewMessage(newMessage);
      alert("Error sending message. Please try again.");
    } finally {
      setMessageSending(false);
      // Focus input after sending
      textInputRef.current?.focus();
    }
  };

  const handleRevealRequest = async () => {
    if (!activeChat) return;

    try {
      const { data, error } = await supabase.rpc("reveal_anonymous_chat", {
        p_match_id: activeChat.id,
        p_user_id: user?.id,
      });

      if (error) throw error;

      // Update only the active chat status
      setActiveChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "pending_reveal",
          reveal_requested_by: user?.id,
        };
      });

      // Refresh chats in background
      fetchChats();
    } catch (error) {
      console.error("Error requesting reveal:", error);
      alert("Failed to request Instagram reveal. Please try again.");
    }
  };

  const handleRevealAccept = async () => {
    if (!activeChat) return;

    try {
      const { data, error } = await supabase.rpc("reveal_anonymous_chat", {
        p_match_id: activeChat.id,
        p_user_id: user?.id,
      });

      if (error) throw error;

      // Update only the active chat status
      setActiveChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "revealed",
        };
      });

      // Refresh chats in background
      fetchChats();
    } catch (error) {
      console.error("Error accepting reveal:", error);
      alert("Failed to accept Instagram reveal. Please try again.");
    }
  };

  const handleLikeChat = async () => {
    if (!activeChat || likeLoading) return;

    setLikeLoading(true);
    try {
      // Update UI state immediately for better UX
      const isUser1 = activeChat.user1_id === user?.id;
      setActiveChat((prev) => {
        if (!prev) return null;

        if (isUser1) {
          return {
            ...prev,
            user1_liked: true,
            user_has_liked: true,
          };
        } else {
          return {
            ...prev,
            user2_liked: true,
            user_has_liked: true,
          };
        }
      });

      // Call the RPC to like the chat
      const { data, error } = await supabase.rpc("like_chat", {
        p_match_id: activeChat.id,
        p_user_id: user?.id,
      });

      if (error) throw error;

      // Then refresh all chats to get updated data
      await fetchChats();

      // If mutual like, show reveal prompt
      if (data?.mutual_like) {
        setShowRevealPrompt(true);
      }
    } catch (error) {
      console.error("Error liking chat:", error);

      // Revert the optimistic update on error
      const isUser1 = activeChat.user1_id === user?.id;
      setActiveChat((prev) => {
        if (!prev) return null;

        if (isUser1) {
          return {
            ...prev,
            user1_liked: false,
            user_has_liked: false,
          };
        } else {
          return {
            ...prev,
            user2_liked: false,
            user_has_liked: false,
          };
        }
      });

      alert("Error liking this chat. Please try again.");
    } finally {
      setLikeLoading(false);
    }
  };

  const findNewMatch = async () => {
    navigate("/swipe");
  };

  if (initialLoad) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  if (chats.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient p-4">
        <div className="card p-8 text-center max-w-md animate-fade-in">
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute w-full h-full bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full opacity-50 animate-pulse"></div>
            <div className="absolute w-full h-full flex items-center justify-center">
              <MessageSquare className="w-14 h-14 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Start Chatting
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Find someone to chat with for 7 days and discover genuine
            connections
          </p>
          <button
            onClick={findNewMatch}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2 relative overflow-hidden group py-3 text-lg"
          >
            <span className="absolute w-full h-full bg-gradient-to-r from-purple-700 to-pink-700 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-6 h-6 border-t-2 border-white rounded-full animate-spin" />
              ) : (
                <>
                  <Heart className="w-5 h-5 animate-pulse" />
                  Find a Match
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 overflow-hidden relative">
      {/* Chat List Sidebar */}
      <div
        className={cn(
          "w-full md:w-[380px] flex-shrink-0 bg-white/95 backdrop-blur-lg md:border-r border-purple-100 transition-all duration-300 z-30",
          showMobileChats ? "block" : "hidden md:block",
        )}
      >
        <div className="px-4 py-3 border-b border-purple-100 sticky top-0 bg-white/95 backdrop-blur-lg z-10 flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Your Chats
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Connect with your matches
          </p>
          <div className="h-1 w-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full mt-2"></div>
        </div>

        {loadingChats ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-y-auto h-[calc(100vh-180px)] md:h-[calc(100vh-220px)]">
            {chats.map((chat) => {
              // Making sure we can safely parse the date
              let matchExpired = false;
              try {
                matchExpired = new Date(chat.expires_at) < new Date();
              } catch (e) {
                console.error("Invalid date format:", chat.expires_at);
              }

              const isActive = activeChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChat(chat);
                    setShowMobileChats(false);
                  }}
                  className={cn(
                    "p-4 border-b border-purple-50 cursor-pointer transition-all duration-300 hover:bg-purple-50/50",
                    isActive
                      ? "bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500"
                      : "",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center relative",
                        "bg-gradient-to-br from-purple-100 to-pink-100",
                        isActive ? "ring-2 ring-purple-300 ring-offset-2" : "",
                      )}
                    >
                      {chat.user_has_liked && chat.partner_has_liked && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 animate-pulse">
                          <Heart className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      {!chat.partner_profile ? (
                        <User className="w-6 h-6 text-purple-400" />
                      ) : (
                        <span className="text-lg font-bold text-purple-600">
                          {chat.partner_profile.first_name?.[0] || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-900 truncate">
                          {chat.partner_profile?.first_name || "Chat"}
                          {chat.partner_profile?.age
                            ? `, ${chat.partner_profile.age}`
                            : ""}
                        </h3>
                        <div className="flex items-center">
                          {matchExpired ? (
                            <span className="text-xs text-red-500">
                              Expired
                            </span>
                          ) : (
                            <span className="text-xs text-green-500 flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="truncate">
                          {chat.partner_profile?.city || ""}
                          {chat.partner_profile?.city ? ", " : ""}{" "}
                          {chat.partner_profile?.occupation || ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Button to find new matches at bottom of sidebar */}
        <div className="p-4 border-t border-purple-100 bg-white sticky bottom-0">
          <button
            onClick={findNewMatch}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                <span>Find New Match</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          "flex-1 flex flex-col h-[100dvh] md:h-screen relative overflow-hidden",
          showMobileChats ? "hidden md:flex" : "flex"
        )}
      >        {activeChat ? (
          <>
            {/* Chat Header */}
            <div
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-4 border-b border-purple-100 bg-white/95 backdrop-blur-lg flex justify-between items-center sticky top-0 z-20 shadow-md cursor-pointer hover:bg-purple-50/50 transition-colors"
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className="md:hidden mr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileChats(true);
                    }}
                    className="p-2 rounded-full hover:bg-purple-50/80 active:bg-purple-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-purple-600" />
                  </button>
                </div>
                <div className="flex items-center min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mr-3 ring-2 ring-purple-100">
                    <span className="text-base font-bold text-white">
                      {activeChat.partner_profile?.first_name?.[0] || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900 truncate">
                        {activeChat.partner_profile?.first_name || "Chat"}
                        {activeChat.partner_profile?.age
                          ? `, ${activeChat.partner_profile.age}`
                          : ""}
                      </h2>
                      {activeChat.partner_has_liked && activeChat.user_has_liked && (
                        <div className="flex-shrink-0">
                          <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50/80 rounded-full text-[10px] text-purple-600 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{timeLeft || "--"}</span>
                      </div>
                      {activeChat.partner_profile?.city && (
                        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{activeChat.partner_profile.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    !activeChat.user_has_liked && handleLikeChat();
                  }}
                  disabled={likeLoading || activeChat.user_has_liked}
                  className={`p-1.5 ${activeChat.user_has_liked ? 'bg-pink-100' : 'bg-pink-50 hover:bg-pink-100'} text-pink-600 rounded-full transition-colors relative group`}
                  title={activeChat.user_has_liked ? "Chat liked" : "Like this chat"}
                >
                  {likeLoading ? (
                    <div className="w-4 h-4 border-t-2 border-pink-600 rounded-full animate-spin" />
                  ) : (
                    <Heart className={`w-4 h-4 ${activeChat.user_has_liked ? 'fill-pink-600' : 'group-hover:animate-pulse'}`} />
                  )}
                  {!activeChat.user_has_liked && (
                    <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-20">
                      Like this chat
                    </span>
                  )}
                </button>

                {/* Show reveal status */}
                {activeChat.partner_has_liked &&
                  activeChat.user_has_liked &&
                  !activeChat.reveal_requested_by && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Are you sure you want to reveal your Instagram? You'll need to wait for your match to also accept.",
                          )
                        ) {
                          setShowRevealPrompt(true);
                        }
                      }}
                      className="p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors relative group"
                    >
                      <Instagram className="w-5 h-5 group-hover:animate-pulse" />
                      <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 top-full mt-1 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-20">
                        Reveal Instagram
                      </span>
                    </button>
                  )}
                {activeChat.partner_has_liked &&
                  activeChat.user_has_liked &&
                  activeChat.reveal_requested_by &&
                  activeChat.reveal_requested_by !== user?.id &&
                  activeChat.status !== "revealed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Your match wants to reveal Instagram. Would you like to reveal yours too?",
                          )
                        ) {
                          setShowRevealPrompt(true);
                        }
                      }}
                      className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors relative group"
                    >
                      <Instagram className="w-5 h-5 group-hover:animate-pulse" />
                      <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 top-full mt-1 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-20">
                        Accept Instagram Reveal
                      </span>
                    </button>
                  )}
                {activeChat.partner_has_liked &&
                  activeChat.user_has_liked &&
                  activeChat.reveal_requested_by === user?.id &&
                  activeChat.status !== "revealed" && (
                    <button className="p-2 bg-gray-100 text-gray-600 rounded-full cursor-not-allowed relative group">
                      <Instagram className="w-5 h-5" />
                      <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 top-full mt-1 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-20">
                        Waiting for partner to reveal
                      </span>
                    </button>
                  )}
                {activeChat.status === "revealed" ? (
                  activeChat.partner_profile?.instagram_id ? (
                    <a
                      href={activeChat.partner_profile.instagram_id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors relative group"
                    >
                      <Instagram className="w-5 h-5 group-hover:animate-pulse" />
                      <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 top-full mt-1 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-20">
                        View Instagram
                      </span>
                    </a>
                  ) : (
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-full cursor-not-allowed relative group">
                      <AlertCircle className="w-5 h-5" />
                      <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 top-full mt-1 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-20">
                        They haven't added their Instagram profile yet.
                      </span>
                    </div>
                  )
                ) : null}
              </div>
            </div>

            {/* Messages Container */}
            <div
              ref={chatContainerRef}
              className="flex-1 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 relative overflow-hidden h-[calc(100dvh-130px)] md:h-[calc(100vh-130px)]"
            >
              <div
                className="absolute inset-0 px-3 py-2 md:p-4 overflow-y-auto scroll-smooth pb-16"
                style={{
                  scrollBehavior: "smooth",
                  backgroundImage:
                    "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, transparent 100%)",
                  backgroundSize: "200% 200%",
                  animation: "gradient-shift 15s ease infinite",
                }}
              >
                {/* Date indicator */}
                <div className="flex justify-center mb-4 flex-shrink-0">
                  <div className="px-3 py-1 bg-white/70 backdrop-blur-sm text-gray-500 text-xs rounded-full shadow-sm">
                    {activeChat.created_at
                      ? new Date(activeChat.created_at).toLocaleDateString()
                      : "Today"}
                  </div>
                </div>

                {/* Like notification */}
                {likeNotification && (
                  <div className="flex justify-center my-4 animate-fade-in flex-shrink-0">
                    <div className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm flex items-center shadow-md animate-pulse">
                      <Heart className="w-4 h-4 mr-2 fill-pink-600" />
                      {activeChat.partner_profile?.first_name ||
                        "Your match"}{" "}
                      liked this chat!
                    </div>
                  </div>
                )}

                {/* Mutual like notification */}
                {activeChat.user_has_liked && activeChat.partner_has_liked && (
                  <div className="flex justify-center my-4 animate-fade-in flex-shrink-0">
                    <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-sm flex items-center shadow-md">
                      <Heart className="w-4 h-4 mr-2 fill-white" />
                      It's a match! You both liked each other!
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-4 flex-1">
                  {messages.map((message, index) => {
                    const isUser = message.sender_id === user?.id;
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1]?.sender_id !== message.sender_id;
                    const isFirstInGroup = showAvatar;
                    const isLastInGroup =
                      index === messages.length - 1 ||
                      messages[index + 1]?.sender_id !== message.sender_id;

                    // Determine animation class based on sender
                    const animationClass = isUser
                      ? "animate-slide-in-right"
                      : "animate-slide-in-left";

                    // Only add animation class if it's a new message
                    const shouldAnimate =
                      message.id.includes("temp-") ||
                      index >= messages.length - 3;

                    // Create a unique key combining message ID and index
                    const messageKey = `${message.id}-${index}`;

                    return (
                      <div
                        key={messageKey}
                        className={cn(
                          "flex",
                          isUser ? "justify-end" : "justify-start",
                          shouldAnimate ? animationClass : "",
                        )}
                        style={{
                          marginBottom: isLastInGroup ? "12px" : "4px"
                        }}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] md:max-w-[70%] flex items-end gap-2",
                            isUser ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          {/* Avatar (only show on first message in a group) */}
                          {isFirstInGroup && (
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                isUser
                                  ? "bg-gradient-to-br from-purple-600 to-pink-600"
                                  : "bg-gradient-to-br from-purple-200 to-pink-200",
                              )}
                            >
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  isUser ? "text-white" : "text-purple-600",
                                )}
                              >
                                {isUser
                                  ? "You"
                                  : activeChat.partner_profile
                                      ?.first_name?.[0] || "?"}
                              </span>
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={cn(
                              "rounded-2xl p-3 break-words backdrop-blur-sm",
                              isUser
                                ? "bg-gradient-to-br from-purple-600 via-pink-600 to-purple-600 text-white rounded-[20px] rounded-tr-sm shadow-lg hover:shadow-xl transition-all"
                                : "bg-white/95 text-gray-900 rounded-[20px] rounded-tl-sm shadow-md hover:shadow-lg transition-all border border-purple-50",
                              !isFirstInGroup && isUser ? "mr-8" : "",
                              !isFirstInGroup && !isUser ? "ml-8" : "",
                              "transform hover:scale-[1.01] transition-transform duration-200",
                            )}
                          >
                            <p>{message.content}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isUser ? "text-purple-100" : "text-gray-500",
                              )}
                            >
                              {message.created_at
                                ? new Date(
                                    message.created_at,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="max-w-[70%] flex items-end gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-purple-600">
                            {activeChat.partner_profile?.first_name?.[0] || "?"}
                          </span>
                        </div>
                        <div className="rounded-2xl p-3 bg-white text-gray-900 rounded-tl-none shadow-sm">
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {messages.length === 0 && !isTyping && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6 animate-float">
                        <MessageSquare className="w-10 h-10 text-purple-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        Start a Conversation
                      </h3>
                      <p className="text-gray-600 max-w-xs">
                        Say hello and start getting to know each other! You have
                        7 days to connect or exchange Instagram handles.
                      </p>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>
            </div>

            {/* Like notification toast */}
            {recentLike && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-pink-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-down flex items-center">
                <Heart className="w-4 h-4 mr-2 fill-white" />
                <span>{recentLike} liked this chat!</span>
              </div>
            )}

            {/* Message Input */}
            <div className="p-3 md:p-4 bg-white/95 backdrop-blur-xl border-t border-purple-100 sticky bottom-0 left-0 right-0 z-10 shadow-lg">
              <form
                onSubmit={sendMessage}
                className="flex items-end gap-2 relative"
              >
                <div className="flex-1 relative">
                  <input
                    ref={textInputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleMessageTyping}
                    placeholder={
                      timeLeft === "Expired"
                        ? "Chat has expired"
                        : "Type your message..."
                    }
                    className="w-full px-4 py-3 bg-purple-50/50 rounded-2xl pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    disabled={timeLeft === "Expired" || messageSending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim() && !messageSending) {
                          sendMessage(e);
                        }
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={
                      !newMessage.trim() ||
                      timeLeft === "Expired" ||
                      messageSending
                    }
                    className={cn(
                      "absolute right-2 bottom-2 p-2 rounded-xl transition-all duration-300 transform",
                      newMessage.trim() && !messageSending
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >
                    {messageSending ? (
                      <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
              {timeLeft === "Expired" && (
                <div className="mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  This chat has expired. You can no longer send messages.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="card p-8 text-center max-w-md animate-fade-in">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-200 to-pink-200 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Select a Chat
              </h2>
              <p className="text-gray-600 mb-6">
                Choose a conversation from the list or start a new match
              </p>
              <button
                onClick={findNewMatch}
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {loading ? (
                  <div className="w-6 h-6 border-t-2 border-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    Find New Match
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && activeChat?.partner_profile && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="card p-6 max-w-md w-full space-y-4 animate-scale-in max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {activeChat.partner_profile.first_name?.[0] || "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {activeChat.partner_profile.first_name},{" "}
                    {activeChat.partner_profile.age}
                  </h3>
                  <p className="text-gray-600 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {activeChat.partner_profile.city},{" "}
                    {activeChat.partner_profile.state}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <Briefcase className="w-4 h-4 mr-1" />
                    {activeChat.partner_profile.occupation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeChat.partner_profile.tagline && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-lg text-purple-600 font-medium italic">
                  "{activeChat.partner_profile.tagline}"
                </p>
              </div>
            )}

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">
                About
              </h4>
              <p className="text-gray-700">{activeChat.partner_profile.bio}</p>
            </div>

            {activeChat.partner_profile.mental_tags?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-brain text-purple-600 mr-2"
                  >
                    <path d="M9.5 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
                    <path d="M14.5 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
                    <path d="M19.5 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
                    <path d="M19.5 12a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
                    <path d="M14.5 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
                    <path d="M9.5 17a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
                    <path d="M4.5 12a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
                    <path d="M4.5 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
                    <path d="M7 9.5h10"></path>
                    <path d="M7 14.5h10"></path>
                  </svg>
                  Mental Aesthetic
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeChat.partner_profile.mental_tags.map((tag, index) => (
                    <span key={index} className="tag tag-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeChat.partner_profile.looking_for?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                  <Heart className="w-4 h-4 text-purple-600 mr-2" />
                  Looking For
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeChat.partner_profile.looking_for.map((item, index) => (
                    <span key={index} className="tag tag-primary">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeChat.partner_profile.love_language && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-800 mb-1">
                    Love Language
                  </h4>
                  <p className="text-purple-700">
                    {activeChat.partner_profile.love_language}
                  </p>
                </div>
              )}

              {activeChat.partner_profile.text_style && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-800 mb-1">
                    Text Style
                  </h4>
                  <p className="text-purple-700">
                    {activeChat.partner_profile.text_style}
                  </p>
                </div>
              )}

              {activeChat.partner_profile.current_song && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-800 mb-1">
                    Currently Playing
                  </h4>
                  <p className="text-purple-700">
                    {activeChat.partner_profile.current_song}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeChat.partner_profile.green_flag && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-800 mb-1">
                    Green Flag
                  </h4>
                  <p className="text-green-700">
                    {activeChat.partner_profile.green_flag}
                  </p>
                </div>
              )}

              {activeChat.partner_profile.ick && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">
                    Biggest Ick
                  </h4>
                  <p className="text-red-700">
                    {activeChat.partner_profile.ick}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instagram Reveal Modal */}
      {showRevealPrompt && activeChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card p-6 max-w-md w-full space-y-4 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500">
                <Instagram className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Get Connected on Instagram!
                </h3>
                <p className="text-gray-600 mt-3">
                  {activeChat.status === "revealed"
                    ? `You can now connect with ${activeChat.partner_profile?.first_name || "your match"} on Instagram!`
                    : activeChat.reveal_requested_by === user?.id
                      ? `Waiting for ${activeChat.partner_profile?.first_name || "your match"} to accept...`
                      : activeChat.reveal_requested_by
                        ? `${activeChat.partner_profile?.first_name || "Your match"} wants to reveal Instagram!`
                        : `Would you like to reveal your Instagram to ${activeChat.partner_profile?.first_name || "your match"}?`}
                </p>
                {activeChat.status === "revealed" ? (
                  activeChat.partner_profile?.instagram_id ? (
                    <a
                      href={activeChat.partner_profile.instagram_id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 text-purple-600 font-medium hover:text-purple-700 transition-colors bg-purple-50 px-4 py-3 rounded-lg hover:bg-purple-100 flex items-center"
                    >
                      <Instagram className="w-5 h-5 mr-2" />
                      {activeChat.partner_profile.instagram_id.replace(
                        "https://instagram.com/",
                        "@",
                      )}
                    </a>
                  ) : (
                    <div className="block mt-3 text-gray-500 italic bg-gray-50 px-4 py-3 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-gray-400" />
                      They haven't added their Instagram profile yet.
                    </div>
                  )
                ) : activeChat.reveal_requested_by === user?.id ? (
                  <div className="block mt-3 text-gray-500 bg-purple-50/50 px-4 py
-3 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h5 h-5 mr-2 text-purple-400" />
                    Waiting for them to accept...
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRevealRequest();
                    }}
                    className="w-full mt-3 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <Instagram className="w-5 h-5 mr-2" />
                    Reveal Instagram
                  </button>
                )}
                <p className="text-sm text-gray-500 mt-4">
                  {activeChat.status === "revealed"
                    ? "Your Instagram is also visible to them now."
                    : "Both users must agree to reveal Instagram profiles."}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowRevealPrompt(false)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors transform hover:scale-105"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
