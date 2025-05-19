import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  X,
  Filter,
  ChevronDown,
  MessageSquare,
  MapPin,
  Briefcase,
  Star,
  Music,
  User,
  Shield,
  AlertTriangle,
  Coffee,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { useSwipeGesture } from "./useSwipeGesture";

interface Profile {
  id: string;
  first_name: string;
  age: number;
  city: string;
  state: string;
  occupation: string;
  bio: string;
  tagline: string;
  mental_tags: string[];
  looking_for: string[];
  chat_starter: string | null;
  current_song: string | null;
  love_language: string;
  text_style: string;
  ick: string | null;
  green_flag: string | null;
  gender: string;
}

interface ChatPreferences {
  min_age: number;
  max_age: number;
  show_me: string[];
  preferred_city: string | null;
  preferred_gender: string | null;
}

// Load persisted skipped and liked profiles from localStorage and Supabase
const loadPersistedSet = async (
  key: string,
  userId: string,
): Promise<Set<string>> => {
  // First load from localStorage
  const stored = localStorage.getItem(`${key}_${userId}`);
  const localSet = new Set(stored ? JSON.parse(stored) : []);

  // Then load from Supabase
  try {
    const { data } = await supabase
      .from("swipe_logs")
      .select("swiped_profile_id")
      .eq("user_id", userId)
      .eq("action", key === "skippedProfiles" ? "pass" : "like");

    if (data) {
      // Add all profile IDs from Supabase to the set
      data.forEach((log) => localSet.add(log.swiped_profile_id));
      // Update localStorage with complete set
      localStorage.setItem(`${key}_${userId}`, JSON.stringify([...localSet]));
    }
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
  }

  return localSet;
};

// Initialize empty sets
const skippedProfiles = new Set<string>();
const likedProfiles = new Set<string>();

// Save sets to localStorage
const persistSet = (key: string, set: Set<string>, userId: string) => {
  localStorage.setItem(`${key}_${userId}`, JSON.stringify([...set]));
};

