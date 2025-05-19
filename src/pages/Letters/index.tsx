import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Mail,
  Heart,
  X,
  Inbox,
  Archive,
  AlertTriangle,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useNotificationStore } from "../../store/notification";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

interface Letter {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  status: "pending" | "liked" | "matched" | "declined" | "started_chat";
  matched: boolean;
  sender_profile?: {
    first_name: string;
  };
  recipient_profile?: {
    first_name: string;
  };
  chat_button?: boolean;
}

enum Tab {
  INBOX = "inbox",
  SENT = "sent",
  COMPOSE = "compose",
}

export default function Letters() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { resetUnreadLetters } = useNotificationStore();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [filteredLetters, setFilteredLetters] = useState<Letter[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.INBOX);
  const [newLetter, setNewLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [chatMatch, setChatMatch] = useState<any>(null);

  useEffect(() => {
    fetchLetters();
    const subscription = supabase
      .channel("letters_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "letters",
          filter: `sender_id=eq.${user?.id},recipient_id=eq.${user?.id}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          setLetters(currentLetters => {
            if (eventType === 'INSERT') {
              return [...currentLetters, newRecord];
            } else if (eventType === 'UPDATE') {
              return currentLetters.map(letter => 
                letter.id === newRecord.id ? newRecord : letter
              );
            } else if (eventType === 'DELETE') {
              return currentLetters.filter(letter => letter.id !== oldRecord.id);
            }
            return currentLetters;
          });
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    // Reset unread letters when this component mounts
    if (user) {
      resetUnreadLetters();
    }
  }, [user, resetUnreadLetters]);

  useEffect(() => {
    // Filter letters based on active tab
    if (!letters.length) {
      setFilteredLetters([]);
      return;
    }

    let filtered = [...letters];

    // Apply filters based on active tab
    if (activeTab === Tab.INBOX) {
      filtered = letters.filter((letter) => letter.recipient_id === user?.id);

      // Count unread letters
      const unread = filtered.filter((letter) => !letter.read_at).length;
      setUnreadCount(unread);
    } else if (activeTab === Tab.SENT) {
      filtered = letters.filter((letter) => letter.sender_id === user?.id);
    }

    // Apply search if needed
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (letter) =>
          letter.content?.toLowerCase().includes(term) ||
          letter.sender_profile?.first_name?.toLowerCase().includes(term) ||
          letter.recipient_profile?.first_name?.toLowerCase().includes(term),
      );
    }

    // Sort by date, newest first
    filtered = filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setFilteredLetters(filtered);
  }, [letters, activeTab, searchTerm, user?.id]);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("letters")
        .select(
          `
          *,
          sender_profile:profiles!sender_id(first_name),
          recipient_profile:profiles!recipient_id(first_name)
        `,
        )
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setLetters(data);
    } catch (error) {
      console.error("Error fetching letters:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLetter.trim()) return;

    setSendLoading(true);
    try {
      // Get random recipient using the database function
      const { data: recipientData, error: recipientError } = await supabase.rpc(
        "get_random_recipient",
        { sender_id: user?.id },
      );

      if (recipientError) throw recipientError;
      if (!recipientData) {
        alert("No available recipients found");
        return;
      }

      const { error } = await supabase.from("letters").insert([
        {
          sender_id: user?.id,
          recipient_id: recipientData,
          content: newLetter.trim(),
          status: "pending",
        },
      ]);

      if (error) throw error;
      setNewLetter("");
      setActiveTab(Tab.SENT);
    } catch (error) {
      console.error("Error sending letter:", error);
    } finally {
      setSendLoading(false);
    }
  };

  const handleLetterAction = async (
    letterId: string,
    action: "like" | "decline",
  ) => {
    if (processingAction) return; // Prevent multiple clicks

    setProcessingAction(true);
    try {
      const letter = letters.find((l) => l.id === letterId);
      if (!letter) return;

      const newStatus = action === "like" ? "liked" : "declined";

      // Update the letter status
      const { error: updateError } = await supabase
        .from("letters")
        .update({ status: newStatus })
        .eq("id", letterId);

      if (updateError) throw updateError;

      // If liked, check if sender also liked recipient's letter
      if (action === "like") {
        const { data: matchData, error: matchError } = await supabase
          .from("letters")
          .select("*")
          .eq("sender_id", letter.recipient_id)
          .eq("recipient_id", letter.sender_id)
          .eq("status", "liked");

        if (matchError) throw matchError;

        // If there's a mutual like, update both letters as matched and create chat
        if (matchData && matchData.length > 0) {
          const { error: matchUpdateError } = await supabase
            .from("letters")
            .update({ matched: true, status: "matched" })
            .in("id", [letterId, matchData[0].id]);

          if (matchUpdateError) throw matchUpdateError;

          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

          let chatMatchData;
          try {
            // Get the other user's ID
            const otherUserId = letter.sender_id === user?.id
              ? letter.recipient_id
              : letter.sender_id;

            // Sort user IDs to maintain consistent ordering
            const [user1Id, user2Id] = [user?.id, otherUserId].sort();

            // Check for existing chat with active status
            const { data: existingMatch, error: existingError } = await supabase
              .from("chat_matches")
              .select("*")
              .or(
                `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
              )
              .eq("status", "active")
              .single();

            if (existingError && existingError.code !== "PGRST116") {
              throw existingError;
            }

            if (!existingMatch) {
              // Sort user IDs to maintain consistent ordering
              const [user1Id, user2Id] = [user?.id, letter.sender_id].sort();

              try {
                // Create match with sorted user IDs
                const { data: newChatData, error: chatError } = await supabase
                  .from("chat_matches")
                  .insert({
                    user1_id: user1Id,
                    user2_id: user2Id,
                    status: "active",
                    expires_at: expiresAt.toISOString(),
                    user1_liked: true,
                    user2_liked: true,
                    viewed: true,
                  })
                  .select(
                    `
                  *,
                  user1:profiles!chat_matches_user1_id_fkey(
                    id, first_name, age, instagram_id, city, state, occupation,
                    gender, bio, tagline, mental_tags, looking_for, love_language,
                    text_style, current_song, ick, green_flag
                  ),
                  user2:profiles!chat_matches_user2_id_fkey(
                    id, first_name, age, instagram_id, city, state, occupation,
                    gender, bio, tagline, mental_tags, looking_for, love_language,
                    text_style, current_song, ick, green_flag
                  )
                `,
                  )
                  .single();

                if (chatError) throw chatError;
                chatMatchData = newChatData;
              } catch (error) {
                console.error("Error creating chat match:", error);
                throw error;
              }
            } else {
              chatMatchData = existingMatch;
            }

            setChatMatch(chatMatchData);
          } catch (error) {
            console.error("Chat match creation failed:", error);
            alert("Error creating chat. Please try again.");
            return;
          }

          // Get the newly created chat match from the response
          if (!chatMatchData || !chatMatchData.id) {
            console.error(
              "No chat match data received or invalid chatMatch ID:",
              chatMatchData,
            );
            alert("Error creating chat. Please try again.");
            return;
          }

          // First update letters list
          await fetchLetters();

          // Then fetch the complete chat match data
          const { data: completeMatchData, error: matchError } = await supabase
            .from("chat_matches")
            .select(
              `
              *,
              partner_profile:profiles!chat_matches_user2_id_fkey(
                id, first_name, age, instagram_id, city, state, occupation, 
                gender, bio, tagline, mental_tags, looking_for, love_language, 
                text_style, current_song, ick, green_flag
              )
            `,
            )
            .eq("id", chatMatchData.id)
            .single();

          if (matchError) {
            console.error("Error fetching chat match:", matchError);
            return;
          }

          // Remove letter from list before navigating
          setLetters((prev) => prev.filter((l) => l.id !== letterId));
          setSelectedLetter(null);

          // Navigate to chat with complete match data
          navigate(`/chat`, {
            replace: true,
            state: {
              chatMatch: completeMatchData,
              fromLetters: true,
              matchId: chatMatchData.id,
              autoSelect: true,
              newMatch: true,
            },
          });
        }
      }

      fetchLetters();
      setSelectedLetter(null);
    } catch (error) {
      console.error("Error handling letter action:", error);
      alert("An error occurred. Please try again later.");
    } finally {
      setProcessingAction(false);
    }
  };

  const markAsRead = async (letter: Letter) => {
    if (letter.read_at || letter.recipient_id !== user?.id) return;

    try {
      const { error } = await supabase
        .from("letters")
        .update({ read_at: new Date().toISOString() })
        .eq("id", letter.id);

      if (error) throw error;

      setLetters((prev) =>
        prev.map((l) =>
          l.id === letter.id ? { ...l, read_at: new Date().toISOString() } : l,
        ),
      );

      if (selectedLetter && selectedLetter.id === letter.id) {
        setSelectedLetter({
          ...selectedLetter,
          read_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error marking letter as read:", error);
    }
  };

  const handleSelectLetter = (letter: Letter) => {
    setSelectedLetter(letter);
    markAsRead(letter);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      <div className="flex-1 flex flex-col bg-white rounded-t-2xl shadow-lg overflow-hidden m-4 mt-0">
        {/* Tabs */}
        <div className="flex border-b border-purple-100">
          <button
            onClick={() => setActiveTab(Tab.INBOX)}
            className={`flex-1 py-4 text-center relative ${
              activeTab === Tab.INBOX
                ? "text-purple-600 font-medium"
                : "text-gray-600 hover:text-purple-500"
            }`}
          >
            <div className="flex items-center justify-center">
              <Inbox className="w-5 h-5 mr-2" />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {activeTab === Tab.INBOX && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab(Tab.SENT)}
            className={`flex-1 py-4 text-center relative ${
              activeTab === Tab.SENT
                ? "text-purple-600 font-medium"
                : "text-gray-600 hover:text-purple-500"
            }`}
          >
            <div className="flex items-center justify-center">
              <Archive className="w-5 h-5 mr-2" />
              <span>Sent</span>
            </div>
            {activeTab === Tab.SENT && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab(Tab.COMPOSE)}
            className={`flex-1 py-4 text-center relative ${
              activeTab === Tab.COMPOSE
                ? "text-purple-600 font-medium"
                : "text-gray-600 hover:text-purple-500"
            }`}
          >
            <div className="flex items-center justify-center">
              <Send className="w-5 h-5 mr-2" />
              <span>Compose</span>
            </div>
            {activeTab === Tab.COMPOSE && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === Tab.COMPOSE ? (
          <div className="flex-1 p-5 space-y-4 flex flex-col">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-2">
              <Send className="w-5 h-5 mr-2 text-purple-600" />
              Write a Letter
            </h2>

            <p className="text-gray-600">
              Your letter will be sent anonymously to someone who matches your
              interests. If they like your letter, you might make a connection!
            </p>

            <form
              onSubmit={sendLetter}
              className="space-y-4 flex-grow flex flex-col"
            >
              <textarea
                value={newLetter}
                onChange={(e) => setNewLetter(e.target.value)}
                placeholder="Express yourself thoughtfully... Share an idea, a story, or something meaningful to you."
                rows={10}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm flex-grow font-serif text-gray-800"
              ></textarea>

              <div className="mt-auto flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {newLetter.length > 0
                    ? `${newLetter.length} characters`
                    : "Write something meaningful"}
                </div>
                <button
                  type="submit"
                  disabled={sendLoading || !newLetter.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {sendLoading ? (
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Send Letter
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Letters List */}
            <div
              className={`md:w-1/3 border-r border-purple-100 overflow-y-auto ${
                selectedLetter ? "hidden md:block" : ""
              }`}
            >
              <div className="p-4 sticky top-0 bg-white z-10 border-b border-purple-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search letters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-purple-100 focus:ring focus:ring-purple-200 focus:outline-none"
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : filteredLetters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <Mail className="w-16 h-16 text-purple-200 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No Letters Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {activeTab === Tab.INBOX
                      ? "Your inbox is empty. Letters you receive will appear here."
                      : "You haven't sent any letters yet."}
                  </p>
                  {activeTab === Tab.INBOX && (
                    <button
                      onClick={() => setActiveTab(Tab.COMPOSE)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Write a Letter
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {filteredLetters.map((letter) => (
                    <div
                      key={letter.id}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all backdrop-blur-sm shadow-sm hover:shadow-md",
                        selectedLetter?.id === letter.id
                          ? "bg-purple-100/80 scale-[0.98] transform"
                          : "hover:bg-gray-50/80 bg-white/60",
                        !letter.read_at && letter.recipient_id === user?.id
                          ? "border-l-4 border-purple-500 pl-3"
                          : "",
                      )}
                      onClick={() => handleSelectLetter(letter)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {activeTab === Tab.INBOX
                              ? letter.sender_profile?.first_name || "Anonymous"
                              : letter.recipient_profile?.first_name ||
                                "Someone"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(letter.created_at).toLocaleDateString()} •{" "}
                            {new Date(letter.created_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                        {letter.matched && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            Matched
                          </span>
                        )}
                        {letter.status === "liked" &&
                          letter.sender_id === user?.id && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                              Liked
                            </span>
                          )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {letter.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Letter Detail View */}
            <div
              className={`md:w-2/3 flex flex-col ${
                selectedLetter ? "" : "hidden md:flex"
              }`}
            >
              {selectedLetter ? (
                <>
                  <div className="p-4 border-b border-purple-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center">
                      <button
                        onClick={() => setSelectedLetter(null)}
                        className="md:hidden p-2 rounded-full hover:bg-purple-50 mr-2"
                      >
                        <ChevronLeft className="w-5 h-5 text-purple-600" />
                      </button>
                      <div>
                        <h3 className="font-medium text-lg">
                          {selectedLetter.sender_id === user?.id
                            ? `To: ${
                                selectedLetter.recipient_profile?.first_name ||
                                "Someone"
                              }`
                            : `From: ${
                                selectedLetter.sender_profile?.first_name ||
                                "Anonymous"
                              }`}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            selectedLetter.created_at,
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(
                            selectedLetter.created_at,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {selectedLetter.recipient_id === user?.id &&
                      selectedLetter.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleLetterAction(selectedLetter.id, "decline")
                            }
                            className="p-2 bg-red-100 rounded-full text-red-600 hover:bg-red-200 transition-colors"
                            disabled={processingAction}
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleLetterAction(selectedLetter.id, "like")
                            }
                            className="p-2 bg-green-100 rounded-full text-green-600 hover:bg-green-200 transition-colors"
                            disabled={processingAction}
                          >
                            <Heart className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                  </div>

                  <div className="p-3 sm:p-6 flex-1 overflow-y-auto bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-sm transition-all duration-300 letter-slide-in">
                      <div className="font-serif text-lg text-gray-800 whitespace-pre-wrap">
                        {selectedLetter.content}
                      </div>

                      {/* Status indicators and actions */}
                      <div className="mt-8 pt-4 border-t border-gray-100">
                        {selectedLetter.matched ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-green-600">
                              <Heart
                                className="w-5 h-5 mr-2"
                                fill="currentColor"
                              />
                              <span>
                                You've matched! You both liked each other's
                                letters.
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                const button = event.currentTarget;
                                button.disabled = true;
                                setSelectedLetter(prev => prev ? {...prev, chat_button: true} : prev);
                                try {
                                  const otherUserId = selectedLetter.sender_id === user?.id
                                    ? selectedLetter.recipient_id
                                    : selectedLetter.sender_id;

                                  // Sort user IDs to maintain consistent ordering
                                  const [user1Id, user2Id] = [user?.id, otherUserId].sort();

                                  // Check for existing chat with active status
                                  const { data: existingMatch, error: existingError } = await supabase
                                    .from("chat_matches")
                                    .select("*")
                                    .or(
                                      `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
                                    )
                                    .eq("status", "active")
                                    .single();

                                  if (existingError && existingError.code !== "PGRST116") {
                                    throw existingError;
                                  }

                                  if (!existingMatch) {
                                    // Create new chat match if none exists
                                    const expiresAt = new Date(
                                      Date.now() + 7 * 24 * 60 * 60 * 1000,
                                    );

                                    // Get the other user's ID
                                    const otherUserId = selectedLetter.sender_id === user?.id
                                      ? selectedLetter.recipient_id
                                      : selectedLetter.sender_id;

                                    // Sort user IDs to maintain consistent ordering
                                    const [user1Id, user2Id] = [user?.id, otherUserId].sort();

                                    const {
                                      data: newMatch,
                                      error: createError,
                                    } = await supabase
                                      .from("chat_matches")
                                      .insert({
                                        user1_id: user1Id,
                                        user2_id: user2Id,
                                        status: "active",
                                        expires_at: expiresAt.toISOString(),
                                        viewed: true,
                                        user1_liked: true,
                                        user2_liked: true,
                                      })
                                      .select()
                                      .single();

                                    if (createError) throw createError;
                                    matchData = newMatch;
                                  }

                                  // Get full chat match data including partner profile
                                  const {
                                    data: fullMatchData,
                                    error: matchError,
                                  } = await supabase
                                    .from("chat_matches")
                                    .select(
                                      `
                                      *, partner_profile:profiles!chat_matches_user2_id_fkey(
                                        id, first_name, age, instagram_id, city, state, occupation, 
                                        gender, bio, tagline, mental_tags, looking_for, love_language, 
                                        text_style, current_song, ick, green_flag
                                      )
                                    `,
                                    )
                                    .eq("id", matchData.id)
                                    .single();

                                  if (matchError) throw matchError;

                                  // Remove letter from list and clear selection
                                  setLetters((prev) =>
                                    prev.filter((l) => l.id !== selectedLetter.id)
                                  );
                                  setSelectedLetter(null);

                                  // Navigate with full chat match data
                                  navigate("/chat", {
                                    replace: true,
                                    state: {
                                      fromLetters: true,
                                      chatMatch: fullMatchData,
                                      matchId: matchData.id,
                                      autoSelect: true,
                                      newMatch: true,
                                    },
                                  });
                                } catch (error) {
                                  console.error(
                                    "Error getting chat match:",
                                    error,
                                  );
                                  alert(
                                    "Error opening chat. Please try again.",
                                  );
                                }
                              }}
                              disabled={selectedLetter?.chat_button}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Start Chatting
                            </button>
                          </div>
                        ) : selectedLetter.recipient_id === user?.id &&
                          selectedLetter.status === "pending" ? (
                          <div className="flex justify-between items-center">
                            <span className="text-purple-600">
                              What do you think of this letter?
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleLetterAction(
                                    selectedLetter.id,
                                    "decline",
                                  )
                                }
                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center"
                                disabled={processingAction}
                              >
                                {processingAction ? (
                                  <div className="w-4 h-4 mr-2 border-t-2 border-b-2 border-red-600 rounded-full animate-spin"></div>
                                ) : (
                                  <X className="w-4 h-4 mr-2" />
                                )}
                                Decline
                              </button>
                              <button
                                onClick={() =>
                                  handleLetterAction(selectedLetter.id, "like")
                                }
                                className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors flex items-center"
                                disabled={processingAction}
                              >
                                {processingAction ? (
                                  <div className="w-4 h-4 mr-2 border-t-2 border-b-2 border-green-600 rounded-full animate-spin"></div>
                                ) : (
                                  <Heart className="w-4 h-4 mr-2" />
                                )}
                                Like
                              </button>
                            </div>
                          </div>
                        ) : selectedLetter.sender_id === user?.id &&
                          selectedLetter.status === "liked" ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-purple-600">
                              <Heart className="w-5 h-5 mr-2" />
                              <span>The recipient liked your letter!                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                const button = event.currentTarget;
                                button.disabled = true;
                                setSelectedLetter(prev => prev ? {...prev, chat_button: true} : prev);
                                try {
                                  // Get the other user's ID
                                  const otherUserId = selectedLetter.sender_id === user?.id
                                    ? selectedLetter.recipient_id
                                    : selectedLetter.sender_id;

                                  // Sort user IDs to maintain consistent ordering
                                  const [user1Id, user2Id] = [user?.id, otherUserId].sort();

                                  // Check for existing chat with active status
                                  const { data: existingMatch, error: existingError } = await supabase
                                    .from("chat_matches")
                                    .select("*")
                                    .or(
                                      `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
                                    )
                                    .eq("status", "active")
                                    .single();

                                  if (existingError && existingError.code !== "PGRST116") {
                                    throw existingError;
                                  }

                                  let matchData = existingMatch;

                                  if (!matchData) {
                                    // Create new chat match if none exists
                                    const expiresAt = new Date(
                                      Date.now() + 7 * 24 * 60 * 60 * 1000,
                                    );

                                    // Get the other user's ID
                                    const otherUserId = selectedLetter.sender_id === user?.id
                                      ? selectedLetter.recipient_id
                                      : selectedLetter.sender_id;

                                    // Sort user IDs to maintain consistent ordering
                                    const [user1Id, user2Id] = [user?.id, otherUserId].sort();

                                    const {
                                      data: newMatch,
                                      error: createError,
                                    } = await supabase
                                      .from("chat_matches")
                                      .insert({
                                        user1_id: user1Id,
                                        user2_id: user2Id,
                                        status: "active",
                                        expires_at: expiresAt.toISOString(),
                                        viewed: true,
                                        user1_liked: true,
                                        user2_liked: true,
                                      })
                                      .select()
                                      .single();

                                    if (createError) throw createError;
                                    matchData = newMatch;
                                  }

                                  // Get full chat match data including partner profile
                                  const {
                                    data: fullMatchData,
                                    error: matchError,
                                  } = await supabase
                                    .from("chat_matches")
                                    .select(
                                      `
                                      *, partner_profile:profiles!chat_matches_user2_id_fkey(
                                        id, first_name, age, instagram_id, city, state, occupation, 
                                        gender, bio, tagline, mental_tags, looking_for, love_language, 
                                        text_style, current_song, ick, green_flag
                                      )
                                    `,
                                    )
                                    .eq("id", matchData.id)
                                    .single();

                                  if (matchError) throw matchError;

                                  // Update the letter status to started_chat
                                  await supabase
                                    .from("letters")
                                    .update({ status: "started_chat" })
                                    .eq("id", selectedLetter.id);

                                  // Remove letter from list before navigating
                                  setLetters((prev) =>
                                    prev.filter(
                                      (l) => l.id !== selectedLetter.id,
                                    ),
                                  );
                                  setSelectedLetter(null);

                                  // Navigate with full match data
                                  navigate("/chat", {
                                    replace: true,
                                    state: {
                                      fromLetters: true,
                                      chatMatch: fullMatchData,
                                      matchId: matchData.id,
                                      autoSelect: true,
                                      newMatch: true,
                                    },
                                  });
                                } catch (error) {
                                  console.error(
                                    "Error getting chat match:",
                                    error,
                                  );
                                  alert(
                                    "Error opening chat. Please try again.",
                                  );
                                }
                              }}
                              disabled={selectedLetter?.chat_button}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Start Chatting
                            </button>
                          </div>
                        ) : selectedLetter.status === "declined" &&
                          selectedLetter.recipient_id === user?.id ? (
                          <div className="flex items-center text-gray-600">
                            <X className="w-5 h-5 mr-2" />
                            <span>You declined this letter</span>
                          </div>
                        ) : selectedLetter.status === "declined" &&
                          selectedLetter.sender_id === user?.id ? (
                          <div className="flex items-center text-gray-600">
                            <X className="w-5 h-5 mr-2" />
                            <span>The recipient declined your letter</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <Mail className="w-16 h-16 text-purple-200 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      Select a Letter
                    </h3>
                    <p className="text-gray-600">
                      Choose a letter from the list to view its contents
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed Compose Button (Mobile) */}
        {activeTab !== Tab.COMPOSE && (
          <button
            onClick={() => setActiveTab(Tab.COMPOSE)}
            className="md:hidden fixed right-6 bottom-20 p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg z-20"
          >
            <Send className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}