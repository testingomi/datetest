import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function Layout({ children, showSidebar = true }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Reduced timeout for better UX
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {showSidebar && (
        <>
          {/* Mobile/Tablet Sidebar Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="fixed top-2 left-2 z-50 lg:hidden px-3 py-2 bg-white/80 backdrop-blur shadow-md rounded-full hover:bg-purple-50 transition-all duration-300 group border border-purple-100"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
          </button>
        </>
      )}



      {/* Mobile/Tablet Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <aside
          className={`fixed lg:sticky top-0 left-0 z-50 h-full w-72 lg:w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 w-full ${showSidebar ? 'lg:w-[calc(100%-16rem)] lg:ml-64' : ''} h-screen overflow-y-auto relative`}>
        <div className="h-full absolute inset-0 max-w-[100vw] overflow-x-hidden px-4 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