export default function Swipe() {
  const { user } = useAuthStore();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const initializeAttempts = useRef(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoadingError("Loading is taking longer than expected. Please try refreshing.");
        setLoading(false);
      }
    }, 8000); // Reduced to 8 seconds for better UX

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading]);

  // Add retry mechanism for initialization
  const retryInitialization = async () => {
    try {
      initializeAttempts.current += 1;
      setLoading(true);
      setLoadingError(null);
      await initializeUserData();
    } catch (error) {
      console.error('Initialization error:', error);
      if (initializeAttempts.current < MAX_ATTEMPTS) {
        setTimeout(retryInitialization, 2000); // Retry after 2 seconds
      } else {
        setLoadingError("Unable to load data. Please check your connection and try again.");
        setLoading(false);
      }
    }
  };
  const [preferences, setPreferences] = useState<ChatPreferences>({
    min_age: 18,
    max_age: 100,
    show_me: [],
    preferred_city: null,
    preferred_gender: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [swipeAnimation, setSwipeAnimation] = useState<"left" | "right" | null>(
    null,
  );
  const [filtersChanged, setFiltersChanged] = useState(false);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);
  const [filterAttempts, setFilterAttempts] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "about" | "interests">(
    "profile",
  );
  const [animateCard, setAnimateCard] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Refs for the card element for animations
  const cardRef = useRef<HTMLDivElement>(null);

  // Setup swipe gesture handling
  const { direction, swiping } = useSwipeGesture(
    cardRef,
    {
      onSwipeLeft: () => handleAction("pass"),
      onSwipeRight: () => handleAction("like"),
    },
    { threshold: 100 },
  );

  // Cleanup function for memory management
  useEffect(() => {
    return () => {
      skippedProfiles.clear();
      likedProfiles.clear();
      setCurrentProfile(null);
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      const initializeData = async () => {
        try {
          // Load persisted sets first with cache validation
          const [loadedSkipped, loadedLiked] = await Promise.all([
            loadPersistedSet("skippedProfiles", user.id),
            loadPersistedSet("likedProfiles", user.id)
          ]);

          // Update the sets
          loadedSkipped.forEach((id) => skippedProfiles.add(id));
          loadedLiked.forEach((id) => likedProfiles.add(id));

          // Initialize user data after loading persisted sets
          await initializeUserData();
        } catch (error) {
          console.error('Error in initialization:', error);
          retryInitialization();
        }
      };

      initializeData();
    }
  }, [user]);

  // Add animation to the card when it first appears
  useEffect(() => {
    if (currentProfile && !animateCard) {
      setTimeout(() => {
        setAnimateCard(true);
      }, 100);
    } else {
      setAnimateCard(false);
    }
  }, [currentProfile]);

  const initializeUserData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setShowEmptyMessage(false);

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
        setShowEmptyMessage(true);
        setLoading(false);
        return;
      }

      if (!existingProfile?.first_name || !existingProfile?.gender) {
        window.location.href = "/onboarding";
        return;
      }

      await fetchPreferences();
      const success = await fetchNextProfile();

      if (!success) {
        setShowEmptyMessage(true);
      }
    } catch (error) {
      console.error("Error initializing user data:", error);
      setShowEmptyMessage(true);
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  };

  const fetchPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data: existingPrefs, error: fetchError } = await supabase
        .from("chat_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingPrefs) {
        setPreferences(existingPrefs);
      } else {
        const defaultPrefs = {
          user_id: user.id,
          min_age: 18,
          max_age: 100,
          show_me: [],
          preferred_city: null,
          preferred_gender: null,
        };

        const { data: newPrefs, error: insertError } = await supabase
          .from("chat_preferences")
          .upsert(defaultPrefs)
          .select()
          .maybeSingle();

        if (insertError) throw insertError;
        if (newPrefs) setPreferences(newPrefs);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  const fetchNextProfile = async () => {
    if (!user?.id) return false;

    try {
      // Don't set loading true if we already have a current profile
      if (!currentProfile) {
        setLoading(true);
      }
      setLoadingError(null);
      setAnimateCard(false);
      setShowEmptyMessage(false);

      const { data, error } = await supabase.rpc("get_random_profile", {
        user_id: user.id,
        min_age: preferences.min_age,
        max_age: preferences.max_age,
        preferred_gender: preferences.preferred_gender,
        preferred_city: preferences.preferred_city,
      });

      if (error) {
        console.error("Error fetching profile:", error);
        setCurrentProfile(null);
        setShowEmptyMessage(true);
        return false;
      }

      let profileData = Array.isArray(data) ? data[0] : data;

      // If no profile data was returned
      if (!profileData) {
        setCurrentProfile(null);
        setShowEmptyMessage(true);
        return false;
      }

      // Set the current profile
      setCurrentProfile(profileData);
      return true;
    } catch (error) {
      console.error("Error fetching profile:", error);
      setCurrentProfile(null);
      setShowEmptyMessage(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkExistingMatch = async (otherUserId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from("chat_matches")
        .select("id, status")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${otherUserId},user2_id.eq.${otherUserId}`)
        .in("status", ["active", "pending", "pending_reveal"]);

      if (error) throw error;

      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking existing match:", error);
      return true;
    }
  };

  const handleAction = async (action: "like" | "pass") => {
    if (!currentProfile || !user?.id || actionLoading) return;

    try {
      // Increment swipe count and check limit
      const { data: newCount, error: countError } = await supabase.rpc(
        "increment_swipe_count",
        { p_user_id: user.id },
      );

      if (countError) throw countError;

      if (newCount === -1) {
        alert("You have reached your daily swipe limit. Come back tomorrow!");
        return;
      }

      // Log the swipe
      const { error: logError } = await supabase.from("swipe_logs").insert({
        user_id: user.id,
        action: action,
        swiped_profile_id: currentProfile.id,
      });

      if (logError) throw logError;

      // Set animation based on action
      setSwipeAnimation(action === "like" ? "right" : "left");

      // Store current profile ID
      const currentProfileId = currentProfile.id;

      // Add to appropriate set
      if (action === "like") {
        likedProfiles.add(currentProfileId);
        persistSet("likedProfiles", likedProfiles, user.id);
        setLikeCount((prev) => prev + 1);
      } else {
        skippedProfiles.add(currentProfileId);
        persistSet("skippedProfiles", skippedProfiles, user.id);
        setSkippedCount((prev) => prev + 1);
      }

      // Wait for animation to complete
      setTimeout(async () => {
        setActionLoading(true);
        setSwipeAnimation(null);

        try {
          if (action === "like") {
            const matchExists = await checkExistingMatch(currentProfileId);

            if (!matchExists) {
              // Calculate expiration time (24 hours from now)
              const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

              // Create the match as pending
              const { error: createError } = await supabase
                .from("chat_matches")
                .insert({
                  user1_id: user.id,
                  user2_id: currentProfileId,
                  expires_at: expiresAt.toISOString(),
                  status: 'pending_request',
                  user1_liked: true,
                  user2_liked: false,
                  viewed: false,
                });

              if (createError) throw createError;
            }
          }

          // Get next profile regardless of like/pass
          const success = await fetchNextProfile();

          // Only reset showProfile if we successfully got a new profile
          if (success) {
            setShowProfile(false);
          }
        } catch (error) {
          console.error("Error handling action:", error);
          setShowEmptyMessage(true);
        } finally {
          setActionLoading(false);
          setLoading(false);
        }
      }, 300); // Matching the animation duration
    } catch (error) {
      console.error("Error checking swipe limit:", error);
      alert("There was an error checking your swipe limit. Please try again.");
    }
  };

  const updatePreferences = async (
    newPreferences: Partial<ChatPreferences>,
  ) => {
    if (!user?.id) return;

    // Mark filters as changed
    setFiltersChanged(true);

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error("Error updating preferences locally:", error);
    }
  };

  const applyFilters = async () => {
    if (!user?.id) return;

    setLoading(true);
    setShowFilters(false);
    try {
      // Save preferences to database
      const { error } = await supabase.from("chat_preferences").upsert({
        user_id: user.id,
        ...preferences,
      });

      if (error) throw error;

      // Reset skipped/liked sets when filters change
      skippedProfiles.clear();
      likedProfiles.clear();
      localStorage.removeItem("skippedProfiles_" + user.id);
      localStorage.removeItem("likedProfiles_" + user.id);
      setLikeCount(0);
      setSkippedCount(0);

      // Fetch new profile with updated preferences
      await fetchNextProfile();
      setFiltersChanged(false);
      setShowFilters(false);
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProfileDetails = () => {
    setShowProfile(!showProfile);
  };

  if (loading || loadingError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-purple-100">
        <div className="text-center px-4">
          {loadingError ? (
            <>
              <div className="w-24 h-24 mx-auto relative mb-4">
                <Heart className="w-16 h-16 text-purple-300" />
              </div>
              <p className="text-purple-800 font-medium text-lg mb-4">{loadingError}</p>
              <button
                onClick={() => {
                  setLoadingError(null);
                  setLoading(true);
                  fetchNextProfile();
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 rounded-full border-4 border-purple-300 opacity-25"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <Heart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-purple-600" />
              </div>
              <p className="mt-6 text-purple-800 font-medium text-lg">
                Finding your perfect match...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (showEmptyMessage || !currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-purple-100 p-4">
        <div className="card p-8 text-center max-w-md animate-fade-in">
          <div className="w-28 h-28 mx-auto relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full animate-pulse opacity-70"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Heart className="w-14 h-14 text-purple-500" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            No More Matches
          </h2>
          <p className="text-gray-600 mb-8">
            We're looking for more people that match your preferences. Try the letter exchange feature, adjust your filter, or check back later!
          </p>

          <div className="space-y-4">
            <button
              onClick={() => {
                // Clear filter states and try again
                skippedProfiles.clear();
                likedProfiles.clear();
                setLikeCount(0);
                setSkippedCount(0);
                fetchNextProfile();
              }}
              className="btn w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white transition-all duration-300 transform hover:scale-105 py-3 rounded-xl shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block mr-2"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              Refresh Profiles
            </button>

            {showFilters && (
              <div className="mt-4 animate-fade-in">
                <div className="card p-6 bg-white/90">
                  {/* Gender Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      I'm Interested In
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["male", "female", null].map((option, idx) => {
                        const labels = ["Male", "Female", "Everyone"];
                        const colors = [
                          "from-blue-600 to-blue-400",
                          "from-pink-600 to-pink-400",
                          "from-purple-600 to-pink-600",
                        ];
                        return (
                          <button
                            key={idx}
                            onClick={() =>
                              updatePreferences({ preferred_gender: option })
                            }
                            className={`py-2 px-3 rounded-lg text-sm transition-all duration-300 ${
                              preferences.preferred_gender === option
                                ? `bg-gradient-to-r ${colors[idx]} text-white shadow-md`
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {labels[idx]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Age Range */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Range: {preferences.min_age} - {preferences.max_age}
                    </label>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-8">{preferences.min_age}</span>
                        <input
                          type="range"
                          value={preferences.min_age}
                          onChange={(e) =>
                            updatePreferences({
                              min_age: parseInt(e.target.value),
                            })
                          }
                          min="18"
                          max={preferences.max_age - 1}
                          className="flex-grow h-2 bg-purple-200 rounded-lg accent-purple-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-8">{preferences.max_age}</span>
                        <input
                          type="range"
                          value={preferences.max_age}
                          onChange={(e) =>
                            updatePreferences({
                              max_age: parseInt(e.target.value),
                            })
                          }
                          min={preferences.min_age + 1}
                          max="100"
                          className="flex-grow h-2 bg-purple-200 rounded-lg accent-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* City Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred City (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={preferences.preferred_city || ""}
                        onChange={(e) =>
                          updatePreferences({
                            preferred_city: e.target.value || null,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                        placeholder="Enter city name"
                      />
                      {preferences.preferred_city && (
                        <button
                          onClick={() => updatePreferences({ preferred_city: null })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={() => {
                      applyFilters();
                      setShowFilters(false);
                    }}
                    disabled={!filtersChanged}
                    className={`w-full py-2 rounded-lg transition-all ${
                      filtersChanged
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-purple-300 text-white cursor-not-allowed"
                    }`}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowFilters(true);
                setFiltersChanged(false);
              }}
              className="btn w-full bg-white border-2 border-purple-600 text-purple-600 transition-all duration-300 transform hover:scale-105 py-3 rounded-xl shadow-md flex items-center justify-center"
            >
              <Filter className="w-5 h-5 mr-2" />
              Adjust Filters
            </button>


          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-purple-100 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Filters Panel */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-2 sm:px-4">
          <div className="flex-1 min-w-[160px] text-purple-600 font-medium text-lg flex items-center">
            <div className="flex gap-2 items-center bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md w-full sm:w-auto justify-between sm:justify-start">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-sm text-purple-600">{likeCount}</span>
              <div className="w-px h-4 bg-gray-300 mx-2"></div>
              <X className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">{skippedCount}</span>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm shadow-md px-4 py-2 rounded-full hover:shadow-xl transition-all duration-300 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Filter className="w-5 h-5 text-purple-600" />
            <span className="text-purple-600 font-medium text-sm sm:text-base">
              Filters
            </span>
            <ChevronDown
              className={`w-4 h-4 text-purple-600 transform transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {showFilters && (
          <div className="relative mb-6 animate-slide-down px-2 sm:px-4">
            <div className="card py-6 px-4 sm:px-6 bg-white/90 backdrop-blur-md shadow-xl rounded-2xl border border-purple-100 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Match Preferences
              </h3>
              <div className="space-y-6">
                {/* Gender Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    I'm Interested In
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {["male", "female", null].map((option, idx) => {
                      const labels = ["Male", "Female", "Everyone"];
                      const colors = [
                        "from-blue-600 to-blue-400",
                        "from-pink-600 to-pink-400",
                        "from-purple-600 to-pink-600",
                      ];
                      const current = preferences.preferred_gender;
                      return (
                        <button
                          key={idx}
                          onClick={() =>
                            updatePreferences({ preferred_gender: option })
                          }
                          className={`py-2 px-3 rounded-lg text-sm sm:text-base transition-all duration-300 ${
                            current === option
                              ? `bg-gradient-to-r ${colors[idx]} text-white font-medium shadow-md`
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {labels[idx]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Age Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Range: {preferences.min_age} - {preferences.max_age}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm text-gray-600 font-medium w-10 text-right">
                        {preferences.min_age}
                      </span>
                      <input
                        type="range"
                        value={preferences.min_age}
                        onChange={(e) =>
                          updatePreferences({
                            min_age: parseInt(e.target.value),
                          })
                        }
                        min="18"
                        max={
                          preferences.max_age > 18
                            ? preferences.max_age - 1
                            : 18
                        }
                        step="1"
                        className="flex-grow h-2 bg-purple-200 rounded-lg cursor-pointer accent-purple-600"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm text-gray-600 font-medium w-10 text-right">
                        {preferences.max_age}
                      </span>
                      <input
                        type="range"
                        value={preferences.max_age}
                        onChange={(e) =>
                          updatePreferences({
                            max_age: parseInt(e.target.value),
                          })
                        }
                        min={
                          preferences.min_age < 100
                            ? preferences.min_age + 1
                            : 100
                        }
                        max="100"
                        step="1"
                        className="flex-grow h-2 bg-purple-200 rounded-lg cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>
                </div>

                {/* City Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred City (optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={preferences.preferred_city || ""}
                      onChange={(e) =>
                        updatePreferences({
                          preferred_city: e.target.value || null,
                        })
                      }
                      className="input w-full bg-white pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      placeholder="Enter city name"
                    />
                    {preferences.preferred_city && (
                      <button
                        onClick={() =>
                          updatePreferences({ preferred_city: null })
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row justify-end sm:space-x-3 pt-4 border-t border-purple-100 space-y-3 sm:space-y-0">
                  <button
                    onClick={() => {
                      setShowFilters(false);
                      setFiltersChanged(false);
                    }}
                    className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      applyFilters();
                      setShowFilters(false);
                    }}
                    disabled={!filtersChanged}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      filtersChanged
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-purple-300 text-white cursor-not-allowed"
                    }`}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div
          ref={cardRef}
          className={cn(
            "relative transition-all duration-300 transform",
            swipeAnimation === "left"
              ? "-translate-x-full opacity-0"
              : swipeAnimation === "right"
                ? "translate-x-full opacity-0"
                : "translate-x-0",
            animateCard ? "animate-scale-in" : "",
          )}
        >
          <div
            className={cn(
              "card overflow-hidden rounded-2xl shadow-2xl transition-all duration-300",
              showProfile ? "max-h-[80vh] overflow-y-auto" : "max-h-[600px]",
              "bg-gradient-to-br from-white via-white to-purple-50",
            )}
>
            {/* Card Header - Always visible */}
            <div
              className="p-5 border-b border-purple-100 flex justify-between items-center cursor-pointer bg-white"
              onClick={toggleProfileDetails}
            >
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  {currentProfile?.first_name}, {currentProfile?.age}
                </h2>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {currentProfile?.city}, {currentProfile?.state} •{" "}
                  {currentProfile?.gender}
                </p>
              </div>
              <div className="text-purple-600">
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${showProfile ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {/* Quick Preview - Tagline */}
            <div
              className={cn(
                "p-5 bg-gradient-to-br from-purple-50 to-pink-50 cursor-pointer transition-all duration-300",
                !showProfile ? "border-b border-purple-100" : "",
              )}
              onClick={toggleProfileDetails}
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 shadow-lg animate-float">
                  <span className="text-3xl font-bold text-white">
                    {currentProfile?.first_name[0]}
                  </span>
                </div>
              </div>

              {currentProfile?.tagline && (
                <p className="text-xl text-purple-600 font-medium italic text-center mb-3">
                  "{currentProfile?.tagline}"
                </p>
              )}

              <div className="flex justify-center">
                <p className="text-sm text-center text-gray-500 flex items-center">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {currentProfile?.occupation}
                </p>
              </div>

              <div className="flex justify-center mt-3">
                <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                  {currentProfile?.mental_tags
                    ?.slice(0, 3)
                    .map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>

              {!showProfile && (
                <div className="text-center mt-4 text-purple-500 text-sm flex items-center justify-center">
                  <span className="mr-1">Tap to view full profile</span>
                  <ChevronDown className="w-3 h-3 animate-bounce" />
                </div>
              )}
            </div>

            {/* Extended Profile - Conditionally Visible */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                showProfile
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0",
              )}
            >
              {/* Profile Tabs */}
              <div className="flex items-center justify-around px-2 bg-white border-b border-purple-100">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={cn(
                    "flex-1 py-3 px-1 text-sm font-medium transition-colors duration-200",
                    activeTab === "profile"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-600 hover:text-purple-500",
                  )}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("about")}
                  className={cn(
                    "flex-1 py-3 px-1 text-sm font-medium transition-colors duration-200",
                    activeTab === "about"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-600 hover:text-purple-500",
                  )}
                >
                  About
                </button>
                <button
                  onClick={() => setActiveTab("interests")}
                  className={cn(
                    "flex-1 py-3 px-1 text-sm font-medium transition-colors duration-200",
                    activeTab === "interests"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-600 hover:text-purple-500",
                  )}
                >
                  Interests
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Profile Tab Content */}
                {activeTab === "profile" && (
                  <div className="animate-fade-in">
                    {/* Bio Section */}
                    <div>
                      <div className="flex items-center text-purple-600 mb-2">
                        <User className="w-4 h-4 mr-2" />
                        <h3 className="font-medium">
                          About {currentProfile?.first_name}
                        </h3>
                      </div>
                      <p className="text-gray-800">{currentProfile?.bio}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {/* Love Language */}
                      {currentProfile?.love_language && (
                        <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center text-pink-600 mb-2">
                            <Heart className="w-4 h-4 mr-2" />
                            <h3 className="font-medium">Love Language</h3>
                          </div>
                          <p className="text-gray-800">
                            {currentProfile?.love_language}
                          </p>
                        </div>
                      )}

                      {/* Text Style */}
                      {currentProfile?.text_style && (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center text-purple-600 mb-2">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            <h3 className="font-medium">Text Style</h3>
                          </div>
                          <p className="text-gray-800">
                            {currentProfile?.text_style}
                          </p>
                        </div>
                      )}

                      {/* Current Song */}
                      {currentProfile?.current_song && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center text-blue-600 mb-2">
                            <Music className="w-4 h-4 mr-2" />
                            <h3 className="font-medium">Currently Playing</h3>
                          </div>
                          <p className="text-gray-800">
                            {currentProfile?.current_song}
                          </p>
                        </div>
                      )}

                      {/* Chat Starter */}
                      {currentProfile?.chat_starter && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center text-indigo-600 mb-2">
                            <Coffee className="w-4 h-4 mr-2" />
                            <h3 className="font-medium">Chat Starter</h3>
                          </div>
                          <p className="text-gray-800">
                            {currentProfile?.chat_starter}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* About Tab Content */}
                {activeTab === "about" && (
                  <div className="animate-fade-in">
                    {/* Green Flag & Ick */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {currentProfile?.green_flag && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center text-green-600 mb-2">
                            <Shield className="w-4 h-4 mr-2" />
                            <h3 className="font-medium">Green Flag</h3>
                          </div>
                          <p className="text-gray-800">
                            {currentProfile?.green_flag}
                          </p>
                        </div>
                      )}
                      {currentProfile?.ick && (
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center text-red-600 mb-2">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            <h3 className="font-medium">Biggest Ick</h3>
                          </div>
                          <p className="text-gray-800">{currentProfile?.ick}</p>
                        </div>
                      )}
                    </div>

                    {/* Basic Information */}
                    <div className="bg-white p-5 rounded-xl shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Basic Information
                      </h3>

                      <div className="space-y-3">
                        <div className="flex">
                          <div className="w-24 text-gray-500">Age</div>
                          <div>{currentProfile?.age}</div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">Gender</div>
                          <div>{currentProfile?.gender}</div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">Location</div>
                          <div>
                            {currentProfile?.city}, {currentProfile?.state}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">Occupation</div>
                          <div>{currentProfile?.occupation}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interests Tab Content */}
                {activeTab === "interests" && (
                  <div className="animate-fade-in">
                    {/* Looking For Section */}
                    <div className="mb-6">
                      <div className="flex items-center text-purple-600 mb-4">
                        <Heart className="w-4 h-4 mr-2" />
                        <h3 className="font-medium">Looking For</h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {currentProfile?.looking_for?.map((item, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 rounded-full text-sm shadow-sm animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Mental Aesthetic */}
                    <div>
                      <div className="flex items-center text-purple-600 mb-4">
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
                          className="mr-2"
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
                        <h3 className="font-medium">Mental Aesthetic</h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {currentProfile?.mental_tags?.map((tag, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 text-indigo-700 rounded-full text-sm shadow-sm animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-10 mt-8">
            <button
              onClick={() => handleAction("pass")}
              disabled={actionLoading}
              className="p-5 bg-white rounded-full shadow-xl hover:shadow-red-200 hover:bg-red-50 transition-all duration-300 transform hover:scale-110 group"
            >
              <div className="relative">
                <div className="absolute -inset-1.5 bg-red-400 rounded-full opacity-0 group-hover:opacity-30 group-hover:blur-md transition-all duration-300"></div>
                <X className="w-8 h-8 text-red-500 relative z-10" />
              </div>
            </button>
            <button
              onClick={() => handleAction("like")}
              disabled={actionLoading}
              className="p-5 bg-white rounded-full shadow-xl hover:shadow-green-200 hover:bg-green-50 transition-all duration-300 transform hover:scale-110 group"
            >
              <div className="relative">
                <div className="absolute -inset-1.5 bg-green-400 rounded-full opacity-0 group-hover:opacity-30 group-hover:blur-md transition-all duration-300"></div>
                {actionLoading ? (
                  <div className="w-8 h-8 border-t-2 border-b-2 border-green-500 rounded-full animate-spin relative z-10" />
                ) : (
                  <Heart className="w-8 h-8 text-green-500 relative z-10 group-hover:fill-green-500 transition-colors duration-300" />
                )}
              </div>
            </button>
          </div>

          {/* Swipe Information */}
          <div className="mt-8 text-center">
            <div className="text-sm bg-white/70 backdrop-blur-sm inline-block py-2 px-4 rounded-full shadow-sm text-purple-700">
              <div className="flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
                <span>Swipe card or use buttons to like/skip</span>
              </div>
            </div>
          </div>

          {/* Match counter */}
          <div className="mt-4 text-center">
            <div className="text-xs text-purple-500 inline-block py-1 px-3 rounded-full bg-purple-50 shadow-inner">
              {skippedProfiles.size + likedProfiles.size} profiles viewed today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
