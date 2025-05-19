import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Save, X, Music, Coffee, Brain, Heart, Instagram, ChevronDown, AlertCircle, MessageCircle, Quote, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface Profile {
  first_name: string;
  age: number;
  gender: string;
  city: string;
  state: string;
  occupation: string;
  phone_number: string;
  instagram_id: string | null;
  bio: string;
  tagline: string;
  looking_for: string[];
  chat_starter: string;
  mental_tags: string[];
  current_song: string;
  love_language: string;
  text_style: string;
  ick: string;
  green_flag: string;
}

const MENTAL_TAGS = [
  'Curious', 'Romantic', 'Dark Humour', 'Overthinker', 'Spiritual',
  'Calm', 'Nerdy', 'Mysterious', 'Observant', 'Playful'
];

const LOOKING_FOR = [
  'Honest conversations',
  'Digital penpal',
  'Long-term connection',
  'Just want to vibe',
  'Let\'s see where words take us'
];

const TEXT_VIBES = [
  'Deep talks',
  'Silly jokes',
  'Flirty banter',
  'Meme sharing',
  'Voice messages'
];

const LOVE_LANGUAGES = [
  'Words of Affirmation',
  'Quality Time',
  'Physical Touch',
  'Acts of Service',
  'Receiving Gifts',
  'Memes & GIFs'
];

const REQUIRED_FIELDS = [
  'first_name',
  'age',
  'gender',
  'city',
  'state',
  'occupation',
  'bio',
  'tagline',
  'love_language',
  'text_style'
];

