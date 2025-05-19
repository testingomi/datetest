import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import PaymentVerification from '../Onboarding/PaymentVerification';
import { ChevronRight, ChevronLeft, Loader2, Brain, Heart, Music, Coffee, Instagram, AlertCircle, MessageCircle, Quote, Sparkles } from 'lucide-react';

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

// Only allow alphanumeric characters, dots, and underscores
const INSTAGRAM_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

export default function OnboardingForm() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedMentalTags, setSelectedMentalTags] = useState<string[]>([]);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('onboardingFormData');
    return saved ? JSON.parse(saved) : {
      firstName: '',
      age: '',
      gender: '',
      city: '',
      state: '',
      occupation: '',
      mobileNumber: '',
      instagramId: '',
      bio: '',
      tagline: '',
      chatStarter: '',
      currentSong: '',
      loveLanguage: '',
      textStyle: '',
      ick: '',
      greenFlag: ''
    };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('onboardingFormData', JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'instagramId') {
      // Remove @ and spaces if user types them
      const handle = value.startsWith('@') ? value.substring(1) : value;
      const cleanHandle = handle.replace(/\s+/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: cleanHandle
      }));
    } else if (name === 'age') {
      const age = parseInt(value);
      setFormData(prev => ({
        ...prev,
        [name]: age || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleMentalTag = (tag: string) => {
    setSelectedMentalTags(prev => {
      const newSelection = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev;

      // Clear error immediately if there are selections
      if (newSelection.length > 0) {
        setErrors(prevErrors => {
          const { mental_tags, ...rest } = prevErrors;
          return rest;
        });
      }

      return newSelection;
    });
  };

  const toggleLookingFor = (item: string) => {
    setSelectedLookingFor(prev => {
      const newSelection = prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item];

      // Clear error immediately if there are selections
      if (newSelection.length > 0) {
        setErrors(prevErrors => {
          const { looking_for, ...rest } = prevErrors;
          return rest;
        });
      }

      return newSelection;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Mobile number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid mobile number';
    }

    // Basic info validation - all fields required
    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.age || formData.age < 18) errors.age = 'Age must be 18 or older';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.state) errors.state = 'State is required';
    if (!formData.occupation) errors.occupation = 'Occupation is required';
    if (!formData.bio) errors.bio = 'Bio is required';
    if (!formData.tagline) errors.tagline = 'Tagline is required';
    if (!formData.loveLanguage) errors.loveLanguage = 'Love language is required';
    if (!formData.textStyle) errors.textStyle = 'Text style is required';
    if (!formData.chatStarter) errors.chatStarter = 'Chat starter is required';
    if (!formData.currentSong) errors.currentSong = 'Current song is required';
    if (!formData.ick) errors.ick = 'Ick is required';
    if (!formData.greenFlag) errors.greenFlag = 'Green flag is required';
    if (!formData.instagramId) errors.instagramId = 'Instagram ID is required';

    // Instagram validation
    if (formData.instagramId) {
      if (!INSTAGRAM_REGEX.test(formData.instagramId)) {
        errors.instagramId = 'Please enter a valid Instagram handle (letters, numbers, dots, and underscores only)';
      }
    }

    // Tags validation
    if (selectedMentalTags.length === 0) {
      errors.mental_tags = 'Please select at least one mental tag';
    }
    if (selectedLookingFor.length === 0) {
      errors.looking_for = 'Please select at least one option';
    }

    return errors;
  };

  const [showPayment, setShowPayment] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        throw new Error('Please fill in all required fields');
      }

      // Format Instagram ID as a full URL if provided
      let instagramUrl = null;
      if (formData.instagramId && INSTAGRAM_REGEX.test(formData.instagramId)) {
        instagramUrl = `https://instagram.com/${formData.instagramId}`;
      }

      // Insert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          age: parseInt(formData.age.toString()),
          gender: formData.gender,
          city: formData.city,
          state: formData.state,
          occupation: formData.occupation,
          phone_number: formData.mobileNumber,
          instagram_id: instagramUrl,
          bio: formData.bio,
          tagline: formData.tagline,
          looking_for: selectedLookingFor,
          chat_starter: formData.chatStarter || null,
          mental_tags: selectedMentalTags,
          current_song: formData.currentSong || null,
          love_language: formData.loveLanguage,
          text_style: formData.textStyle,
          ick: formData.ick || null,
          green_flag: formData.greenFlag || null,
          is_active: false
        });

      if (profileError) {
        console.error('Profile Error:', profileError);
        throw new Error('Failed to save profile data');
      }

      // Create default chat preferences
      const { error: prefsError } = await supabase
        .from('chat_preferences')
        .upsert({
          user_id: user.id,
          min_age: 18,
          max_age: 100,
          show_me: [],
          preferred_gender: null,
          preferred_city: null
        });

      if (prefsError) {
        console.error('Preferences Error:', prefsError);
        throw new Error('Failed to save chat preferences');
      }

      console.log('Profile saved successfully');
      setShowPayment(true);
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to save profile. Please try again.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.firstName && formData.age && formData.gender && formData.city && formData.state;
      case 2:
        return formData.occupation && formData.bio && formData.tagline;
      case 3:
        return selectedLookingFor.length > 0 && selectedMentalTags.length > 0;
      case 4:
        return formData.loveLanguage && formData.textStyle;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your age"
                min="18"
                max="100"
              />
              {errors.age && (
                <p className="text-red-500 text-sm mt-1">{errors.age}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select your gender...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your city"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your state"
              />
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number (The other user can't see your number, only Flintxt)
              </label>
              <input
                type="tel"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="1234567890"
              />
              {errors.mobileNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.mobileNumber}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What do you do?
              </label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your occupation"
              />
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagline
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="A short, catchy line about you..."
              />
              {errors.tagline && (
                <p className="text-red-500 text-sm mt-1">{errors.tagline}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                maxLength={160}
                placeholder="Tell us about yourself (max 160 characters)"
              />
              {errors.bio && (
                <p className="text-red-500 text-sm mt-1">{errors.bio}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram (Providing your genuine Instagram ID is required)
              </label>
              <input
                type="text"
                name="instagramId"
                value={formData.instagramId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="yourusername"
              />
              {errors.instagramId && (
                <p className="text-red-500 text-sm mt-1">{errors.instagramId}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <Heart className="w-5 h-5" />
                <h3 className="font-medium">What I'm Here For</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleLookingFor(item)}
                    type="button"
                    className={`px-4 py-2 rounded-full transition-all ${
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

            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <Brain className="w-5 h-5" />
                <h3 className="font-medium">Mental Aesthetic (Choose up to 3)</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {MENTAL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleMentalTag(tag)}
                    type="button"
                    className={`px-4 py-2 rounded-full transition-all ${
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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <Heart className="w-5 h-5" />
                <h3 className="font-medium">Love Language</h3>
              </div>
              <select
                name="loveLanguage"
                value={formData.loveLanguage}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose your love language...</option>
                {LOVE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              {errors.loveLanguage && (
                <p className="text-red-500 text-sm mt-1">{errors.loveLanguage}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-medium">Text Style</h3>
              </div>
              <select
                name="textStyle"
                value={formData.textStyle}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose your text style...</option>
                {TEXT_VIBES.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
              {errors.textStyle && (
                <p className="text-red-500 text-sm mt-1">{errors.textStyle}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <Coffee className="w-5 h-5" />
                <h3 className="font-medium">Chat Starter </h3>
              </div>
              <input
                type="text"
                name="chatStarter"
                value={formData.chatStarter}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Give others an icebreaker..."
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <Music className="w-5 h-5" />
                <h3 className="font-medium">Currently Playing </h3>
              </div>
              <input
                type="text"
                name="currentSong"
                value={formData.currentSong}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Share a song lyric or quote..."
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Heart className="w-5 h-5" />
                <h3 className="font-medium">Green Flag </h3>
              </div>
              <input
                type="text"
                name="greenFlag"
                value={formData.greenFlag}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="What instantly wins you over?"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-medium">Biggest Ick </h3>
              </div>
              <input
                type="text"
                name="ick"
                value={formData.ick}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="What's an instant turn-off?"
              />
            </div>
          </div>
        );
    }
  };

  if (showPayment && user?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <PaymentVerification 
                userId={user.id} 
                onComplete={() => {
                  setShowPayment(false);
                  navigate('/swipe');
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="h-2 bg-purple-100 rounded-full">
                <div
                  className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Step {step} of 4
              </div>
            </div>

            {/* Form content */}
            {renderStep()}

            {/* Error Message */}
            {Object.keys(errors).length > 0 && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Please fix the following fields:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {Object.entries(errors).map(([field, message]) => {
                    if (field === 'submit') return null;
                    // Convert field names to readable format
                    const fieldName = field
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    return (
                      <li key={field} className="flex items-start gap-2">
                        <span className="font-medium">{fieldName}:</span>
                        <span>{message}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {errors.submit && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center text-purple-600 hover:text-purple-700"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </button>
              )}
              <div className="ml-auto">
                {step < 4 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={!isStepValid()}
                    className="flex items-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !isStepValid()}
                    className="flex items-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      'Complete Profile'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
