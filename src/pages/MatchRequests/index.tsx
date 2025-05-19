import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  X,
  User,
  MapPin,
  Briefcase,
  Bell,
  Search,
  AlertCircle,
  MessageSquare,
  Music,
  Flag,
  Brain,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useNotificationStore } from "../../store/notification";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

interface MatchRequest {
  id: string;
  created_at: string;
  viewed: boolean;
  user1_id: string;
  sender_profile: {
    id: string;
    first_name: string;
    age: number;
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
}

export default function MatchRequests() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { resetUnreadMatches } = useNotificationStore();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [viewedRequests, setViewedRequests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [loadingProfileMap, setLoadingProfileMap] = useState<
    Record<string, boolean>
  >({});
  const [profileErrors, setProfileErrors] = useState<Record<string, boolean>>(
    {},
  );
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [acceptedRequests, setAcceptedRequests] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, refreshCounter]);

  useEffect(() => {
    // Reset unread match requests when this component mounts
    if (user) {
      resetUnreadMatches();
    }
  }, [user, resetUnreadMatches]);

  const fetchRequests = async () => {
    if (!user?.id) return;

    setLoading(true);
    setProfileErrors({});

    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from("chat_matches")
        .select(
          `
          id, 
          created_at, 
          viewed, 
          user1_id,
          status
        `,
        )
        .eq("user2_id", user.id)
        .eq("status", "pending_request")
        .order("created_at", { ascending: false });

      console.log("Fetched match requests:", matchesData); // For debugging

      if (matchesError) throw matchesError;

      if (matchesData && matchesData.length > 0) {
        const viewed = new Set(
          matchesData.filter((r) => r.viewed).map((r) => r.id) || [],
        );
        setViewedRequests(viewed);

        const unviewedRequests = matchesData
          .filter((match) => !match.viewed)
          .map((match) => match.id);

        if (unviewedRequests.length > 0) {
          await supabase
            .from("chat_matches")
            .update({ viewed: true })
            .in("id", unviewedRequests);
        }

        const initialRequests = matchesData.map((match) => ({
          ...match,
          sender_profile: null,
        }));

        setRequests(initialRequests);

        const loadingProfileState: Record<string, boolean> = {};
        initialRequests.forEach((request) => {
          loadingProfileState[request.user1_id] = true;
        });
        setLoadingProfileMap(loadingProfileState);

        const uniqueSenderIds = [
          ...new Set(initialRequests.map((r) => r.user1_id)),
        ];

        for (const senderId of uniqueSenderIds) {
          fetchSingleProfile(senderId);
        }
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleProfile = async (userId: string) => {
    if (!userId) {
      console.error("Invalid user ID provided");
      return;
    }

    try {
      setLoadingProfileMap((prev) => ({ ...prev, [userId]: true }));

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      setLoadingProfileMap((prev) => ({ ...prev, [userId]: false }));

      if (error) {
        setProfileErrors((prev) => ({ ...prev, [userId]: true }));
        console.error(`Error fetching profile for user ${userId}:`, error);
        return;
      }

      if (!data) {
        setProfileErrors((prev) => ({ ...prev, [userId]: true }));
        console.warn(`Warning: No profile found for user ${userId}`);
        return;
      }

      setRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.user1_id === userId
            ? { ...request, sender_profile: data }
            : request,
        ),
      );

      setProfileErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[userId];
        return newErrors;
      });
    } catch (err) {
      setLoadingProfileMap((prev) => ({ ...prev, [userId]: false }));
      setProfileErrors((prev) => ({ ...prev, [userId]: true }));
      console.error(
        `Unexpected error in fetchSingleProfile for user ${userId}:`,
        err,
      );
    }
  };

  const retryLoadProfile = (userId: string) => {
    if (!userId) return;

    setLoadingProfileMap((prev) => ({ ...prev, [userId]: true }));
    setProfileErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[userId];
      return newErrors;
    });

    fetchSingleProfile(userId);
  };

  const handleRefresh = () => {
    Object.keys(profileErrors).forEach((userId) => {
      retryLoadProfile(userId);
    });

    if (Object.keys(profileErrors).length === 0) {
      setRefreshCounter((prev) => prev + 1);
    }
  };

  const handleRequestAction = async (
    requestId: string,
    action: "accept" | "decline",
  ) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));

      const { error } = await supabase
        .from("chat_matches")
        .update({
          status: action === "accept" ? "active" : "declined",
          user2_liked: action === "accept" ? true : false,
          viewed: true,
        })
        .eq("id", requestId);

      if (error) throw error;

      if (action === "accept") {
        // Set expiration time to 7 days from now when accepting
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Update match status to active when accepting
        const { error: updateError } = await supabase
          .from("chat_matches")
          .update({ 
            status: "active",
            user2_liked: true,
            viewed: true,
            expires_at: expiresAt.toISOString()
          })
          .eq("id", requestId);

        if (updateError) throw updateError;

        setAcceptedRequests((prev) => new Set([...prev, requestId]));
      } else {
        // Update match status to declined when declining
        const { error: updateError } = await supabase
          .from("chat_matches")
          .update({
            status: "declined",
            user2_liked: false,
            viewed: true,
          })
          .eq("id", requestId);

        if (updateError) throw updateError;

        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        if (selectedRequestId === requestId) {
          setSelectedRequestId(null);
          setShowMobileDetail(false);
        }
      }

      if (action === "accept") {
        setAcceptedRequests((prev) => new Set([...prev, requestId]));
        const shouldStartChat = window.confirm(
          "Match request accepted! Would you like to start chatting now?",
        );

        if (shouldStartChat) {
          navigate(`/chat?matchId=${requestId}&autoSelect=true&newMatch=true`);
        }
      } else {
        // For decline action
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        if (selectedRequestId === requestId) {
          setSelectedRequestId(null);
          setShowMobileDetail(false);
        }
      }
    } catch (error) {
      console.error("Error handling request:", error);
      alert("Failed to process the request. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequestId(requestId === selectedRequestId ? null : requestId);
    setShowMobileDetail(true);
  };

  const filteredRequests = requests.filter((request) => {
    // Filter out accepted requests
    if (acceptedRequests.has(request.id)) return false;
    if (!searchQuery.trim() || !request.sender_profile) return true;
    const query = searchQuery.toLowerCase();
    const profile = request.sender_profile;
    return (
      profile.first_name?.toLowerCase().includes(query) ||
      profile.city?.toLowerCase().includes(query) ||
      profile.state?.toLowerCase().includes(query) ||
      profile.occupation?.toLowerCase().includes(query) ||
      profile.gender?.toLowerCase().includes(query) ||
      profile.bio?.toLowerCase().includes(query) ||
      profile.tagline?.toLowerCase().includes(query)
    );
  });

  const selectedRequest = requests.find((req) => req.id === selectedRequestId);

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid gap-6",
            "grid-cols-1 md:grid-cols-12",
            showMobileDetail ? "md:grid-cols-12" : "",
          )}
        >
          <div
            className={cn(
              "md:col-span-4 lg:col-span-3",
              showMobileDetail ? "hidden md:block" : "block",
            )}
          >
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Bell className="w-6 h-6 text-purple-600 mr-3" />
                  Match Requests
                  {requests.length > 0 && (
                    <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-600 text-sm font-semibold rounded-full">
                      {requests.length}
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleRefresh}
                  className="p-2 hover:bg-purple-50 rounded-full transition-colors text-purple-600"
                  aria-label="Refresh requests"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Search matches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredRequests.length > 0 ? (
                <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-2">
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => handleSelectRequest(request.id)}
                      className={cn(
                        "p-4 rounded-xl transition-all duration-300 cursor-pointer border-2",
                        selectedRequestId === request.id
                          ? "bg-purple-50 border-purple-500"
                          : "bg-white border-transparent hover:border-purple-200",
                        !viewedRequests.has(request.id) &&
                          "border-l-4 border-l-purple-500",
                      )}
                    >
                      {loadingProfileMap[request.user1_id] ? (
                        <div className="flex justify-center py-4">
                          <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                        </div>
                      ) : request.sender_profile ? (
                        <>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                {request.sender_profile.first_name},{" "}
                                {request.sender_profile.age}
                              </h3>
                              <div className="flex items-center text-gray-600 mt-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span className="text-sm">
                                  {request.sender_profile.city},{" "}
                                  {request.sender_profile.state}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-600 mt-1">
                                <Briefcase className="w-4 h-4 mr-1" />
                                <span className="text-sm">
                                  {request.sender_profile.occupation}
                                </span>
                              </div>
                            </div>
                            {!viewedRequests.has(request.id) && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">
                                New
                              </span>
                            )}
                          </div>
                          {request.sender_profile.tagline && (
                            <p className="text-sm text-purple-600 italic mt-3 line-clamp-2">
                              "{request.sender_profile.tagline}"
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-3">
                            <User className="w-6 h-6 text-gray-400" />
                            <span className="text-gray-600">
                              {profileErrors[request.user1_id]
                                ? "Failed to load profile"
                                : "Loading profile..."}
                            </span>
                          </div>
                          {profileErrors[request.user1_id] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                retryLoadProfile(request.user1_id);
                              }}
                              className="text-sm text-purple-600 hover:text-purple-800"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-16 h-16 text-purple-200 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Match Requests
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start swiping to discover new connections!
                  </p>
                  <button
                    onClick={() => navigate("/swipe")}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    Start Swiping
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "md:col-span-8 lg:col-span-9",
              !showMobileDetail ? "hidden md:block" : "block",
            )}
          >
            <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
              {selectedRequest ? (
                <>
                  <div className="md:hidden mb-4">
                    <button
                      onClick={() => setShowMobileDetail(false)}
                      className="flex items-center text-purple-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      Back to List
                    </button>
                  </div>

                  {loadingProfileMap[selectedRequest.user1_id] ? (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-600">
                        Loading profile information...
                      </p>
                    </div>
                  ) : profileErrors[selectedRequest.user1_id] ? (
                    <div className="h-full flex flex-col items-center justify-center p-8">
                      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Failed to Load Profile
                      </h3>
                      <p className="text-gray-600 mb-6 text-center">
                        We couldn't load this profile. Please try again.
                      </p>
                      <button
                        onClick={() =>
                          retryLoadProfile(selectedRequest.user1_id)
                        }
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                      >
                        Retry Loading
                      </button>
                    </div>
                  ) : selectedRequest.sender_profile ? (
                    <div className="space-y-8">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            {selectedRequest.sender_profile.first_name},{" "}
                            {selectedRequest.sender_profile.age}
                          </h2>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-5 h-5 mr-2" />
                              <span>
                                {selectedRequest.sender_profile.city},{" "}
                                {selectedRequest.sender_profile.state}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Briefcase className="w-5 h-5 mr-2" />
                              <span>
                                {selectedRequest.sender_profile.occupation}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              handleRequestAction(selectedRequest.id, "decline")
                            }
                            className="px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center"
                          >
                            <X className="w-5 h-5 mr-2" />
                            Decline
                          </button>
                          <button
                            onClick={() =>
                              !acceptedRequests.has(selectedRequest.id) &&
                              !actionLoading[selectedRequest.id] &&
                              handleRequestAction(selectedRequest.id, "accept")
                            }
                            disabled={
                              acceptedRequests.has(selectedRequest.id) ||
                              actionLoading[selectedRequest.id]
                            }
                            className={`px-6 py-3 rounded-xl transition-colors flex items-center ${
                              acceptedRequests.has(selectedRequest.id)
                                ? "bg-green-100 text-green-700 cursor-not-allowed"
                                : actionLoading[selectedRequest.id]
                                  ? "bg-gray-100 text-gray-500 cursor-wait"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {actionLoading[selectedRequest.id] ? (
                              <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                            ) : (
                              <Heart
                                className={`w-5 h-5 mr-2 ${acceptedRequests.has(selectedRequest.id) ? "text-green-700" : ""}`}
                              />
                            )}
                            {acceptedRequests.has(selectedRequest.id)
                              ? "Accepted ✓"
                              : "Accept"}
                          </button>
                        </div>
                      </div>

                      {selectedRequest.sender_profile.tagline && (
                        <div className="bg-purple-50 p-6 rounded-xl">
                          <p className="text-xl text-purple-600 font-medium italic">
                            "{selectedRequest.sender_profile.tagline}"
                          </p>
                        </div>
                      )}

                      <div className="bg-gray-50 p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                          About Me
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedRequest.sender_profile.bio}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedRequest.sender_profile.looking_for?.length >
                          0 && (
                          <div className="bg-purple-50 p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Heart className="w-5 h-5 text-purple-600 mr-2" />
                              Looking For
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedRequest.sender_profile.looking_for.map(
                                (item, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm"
                                  >
                                    {item}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {selectedRequest.sender_profile.mental_tags?.length >
                          0 && (
                          <div className="bg-purple-50 p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Brain className="w-5 h-5 text-purple-600 mr-2" />
                              Mental Aesthetic
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedRequest.sender_profile.mental_tags.map(
                                (tag, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm"
                                  >
                                    {tag}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedRequest.sender_profile.love_language && (
                          <div className="bg-pink-50 p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Heart className="w-5 h-5 text-pink-600 mr-2" />
                              Love Language
                            </h3>
                            <p className="text-gray-700">
                              {selectedRequest.sender_profile.love_language}
                            </p>
                          </div>
                        )}

                        {selectedRequest.sender_profile.text_style && (
                          <div className="bg-blue-50 p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                              Text Style
                            </h3>
                            <p className="text-gray-700">
                              {selectedRequest.sender_profile.text_style}
                            </p>
                          </div>
                        )}
                      </div>

                      {selectedRequest.sender_profile.current_song && (
                        <div className="bg-purple-50 p-6 rounded-xl">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Music className="w-5 h-5 text-purple-600 mr-2" />
                            Currently Playing
                          </h3>
                          <p className="text-gray-700">
                            {selectedRequest.sender_profile.current_song}
                          </p>
                        </div>
                      )}

                      {(selectedRequest.sender_profile.green_flag ||
                        selectedRequest.sender_profile.ick) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {selectedRequest.sender_profile.green_flag && (
                            <div className="bg-green-50 p-6 rounded-xl">
                              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                                <Flag className="w-5 h-5 text-green-600 mr-2" />
                                Green Flag
                              </h3>
                              <p className="text-green-700">
                                {selectedRequest.sender_profile.green_flag}
                              </p>
                            </div>
                          )}

                          {selectedRequest.sender_profile.ick && (
                            <div className="bg-red-50 p-6 rounded-xl">
                              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                                <X className="w-5 h-5 text-red-600 mr-2" />
                                Biggest Ick
                              </h3>
                              <p className="text-red-700">
                                {selectedRequest.sender_profile.ick}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-purple-50 p-12 rounded-full mb-6">
                    <Bell className="w-16 h-16 text-purple-300" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Select a Match Request
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    Choose a match request from the list to view their complete
                    profile and decide if you'd like to connect.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}