const INSTAGRAM_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>([]);
  const [selectedMentalTags, setSelectedMentalTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const validateProfile = (data: Profile): Record<string, string> => {
    const errors: Record<string, string> = {};

    REQUIRED_FIELDS.forEach(field => {
      if (!data[field as keyof Profile]) {
        errors[field] = `${field.replace('_', ' ')} is required`;
      }
    });

    if (selectedLookingFor.length === 0) {
      errors.looking_for = 'Please select at least one option';
    }

    if (selectedMentalTags.length === 0) {
      errors.mental_tags = 'Please select at least one tag';
    }

    if (data.instagram_id && data.instagram_id !== profile?.instagram_id) {
      const handle = data.instagram_id.replace('https://instagram.com/', '');

      if (!INSTAGRAM_REGEX.test(handle)) {
        errors.instagram_id = 'Please enter a valid Instagram handle (letters, numbers, dots, and underscores only)';
      }
    }

    if (data.age && (data.age < 18 || data.age > 100)) {
      errors.age = 'Age must be between 18 and 100';
    }

    return errors;
  };

  const fetchProfileData = async () => {
    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingProfile) {
        const defaultProfile = {
          id: user?.id,
          first_name: '',
          age: 18,
          gender: '',
          city: '',
          state: '',
          occupation: '',
          phone_number: '',
          instagram_id: null,
          bio: '',
          tagline: '',
          looking_for: [],
          chat_starter: '',
          mental_tags: [],
          current_song: '',
          love_language: '',
          text_style: '',
          ick: '',
          green_flag: ''
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
        setEditedProfile(newProfile);
        setSelectedLookingFor(newProfile.looking_for || []);
        setSelectedMentalTags(newProfile.mental_tags || []);
        setEditing(true);
      } else {
        setProfile(existingProfile);
        setEditedProfile(existingProfile);
        setSelectedLookingFor(existingProfile.looking_for || []);
        setSelectedMentalTags(existingProfile.mental_tags || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'instagram_id') {
      const formattedValue = value.startsWith('@') ? value : `@${value}`;
      setEditedProfile(prev => prev ? {
        ...prev,
        [name]: formattedValue
      } : null);
    } else if (name === 'age') {
      const age = parseInt(value);
      setEditedProfile(prev => prev ? {
        ...prev,
        [name]: age
      } : null);
    } else {
      setEditedProfile(prev => prev ? {
        ...prev,
        [name]: value
      } : null);
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleLookingFor = (item: string) => {
    setSelectedLookingFor(prev => {
      const newSelection = prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item];

      if (newSelection.length > 0) {
        setErrors(prev => ({ ...prev, looking_for: '' }));
      }

      return newSelection;
    });
  };

  const toggleMentalTag = (tag: string) => {
    setSelectedMentalTags(prev => {
      const newSelection = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev;

      if (newSelection.length > 0) {
        setErrors(prev => ({ ...prev, mental_tags: '' }));
      }

      return newSelection;
    });
  };

  const handleSave = async () => {
    if (!editedProfile || !user?.id) return;

    const validationErrors = validateProfile(editedProfile);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      let formattedInstagramId = profile?.instagram_id;
      if (editedProfile.instagram_id !== profile?.instagram_id) {
        if (editedProfile.instagram_id) {
          const handle = editedProfile.instagram_id.startsWith('@')
            ? editedProfile.instagram_id.substring(1)
            : editedProfile.instagram_id;

          if (INSTAGRAM_REGEX.test(handle)) {
            formattedInstagramId = `https://instagram.com/${handle}`;
          }
        } else {
          formattedInstagramId = null;
        }
      }

      const updatedProfile = {
        ...editedProfile,
        looking_for: selectedLookingFor,
        mental_tags: selectedMentalTags,
        instagram_id: formattedInstagramId
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updatedProfile
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setEditedProfile(data);
      setEditing(false);
      setErrors({});
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to save profile. Please try again.'
      }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-purple-600 animate-pulse">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 px-4 py-8 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <div className="relative bg-gradient-to-r from-purple-600/10 to-pink-600/10 p-8 md:p-10">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
            <div className="relative flex justify-between items-start">
              <div>
                <h1 className="font-serif text-4xl md:text-5xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Dear Diary,
                </h1>
                <p className="text-purple-600/70 mt-2 italic font-light">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              {editing ? (
                <div className="flex gap-2 md:gap-3 flex-nowrap">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditedProfile(profile);
                      setSelectedLookingFor(profile?.looking_for || []);
                      setSelectedMentalTags(profile?.mental_tags || []);
                      setErrors({});
                    }}
                    className="flex items-center px-3 md:px-4 py-2 text-gray-600 hover:text-gray-700 transition-all duration-300 rounded-full bg-white/80 hover:bg-white shadow-md hover:shadow-lg whitespace-nowrap"
                    disabled={saving}
                  >
                    <X className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Cancel</span>
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={handleSave}
                      className={cn(
                        "flex items-center px-3 md:px-5 py-2 md:py-2.5 text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 whitespace-nowrap",
                        saving ? "opacity-75 cursor-not-allowed" : ""
                      )}
                      disabled={saving}
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent md:mr-2" />
                      ) : (
                        <Save className="w-4 h-4 md:mr-2" />
                      )}
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    {(Object.keys(errors).length > 0 || errors.submit) && (
                      <div className="px-3 py-2 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 animate-shake">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Please fill required fields</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center px-4 py-2 text-purple-600 hover:text-purple-700 transition-all duration-300 rounded-full border-2 border-purple-200 hover:border-purple-300 bg-white/50 hover:bg-white/80 backdrop-blur-sm transform hover:scale-105"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-10">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-28 h-28 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center transform hover:scale-105 transition-transform duration-300 shadow-xl">
                  <Heart className="w-14 h-14 text-white" />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="px-4 py-1 bg-purple-100 rounded-full text-purple-600 text-sm font-medium">
                    {profile?.age} • {profile?.gender}
                  </div>
                </div>
              </div>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="first_name"
                      value={editedProfile?.first_name || ''}
                      onChange={handleProfileChange}
                      className="text-3xl font-serif text-center w-full bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                      placeholder="Your name"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                    )}
                  </div>
                  <div className="flex justify-center gap-4">
                    <div>
                      <input
                        type="number"
                        name="age"
                        value={editedProfile?.age || ''}
                        onChange={handleProfileChange}
                        className="w-20 text-center bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="Age"
                        min="18"
                        max="100"
                      />
                      {errors.age && (
                        <p className="text-red-500 text-sm mt-1">{errors.age}</p>
                      )}
                    </div>
                    <div>
                      <select
                        name="gender"
                        value={editedProfile?.gender || ''}
                        onChange={handleProfileChange}
                        className="w-32 text-center bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="">Gender...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.gender && (
                        <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div>
                      <input
                        type="text"
                        name="city"
                        value={editedProfile?.city || ''}
                        onChange={handleProfileChange}
                        className="w-32 text-center bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="City"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="state"
                        value={editedProfile?.state || ''}
                        onChange={handleProfileChange}
                        className="w-24 text-center bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="State"
                      />
                      {errors.state && (
                        <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div>
                      <input
                        type="text"
                        name="occupation"
                        value={editedProfile?.occupation || ''}
                        onChange={handleProfileChange}
                        className="w-48 text-center bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="Occupation"
                      />
                      {errors.occupation && (
                        <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="phone_number"
                        value={editedProfile?.phone_number || ''}
                        onChange={handleProfileChange}
                        className="w-48 text-center bg-transparent border-b-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="Phone Number"
                      />
                      {errors.phone_number && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-serif text-gray-900">{profile?.first_name}</h2>
                  <p className="text-purple-600">{profile?.city}, {profile?.state}</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Tagline</h3>
                  </div>
                  {editing ? (
                    <input
                      type="text"
                      name="tagline"
                      value={editedProfile?.tagline || ''}
                      onChange={handleProfileChange}
                      className="w-full p-3 md:p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none font-serif transition-all duration-300"
                      placeholder="A short, catchy line about you..."
                    />
                  ) : (
                    <p className="font-serif text-xl text-purple-600 italic">
                      "{profile?.tagline}"
                    </p>
                  )}
                </div>


                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-2 text-purple-600">
                      <Music className="w-5 h-5" />
                      <h3 className="font-medium">Currently Feeling Like...</h3>
                    </div>
                    {editing ? (
                      <input
                        type="text"
                        name="current_song"
                        value={editedProfile?.current_song || ''}
                        onChange={handleProfileChange}
                        className="w-full p-3 md:p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300"
                        placeholder="Share a song lyric or quote..."
                      />
                    ) : (
                      <p className="font-serif text-gray-700 italic">
                        "{profile?.current_song || "Not specified"}"
                      </p>
                    )}
                  </div>
                  <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                    <div className="flex items-center gap-2 text-purple-600">
                      <MessageCircle className="w-5 h-5" />
                      <h3 className="font-medium">Text Style</h3>
                    </div>
                    {editing ? (
                      <select
                        name="text_style"
                        value={editedProfile?.text_style || ''}
                        onChange={handleProfileChange}
                        className="w-full p-3 md:p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300"
                      >
                        <option value="">Choose your text style...</option>
                        {TEXT_VIBES.map((style) => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-serif text-gray-700">
                        {profile?.text_style || "Not specified"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Mental Aesthetic</h3>
                  </div>
                  {editing ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {MENTAL_TAGS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleMentalTag(tag)}
                            className={`px-4 py-2.5 rounded-full transition-all duration-300 hover:scale-105 ${
                              selectedMentalTags.includes(tag)
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      {errors.mental_tags && (
                        <p className="text-red-500 text-sm mt-2">{errors.mental_tags}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile?.mental_tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-4 py-2 bg-purple-50 text-purple-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Heart className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">What I'm Here For</h3>
                  </div>
                  {editing ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {LOOKING_FOR.map((item) => (
                          <button
                            key={item}
                            onClick={() => toggleLookingFor(item)}
                            className={`px-4 py-2.5 rounded-full transition-all duration-300 hover:scale-105 ${
                              selectedLookingFor.includes(item)
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      {errors.looking_for && (
                        <p className="text-red-500 text-sm mt-2">{errors.looking_for}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile?.looking_for?.map((item) => (
                        <span
                          key={item}
                          className="px-4 py-2 bg-purple-50 text-purple-600 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-gradient-to-br from-green-50 to-lime-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-2 text-green-600">
                  <Heart className="w-5 h-5" />
                  <h3 className="font-medium">Green Flag</h3>
                </div>
                {editing ? (
                  <input
                    type="text"
                    name="green_flag"
                    value={editedProfile?.green_flag || ''}
                    onChange={handleProfileChange}
                    className="w-full p-3 md:p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300"
                    placeholder="What instantly wins you over?"
                  />
                ) : (
                  <p className="font-serif text-gray-700">
                    {profile?.green_flag || "Not specified"}
                  </p>
                )}
              </div>
              <div className="space-y-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-2 text-red-600">
                  <X className="w-5 h-5" />
                  <h3 className="font-medium">Biggest Ick</h3>
                </div>
                {editing ? (
                  <input
                    type="text"
                    name="ick"
                    value={editedProfile?.ick || ''}
                    onChange={handleProfileChange}
                    className="w-full p-3 md:p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300"
                    placeholder="What's an instant turn-off?"
                  />
                ) : (
                  <p className="font-serif text-gray-700">
                    {profile?.ick || "Not specified"}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Quote className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">About Me</h3>
              </div>
              {editing ? (
                <textarea
                  name="bio"
                  value={editedProfile?.bio || ''}
                  onChange={handleProfileChange}
                  className="w-full p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300"
                  rows={3}
                  maxLength={160}
                  placeholder="Tell us about yourself (max 160 characters)"
                />
              ) : (
                <p className="text-gray-700 font-serif">
                  {profile?.bio || "Not specified"}
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Coffee className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">Chat Starter</h3>
              </div>
              {editing ? (
                <input
                  type="text"
                  name="chat_starter"
                  value={editedProfile?.chat_starter || ''}
                  onChange={handleProfileChange}
                  className="w-full p-4 bg-white/50 rounded-xl border-2 border-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300"
                  placeholder="Give others an icebreaker..."
                />
              ) : (
                <p className="text-gray-700 font-serif">
                  {profile?.chat_starter || "Not specified"}
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Instagram className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">Instagram</h3>
              </div>
              {editing ? (
                <div>
                  <input
                    type="text"
                    name="instagram_id"
                    value={editedProfile?.instagram_id ? editedProfile.instagram_id.replace('https://instagram.com/', '') : profile?.instagram_id ? profile.instagram_id.replace('https://instagram.com/', '') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace('@', ''); // Remove @ if user types it
                      setEditedProfile(prev => prev ? {
                        ...prev,
                        instagram_id: value
                      } : null);

                      if (errors.instagram_id) {
                        setErrors(prev => ({ ...prev, instagram_id: '' }));
                      }
                    }}
                    className={`w-full p-3 md:p-4 bg-white/50 rounded-xl border-2 ${
                      errors.instagram_id
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-purple-100 focus:border-purple-500'
                    } focus:ring-2 focus:ring-purple-200 focus:outline-none text-sm md:text-base transition-all duration-300 backdrop-blur-sm`}
                    placeholder="yourusername"
                  />
                  {errors.instagram_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.instagram_id}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-2">
                    This will be shared with your matches when you both agree to reveal profiles
                  </p>
                </div>
              ) : profile?.instagram_id ? (
                <a
                  href={profile.instagram_id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all duration-300 group w-fit"
                >
                  <Instagram className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-purple-600 font-medium">
                    @{profile.instagram_id.replace('https://instagram.com/', '')}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl text-gray-500 italic w-fit">
                  <Instagram className="w-5 h-5 text-gray-400" />
                  <span>Not connected</span>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
