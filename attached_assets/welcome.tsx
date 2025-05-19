"use client"

import { useState, useEffect, useRef } from "react"
import {
  Heart,
  Sparkles,
  MessageCircle,
  Users,
  Coffee,
  CheckCircle,
  Shield,
  Clock,
  ArrowRight,
  Send,
  Star,
  Zap,
  Smile,
  Bookmark,
  ChevronRight,
  Menu,
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// Mock functions to simulate the original component's behavior
const useAuthStore = () => {
  const [user, setUser] = useState(null)
  return { user }
}

const supabase = {
  from: (table) => ({
    select: (fields) => ({
      eq: (field, value) => ({
        maybeSingle: async () => null,
      }),
    }),
  }),
}

export default function Welcome() {
  const navigate = (path) => {
    console.log(`Navigating to: ${path}`)
    // In Next.js, you would use router.push(path)
  }

  const { user } = useAuthStore()
  const isMobile = useMobile()
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "them",
      text: "Hey there! I noticed you're into classic literature too. Who's your favorite author?",
      time: "2:34 PM",
    },
    {
      sender: "me",
      text: "Jane Austen for sure! I love how she captures the subtleties of human relationships. You?",
      time: "2:36 PM",
    },
    {
      sender: "them",
      text: "Oh, I'm a huge Dostoevsky fan! But I've been meaning to read more Austen. Any recommendations on where to start?",
      time: "2:38 PM",
    },
  ])

  const [typedMessage, setTypedMessage] = useState("")
  const [scrollPosition, setScrollPosition] = useState(0)
  const [activeSection, setActiveSection] = useState("hero")
  const [theme, setTheme] = useState("light")

  const chatEndRef = useRef(null)
  const heroRef = useRef(null)
  const statsRef = useRef(null)
  const featuresRef = useRef(null)
  const howItWorksRef = useRef(null)
  const testimonialRef = useRef(null)
  const ctaRef = useRef(null)

  // Sections for mobile navigation
  const sections = [
    { id: "hero", label: "Home", icon: Heart },
    { id: "how-it-works", label: "How It Works", icon: Coffee },
    { id: "features", label: "Features", icon: Zap },
    { id: "testimonials", label: "Testimonials", icon: Star },
    { id: "cta", label: "Get Started", icon: ArrowRight },
  ]

  useEffect(() => {
    if (user) {
      // Check if profile exists and is complete before redirecting
      const checkProfile = async () => {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

        if (!profile || !profile.first_name || !profile.gender) {
          navigate("/onboarding")
        } else {
          navigate("/swipe")
        }
      }

      checkProfile()
    }
  }, [user])

  useEffect(() => {
    // Simulate typing animation for the last message
    let typingTimeout
    if (!isTyping) {
      setIsTyping(true)
      const finalMessage =
        "Pride and Prejudice is the classic starting point, but I personally love Persuasion. It's more mature and heartfelt."
      let i = 0

      const typeWriter = () => {
        if (i < finalMessage.length) {
          setTypedMessage(finalMessage.substring(0, i + 1))
          i++
          typingTimeout = setTimeout(typeWriter, Math.random() * 50 + 20)
        } else {
          setTimeout(() => {
            setChatMessages([
              ...chatMessages,
              {
                sender: "me",
                text: finalMessage,
                time: "Just now",
              },
            ])
            setTypedMessage("")
            setIsTyping(false)

            // After a delay, restart the typing animation
            setTimeout(() => {
              setIsTyping(true)
              setChatMessages(chatMessages.slice(1))
              setTypedMessage("")
              i = 0
              typeWriter()
            }, 5000)
          }, 1000)
        }
      }

      typeWriter()
    }

    return () => clearTimeout(typingTimeout)
  }, [isTyping, chatMessages])

  useEffect(() => {
    // Scroll to the bottom of the chat when messages change
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, typedMessage])

  // Track scroll position and active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setScrollPosition(scrollY)

      // Determine active section based on scroll position
      const sectionElements = {
        hero: document.getElementById("hero")?.offsetTop || 0,
        "how-it-works": document.getElementById("how-it-works")?.offsetTop || 0,
        features: document.getElementById("features")?.offsetTop || 0,
        testimonials: document.getElementById("testimonials")?.offsetTop || 0,
        cta: document.getElementById("cta")?.offsetTop || 0,
      }

      const currentPosition = scrollY + window.innerHeight / 3

      if (currentPosition < sectionElements["how-it-works"]) {
        setActiveSection("hero")
      } else if (currentPosition < sectionElements.features) {
        setActiveSection("how-it-works")
      } else if (currentPosition < sectionElements.testimonials) {
        setActiveSection("features")
      } else if (currentPosition < sectionElements.cta) {
        setActiveSection("testimonials")
      } else {
        setActiveSection("cta")
      }

      // Parallax effects
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${scrollY * 0.05}px)`
      }

      if (statsRef.current) {
        statsRef.current.style.transform = `translateY(${scrollY * 0.03}px)`
      }

      if (featuresRef.current) {
        featuresRef.current.style.transform = `translateY(${scrollY * 0.02}px)`
      }

      if (howItWorksRef.current) {
        howItWorksRef.current.style.transform = `translateY(${scrollY * 0.01}px)`
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Theme toggle
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80, // Account for header height
        behavior: "smooth",
      })
    }
  }

  // Testimonials data
  const testimonials = [
    {
      text: "Finally found someone who appreciates my dad jokes! We've been talking for weeks!",
      name: "Shruti, 22",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      text: "I love that my personality shines through before my appearance. Made such genuine connections!",
      name: "Ayush, 24",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      text: "My match and I started as friends and now we're planning our first date. Thank you flintxt!",
      name: "Riya, 20",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      text: "The text-first approach helped me overcome my shyness. Now I'm dating someone amazing!",
      name: "Vikram, 25",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
  ]

  // Stats data
  const stats = [
    { value: "94%", label: "Meaningful Matches", icon: Heart },
    { value: "100%", label: "Active Users", icon: Users },
    { value: "82%", label: "Response Rate", icon: MessageCircle },
  ]

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${theme === "dark" ? "from-gray-900 via-violet-950 to-gray-900" : "from-violet-50 via-rose-50 to-violet-50"} overflow-x-hidden transition-colors duration-500`}
    >
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -top-20 -left-20 w-72 h-72 ${theme === "dark" ? "bg-violet-800" : "bg-violet-200"} rounded-full blur-3xl opacity-30 animate-[pulse_15s_ease-in-out_infinite]`}
        ></div>
        <div
          className={`absolute top-1/4 -right-32 w-96 h-96 ${theme === "dark" ? "bg-rose-800" : "bg-rose-200"} rounded-full blur-3xl opacity-30 animate-[pulse_20s_ease-in-out_infinite_2s]`}
        ></div>
        <div
          className={`absolute bottom-1/4 -left-32 w-96 h-96 ${theme === "dark" ? "bg-violet-800" : "bg-violet-200"} rounded-full blur-3xl opacity-30 animate-[pulse_18s_ease-in-out_infinite_1s]`}
        ></div>
        <div
          className={`absolute -bottom-20 right-1/3 w-72 h-72 ${theme === "dark" ? "bg-rose-800" : "bg-rose-200"} rounded-full blur-3xl opacity-30 animate-[pulse_12s_ease-in-out_infinite_0.5s]`}
        ></div>
      </div>

      {/* Animated particles */}
      <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${theme === "dark" ? "bg-white/30" : "bg-white/70"} animate-float-particle`}
            style={{
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 20 + 10}s`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 backdrop-blur-xl ${theme === "dark" ? "bg-gray-900/70 border-gray-800/50" : "bg-white/70 border-violet-100/50"} border-b transition-colors duration-500`}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="transform hover:scale-110 transition-transform duration-300 relative">
              <div
                className={`absolute inset-0 ${theme === "dark" ? "bg-rose-500" : "bg-violet-500"} rounded-full blur-md animate-pulse opacity-70`}
              ></div>
              <Heart className="w-8 h-8 text-white relative z-10" />
            </div>
            <h1
              className={`text-2xl font-bold bg-gradient-to-r ${theme === "dark" ? "from-violet-400 to-rose-400" : "from-violet-600 to-rose-500"} bg-clip-text text-transparent`}
            >
              flintxt
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {sections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                className={`text-sm ${activeSection === section.id ? (theme === "dark" ? "text-white bg-gray-800" : "text-violet-600 bg-violet-50") : theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-violet-600"} transition-colors`}
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </Button>
            ))}

            <div className="ml-2 border-l border-gray-300 dark:border-gray-700 h-6"></div>

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="ml-2">
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-300" />
              ) : (
                <Moon className="h-5 w-5 text-violet-600" />
              )}
            </Button>

            <Button
              className={`${theme === "dark" ? "bg-gradient-to-r from-violet-500 to-rose-400" : "bg-gradient-to-r from-violet-600 to-rose-500"} text-white hover:opacity-90 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40`}
            >
              Join Now
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-300" />
              ) : (
                <Moon className="h-5 w-5 text-violet-600" />
              )}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className={`h-6 w-6 ${theme === "dark" ? "text-white" : "text-gray-700"}`} />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className={`${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"} backdrop-blur-xl`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center mb-8">
                    <div className="relative mr-3">
                      <div
                        className={`absolute inset-0 ${theme === "dark" ? "bg-rose-500" : "bg-violet-500"} rounded-full blur-md animate-pulse opacity-70`}
                      ></div>
                      <Heart className="w-6 h-6 text-white relative z-10" />
                    </div>
                    <h2
                      className={`text-xl font-bold bg-gradient-to-r ${theme === "dark" ? "from-violet-400 to-rose-400" : "from-violet-600 to-rose-500"} bg-clip-text text-transparent`}
                    >
                      flintxt
                    </h2>
                  </div>

                  <div className="space-y-4 flex-1">
                    {sections.map((section) => (
                      <Button
                        key={section.id}
                        variant="ghost"
                        className={`w-full justify-start ${activeSection === section.id ? (theme === "dark" ? "bg-gray-800 text-white" : "bg-violet-50 text-violet-600") : ""}`}
                        onClick={() => {
                          scrollToSection(section.id)
                          document.querySelector("[data-radix-collection-item]")?.click() // Close sheet
                        }}
                      >
                        <section.icon className="mr-2 h-5 w-5" />
                        {section.label}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
                    <Button
                      className={`w-full ${theme === "dark" ? "bg-gradient-to-r from-violet-500 to-rose-400" : "bg-gradient-to-r from-violet-600 to-rose-500"} text-white hover:opacity-90 transition-all shadow-lg`}
                    >
                      Join Now
                    </Button>
                    <Button
                      variant="outline"
                      className={`w-full mt-2 ${theme === "dark" ? "border-gray-700 text-white hover:bg-gray-800" : "border-violet-200 text-violet-600 hover:bg-violet-50"}`}
                    >
                      Sign In
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${theme === "dark" ? "bg-gray-900/90 border-t border-gray-800" : "bg-white/90 border-t border-violet-100"} backdrop-blur-xl py-2 px-4 transition-colors duration-500`}
      >
        <div className="flex justify-between items-center">
          {sections.slice(0, 5).map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center p-2 ${activeSection === section.id ? (theme === "dark" ? "text-white" : "text-violet-600") : theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
              onClick={() => scrollToSection(section.id)}
            >
              <section.icon className="h-5 w-5 mb-1" />
              <span className="text-xs">{section.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div ref={heroRef} className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left animate-fadeIn">
              <Badge
                className={`mb-4 ${theme === "dark" ? "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-300" : "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-800"} hover:from-violet-500/30 hover:to-rose-500/30 transition-colors border-0 shadow-sm`}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" /> New Way to Connect
              </Badge>
              <h2
                className={`text-4xl sm:text-5xl lg:text-6xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} leading-tight transition-colors duration-500`}
              >
                Where Friendship
                <span className="relative inline-block px-2 mx-1">
                  <span
                    className={`relative z-10 bg-gradient-to-r ${theme === "dark" ? "from-violet-400 to-rose-400" : "from-violet-600 to-rose-500"} bg-clip-text text-transparent`}
                  >
                    Meets
                  </span>
                  <div
                    className={`absolute bottom-1 left-0 w-full h-3 ${theme === "dark" ? "bg-violet-800/50" : "bg-violet-200"} -rotate-1 transition-transform duration-300`}
                  ></div>
                </span>
                <span className="relative inline-block px-2">
                  <span
                    className={`relative z-10 bg-gradient-to-r ${theme === "dark" ? "from-violet-400 to-rose-400" : "from-violet-600 to-rose-500"} bg-clip-text text-transparent`}
                  >
                    Romance
                  </span>
                  <div
                    className={`absolute bottom-1 left-0 w-full h-3 ${theme === "dark" ? "bg-rose-800/50" : "bg-rose-200"} rotate-1 transition-transform duration-300`}
                  ></div>
                </span>
              </h2>
              <p
                className={`text-lg sm:text-xl ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-6 max-w-xl mx-auto lg:mx-0 transition-colors duration-500`}
              >
                Make genuine connections based on personality, not just pictures. Find friends or maybe something more
                through meaningful text-based conversations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-8 animate-fadeIn">
                <Button
                  size="lg"
                  className={`group relative px-8 py-6 ${theme === "dark" ? "bg-gradient-to-r from-violet-500 to-rose-400" : "bg-gradient-to-r from-violet-600 to-rose-500"} text-white rounded-full font-medium overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
                >
                  <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <Sparkles className="w-5 h-5 mr-2 animate-pulse relative z-10" />
                  <span className="relative z-10">Join Now</span>
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform relative z-10" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className={`px-8 py-6 ${theme === "dark" ? "text-white border-2 border-gray-700 hover:bg-gray-800" : "text-violet-600 border-2 border-violet-200 hover:bg-violet-50"} rounded-full font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl`}
                >
                  Sign In
                </Button>
              </div>

              {/* App Stats */}
              <div ref={statsRef} className="flex flex-wrap justify-center lg:justify-start gap-8 mt-10">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="animate-fadeIn relative group"
                    style={{ animationDelay: `${0.8 + index * 0.2}s` }}
                  >
                    <div
                      className={`absolute inset-0 ${theme === "dark" ? "bg-gradient-to-r from-violet-500/10 to-rose-500/10" : "bg-gradient-to-r from-violet-500/10 to-rose-500/10"} rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    ></div>
                    <div
                      className={`relative ${theme === "dark" ? "bg-gray-800/30" : "bg-white/30"} backdrop-blur-sm p-4 rounded-lg shadow-sm ${theme === "dark" ? "border border-gray-700/50" : "border border-white/50"} transform group-hover:scale-105 transition-transform duration-300`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <stat.icon
                          className={`w-5 h-5 ${theme === "dark" ? "text-violet-400" : "text-violet-600"} mr-2`}
                        />
                      </div>
                      <p
                        className={`text-3xl font-bold bg-gradient-to-r ${theme === "dark" ? "from-violet-400 to-rose-400" : "from-violet-600 to-rose-500"} bg-clip-text text-transparent`}
                      >
                        {stat.value}
                      </p>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Illustration - Interactive Chat Demo */}
            <div className="relative animate-slideUp mt-8 lg:mt-0">
              <div className="relative mx-auto w-full max-w-md">
                <div
                  className={`absolute inset-0 ${theme === "dark" ? "bg-gradient-to-r from-violet-600/20 to-rose-500/20" : "bg-gradient-to-r from-violet-600/20 to-rose-500/20"} rounded-2xl blur-2xl transform -rotate-6`}
                ></div>
                <Card
                  className={`relative ${theme === "dark" ? "bg-gray-900 border-gray-800" : "border-violet-100"} overflow-hidden shadow-2xl`}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-rose-500"></div>

                  <CardContent className="p-6">
                    {/* Chat Header */}
                    <div
                      className={`flex items-center justify-between mb-4 pb-2 ${theme === "dark" ? "border-b border-gray-800" : "border-b border-gray-100"}`}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-rose-400 flex items-center justify-center text-white font-bold">
                          A
                        </div>
                        <div className="ml-3">
                          <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Alex</p>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                              Online now
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Bookmark className={`h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                          <span className="sr-only">Save</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Smile className={`h-4 w-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                          <span className="sr-only">Emoji</span>
                        </Button>
                      </div>
                    </div>

                    {/* Mock Chat UI */}
                    <div className="flex flex-col gap-4 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-violet-200 dark:scrollbar-thumb-violet-800 scrollbar-track-transparent pr-2">
                      {chatMessages.map((message, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "max-w-[80%]",
                            message.sender === "me"
                              ? "self-end bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-2xl rounded-tr-none p-4"
                              : `self-start ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"} ${theme === "dark" ? "text-white" : "text-gray-800"} rounded-2xl rounded-tl-none p-4`,
                          )}
                        >
                          <p
                            className={
                              message.sender === "me"
                                ? "text-white"
                                : theme === "dark"
                                  ? "text-gray-200"
                                  : "text-gray-800"
                            }
                          >
                            {message.text}
                          </p>
                          <p
                            className={
                              message.sender === "me"
                                ? "text-xs text-white/80 mt-1"
                                : `text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"} mt-1 text-right`
                            }
                          >
                            {message.time}
                          </p>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="self-end max-w-[80%] bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-2xl rounded-tr-none p-4">
                          <p className="text-white">{typedMessage}</p>
                          <div className="flex mt-1 h-4 items-end">
                            <div className="typing-indicator">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Type your message..."
                        className={`w-full ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-gray-100 border-none text-gray-700"} rounded-full py-3 px-4 focus:ring-2 focus:ring-violet-500`}
                      />
                      <Button
                        size="icon"
                        className="bg-gradient-to-r from-violet-600 to-rose-500 text-white p-3 rounded-full hover:opacity-90 transition-colors shadow-md hover:shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                        <span className="sr-only">Send message</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 bg-rose-100 dark:bg-rose-900/50 p-4 rounded-2xl shadow-lg transform rotate-6 animate-float">
                <Heart className={`w-8 h-8 ${theme === "dark" ? "text-rose-400" : "text-rose-500"}`} />
              </div>
              <div
                className="absolute -bottom-4 -left-4 bg-violet-100 dark:bg-violet-900/50 p-4 rounded-2xl shadow-lg transform -rotate-12 animate-float"
                style={{ animationDelay: "1s" }}
              >
                <MessageCircle className={`w-8 h-8 ${theme === "dark" ? "text-violet-400" : "text-violet-500"}`} />
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20">
                <div
                  className={`absolute inset-0 ${theme === "dark" ? "bg-rose-700" : "bg-rose-300"} rounded-full blur-2xl opacity-20 animate-pulse`}
                ></div>
              </div>
              <div className="absolute -bottom-10 right-0 w-32 h-32">
                <div
                  className={`absolute inset-0 ${theme === "dark" ? "bg-violet-700" : "bg-violet-300"} rounded-full blur-2xl opacity-20 animate-pulse`}
                  style={{ animationDelay: "1.5s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative shapes */}
        <div
          className={`absolute top-1/4 right-0 w-64 h-64 ${theme === "dark" ? "bg-gradient-to-br from-violet-800/10 to-transparent" : "bg-gradient-to-br from-violet-500/10 to-transparent"} rounded-full blur-2xl`}
        ></div>
        <div
          className={`absolute bottom-1/4 left-0 w-64 h-64 ${theme === "dark" ? "bg-gradient-to-br from-rose-800/10 to-transparent" : "bg-gradient-to-br from-rose-500/10 to-transparent"} rounded-full blur-2xl`}
        ></div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div ref={howItWorksRef} className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge
              className={`mb-4 ${theme === "dark" ? "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-300" : "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-800"} hover:from-violet-500/30 hover:to-rose-500/30 transition-colors border-0 shadow-sm`}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Simple Process
            </Badge>
            <h2
              className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} transition-colors duration-500`}
            >
              How Flintxt Works
            </h2>
            <p
              className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-4 max-w-xl mx-auto transition-colors duration-500`}
            >
              Our unique text-first approach helps you make meaningful connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection lines between steps (desktop only) */}
            {!isMobile && (
              <div
                className={`absolute top-1/2 left-0 w-full h-0.5 ${theme === "dark" ? "bg-gradient-to-r from-violet-800 via-rose-800 to-violet-800" : "bg-gradient-to-r from-violet-200 via-rose-200 to-violet-200"} -z-10 hidden md:block`}
              ></div>
            )}

            {[
              {
                step: 1,
                title: "Create Your Profile",
                description: "Answer thoughtful questions about your personality, interests, and communication style.",
                icon: Users,
                color: theme === "dark" ? "from-violet-500 to-indigo-500" : "from-violet-600 to-indigo-600",
              },
              {
                step: 2,
                title: "Connect Through Text",
                description: "Exchange messages with potential matches based on compatibility, not just appearances.",
                icon: MessageCircle,
                color: theme === "dark" ? "from-rose-400 to-pink-500" : "from-rose-500 to-pink-600",
              },
              {
                step: 3,
                title: "Reveal When Ready",
                description: "Only share social profiles when you've established a meaningful connection.",
                icon: Heart,
                color: theme === "dark" ? "from-amber-400 to-orange-500" : "from-amber-500 to-orange-600",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className={`group ${theme === "dark" ? "bg-gray-900/80 border-gray-800 hover:border-gray-700" : "border-violet-100 hover:border-violet-300 bg-white/80"} backdrop-blur-sm transition-all duration-500 hover:shadow-xl transform hover:-translate-y-2 relative overflow-hidden`}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                <CardContent className="p-8">
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    {item.step}
                  </div>
                  <div className="flex items-center mb-4">
                    <item.icon className={`w-6 h-6 ${theme === "dark" ? "text-violet-400" : "text-violet-600"} mr-3`} />
                    <h3 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {item.title}
                    </h3>
                  </div>
                  <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>{item.description}</p>

                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="ghost"
                      className={`${theme === "dark" ? "text-violet-400" : "text-violet-600"} p-0 h-auto group-hover:translate-x-1 transition-transform duration-300`}
                    >
                      Learn more <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Decorative background elements */}
        <div
          className={`absolute top-1/2 left-1/4 w-64 h-64 ${theme === "dark" ? "bg-violet-900/30" : "bg-violet-200/30"} rounded-full blur-3xl -z-10`}
        ></div>
        <div
          className={`absolute bottom-1/4 right-1/4 w-64 h-64 ${theme === "dark" ? "bg-rose-900/30" : "bg-rose-200/30"} rounded-full blur-3xl -z-10`}
        ></div>
      </section>

      {/* Features */}
      <section
        id="features"
        className={`py-20 px-4 sm:px-6 lg:px-8 ${theme === "dark" ? "bg-gradient-to-br from-gray-900 to-violet-950" : "bg-gradient-to-br from-violet-50 to-rose-50"} relative overflow-hidden transition-colors duration-500`}
      >
        <div
          className={`absolute inset-0 ${theme === "dark" ? "bg-grid-pattern-dark" : "bg-grid-pattern"} opacity-5`}
        ></div>

        <div ref={featuresRef} className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge
              className={`mb-4 ${theme === "dark" ? "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-300" : "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-800"} hover:from-violet-500/30 hover:to-rose-500/30 transition-colors border-0 shadow-sm`}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Key Benefits
            </Badge>
            <h2
              className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} transition-colors duration-500`}
            >
              Why Choose Flintxt
            </h2>
            <p
              className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-4 max-w-xl mx-auto transition-colors duration-500`}
            >
              Our app is designed to foster genuine connections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Meaningful Chats",
                description: "Connect through engaging conversations, not just swiping photos.",
                icon: MessageCircle,
                color: theme === "dark" ? "from-violet-500 to-indigo-500" : "from-violet-600 to-indigo-600",
              },
              {
                title: "Friend or Date",
                description: "You decide how you want to connect - friendship, romance, or more.",
                icon: Heart,
                color: theme === "dark" ? "from-rose-400 to-pink-500" : "from-rose-500 to-pink-600",
              },
              {
                title: "Daily Matches",
                description: "Receive compatible matches daily based on your preferences.",
                icon: Coffee,
                color: theme === "dark" ? "from-amber-400 to-orange-500" : "from-amber-500 to-orange-600",
              },
              {
                title: "Privacy First",
                description: "Share your information only when you feel comfortable.",
                icon: Shield,
                color: theme === "dark" ? "from-emerald-400 to-green-500" : "from-emerald-500 to-green-600",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className={`group ${theme === "dark" ? "border-transparent bg-gray-900/50" : "border-transparent bg-white/80"} backdrop-blur-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden`}
              >
                <div
                  className={`absolute inset-0 ${theme === "dark" ? "bg-gradient-to-br from-violet-500/5 to-rose-500/5" : "bg-gradient-to-br from-violet-500/5 to-rose-500/5"} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                ></div>
                <CardContent className="p-6 relative z-10">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3
                    className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"} mb-3 transition-colors duration-500`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"} transition-colors duration-500`}
                  >
                    {feature.description}
                  </p>

                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div
          className={`absolute inset-0 ${theme === "dark" ? "bg-gradient-to-br from-gray-900/50 to-violet-950/50" : "bg-gradient-to-br from-violet-50/50 to-rose-50/50"} -z-10 transition-colors duration-500`}
        ></div>

        {/* Decorative elements */}
        <div
          className={`absolute top-0 left-0 w-full h-32 ${theme === "dark" ? "bg-gradient-to-b from-gray-900 to-transparent" : "bg-gradient-to-b from-white to-transparent"} transition-colors duration-500`}
        ></div>
        <div
          className={`absolute bottom-0 left-0 w-full h-32 ${theme === "dark" ? "bg-gradient-to-t from-gray-900 to-transparent" : "bg-gradient-to-t from-white to-transparent"} transition-colors duration-500`}
        ></div>

        <div ref={testimonialRef} className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge
              className={`mb-4 ${theme === "dark" ? "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-300" : "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-800"} hover:from-violet-500/30 hover:to-rose-500/30 transition-colors border-0 shadow-sm`}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Success Stories
            </Badge>
            <h2
              className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} transition-colors duration-500`}
            >
              What Our Users Say
            </h2>
            <p
              className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-4 max-w-xl mx-auto transition-colors duration-500`}
            >
              Real experiences from our community
            </p>
          </div>

          <div className="relative">
            {/* Testimonial cards with animation */}
            <div className="relative h-[400px] md:h-[300px] overflow-hidden">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 transition-all duration-1000 flex items-center justify-center",
                    index === activeTestimonial
                      ? "opacity-100 transform translate-x-0"
                      : index < activeTestimonial
                        ? "opacity-0 transform -translate-x-full"
                        : "opacity-0 transform translate-x-full",
                  )}
                >
                  <Card
                    className={`max-w-2xl mx-auto ${theme === "dark" ? "bg-gray-900/90 border-transparent" : "bg-white/90 border-transparent"} backdrop-blur-sm shadow-xl relative overflow-hidden`}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-rose-500"></div>
                    <CardContent className="p-8">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative">
                          <div
                            className={`w-20 h-20 rounded-full overflow-hidden ${theme === "dark" ? "border-4 border-gray-800" : "border-4 border-white"} shadow-lg`}
                          >
                            <img
                              src={testimonial.avatar || "/placeholder.svg"}
                              alt={testimonial.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div
                            className={`absolute -bottom-2 -right-2 ${theme === "dark" ? "bg-gray-800" : "bg-white"} rounded-full p-1 shadow-md`}
                          >
                            <Heart className={`w-4 h-4 ${theme === "dark" ? "text-rose-400" : "text-rose-500"}`} />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex mb-2">
                            {Array.from({ length: testimonial.rating }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                          <p
                            className={`${theme === "dark" ? "text-gray-200" : "text-gray-700"} italic text-lg mb-4 transition-colors duration-500`}
                          >
                            "{testimonial.text}"
                          </p>
                          <p
                            className={`${theme === "dark" ? "text-violet-400" : "text-violet-600"} font-medium transition-colors duration-500`}
                          >
                            {testimonial.name}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Navigation dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-300",
                    index === activeTestimonial
                      ? "bg-gradient-to-r from-violet-600 to-rose-500 w-6"
                      : `${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-300 hover:bg-gray-400"}`,
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        id="cta"
        className={`py-20 px-4 sm:px-6 lg:px-8 ${theme === "dark" ? "bg-gradient-to-br from-violet-950 to-gray-900" : "bg-gradient-to-br from-violet-100 to-rose-100"} relative overflow-hidden transition-colors duration-500`}
      >
        <div className={`absolute inset-0 ${theme === "dark" ? "bg-pattern-dark" : "bg-pattern"} opacity-5`}></div>

        {/* Animated shapes */}
        <div
          className={`absolute top-0 right-0 w-64 h-64 ${theme === "dark" ? "bg-rose-800" : "bg-rose-200"} rounded-full blur-3xl opacity-30 animate-float-slow`}
        ></div>
        <div
          className={`absolute bottom-0 left-0 w-64 h-64 ${theme === "dark" ? "bg-violet-800" : "bg-violet-200"} rounded-full blur-3xl opacity-30 animate-float-slow`}
          style={{ animationDelay: "2s" }}
        ></div>

        <div ref={ctaRef} className="max-w-4xl mx-auto text-center relative z-10">
          <Badge
            className={`mb-4 ${theme === "dark" ? "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-300" : "bg-gradient-to-r from-violet-500/20 to-rose-500/20 text-violet-800"} hover:from-violet-500/30 hover:to-rose-500/30 transition-colors border-0 shadow-sm`}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Get Started Today
          </Badge>
          <h2
            className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} mb-6 transition-colors duration-500`}
          >
            Ready to Find Your Perfect Match?
          </h2>
          <p
            className={`text-lg ${theme === "dark" ? "text-gray-300" : "text-gray-700"} mb-8 max-w-2xl mx-auto transition-colors duration-500`}
          >
            Join thousands of users who are making meaningful connections based on personality, not just appearances.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className={`group relative px-8 py-6 ${theme === "dark" ? "bg-gradient-to-r from-violet-500 to-rose-400" : "bg-gradient-to-r from-violet-600 to-rose-500"} text-white rounded-xl font-medium overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
            >
              <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <Sparkles className="w-5 h-5 mr-2 animate-pulse relative z-10" />
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform relative z-10" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={`px-8 py-6 ${theme === "dark" ? "text-white border-2 border-gray-700 hover:bg-gray-800" : "text-violet-600 border-2 border-violet-200 hover:bg-violet-50"} rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl`}
            >
              Learn More
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6">
            {[
              { icon: CheckCircle, text: "No Photos Required" },
              { icon: Shield, text: "Privacy Protected" },
              { icon: Clock, text: "Quick Setup" },
            ].map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-300 bg-gray-800/50" : "text-gray-700 bg-white/50"} backdrop-blur-sm px-4 py-2 rounded-full shadow-sm transition-colors duration-500`}
              >
                <item.icon className={`w-5 h-5 ${theme === "dark" ? "text-violet-400" : "text-violet-600"}`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`py-12 px-4 sm:px-6 lg:px-8 ${theme === "dark" ? "bg-gray-900/70" : "bg-white/70"} backdrop-blur-xl relative overflow-hidden transition-colors duration-500`}
      >
        <div
          className={`absolute inset-0 ${theme === "dark" ? "bg-grid-pattern-dark" : "bg-grid-pattern"} opacity-5`}
        ></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div
                  className={`absolute inset-0 ${theme === "dark" ? "bg-violet-500" : "bg-violet-500"} rounded-full blur-md animate-pulse opacity-70`}
                ></div>
                <Heart className="w-6 h-6 text-white relative z-10" />
              </div>
              <span
                className={`text-xl font-bold bg-gradient-to-r ${theme === "dark" ? "from-violet-400 to-rose-400" : "from-violet-600 to-rose-500"} bg-clip-text text-transparent`}
              >
                flintxt
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Button
                variant="link"
                className={`${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-violet-600"} transition-colors p-0 h-auto`}
              >
                About Us
              </Button>
              <Button
                variant="link"
                className={`${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-violet-600"} transition-colors p-0 h-auto`}
              >
                Privacy Policy
              </Button>
              <Button
                variant="link"
                className={`${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-violet-600"} transition-colors p-0 h-auto`}
              >
                Terms & Conditions
              </Button>
              <Button
                variant="link"
                className={`${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-violet-600"} transition-colors p-0 h-auto`}
              >
                Refunds
              </Button>
              <Button
                variant="link"
                className={`${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-violet-600"} transition-colors p-0 h-auto`}
              >
                Contact
              </Button>
            </div>
          </div>

          <div
            className={`border-t ${theme === "dark" ? "border-gray-800" : "border-violet-100"} mt-8 pt-8 text-center text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-500"} transition-colors duration-500`}
          >
            <p>&copy; {new Date().getFullYear()} Flintxt. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
