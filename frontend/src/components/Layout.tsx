import React, { useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export function Layout({ children, pageTitle = "Dashboard" }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authBypass, setAuthBypass] = useState<boolean>(() => localStorage.getItem('authBypass') === 'true');
  
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved === 'dark' || (!saved && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const toggleAuthBypass = () => {
    const next = !authBypass;
    setAuthBypass(next);
    localStorage.setItem('authBypass', next ? 'true' : 'false');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  // Navigation items configuration
  const navigationItems = [
    { 
      name: 'Dashboard', 
      path: '/', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      )
    },
    { 
      name: 'Executive Dashboard', 
      path: '/executive', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 16.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 100 2h-4a1 1 0 100-2h4z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Products & Programs', 
      path: '/programs', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2a1 1 0 100-2h-2z" />
          <path fillRule="evenodd" d="M4 11a2 2 0 100 4 2 2 0 000-4zM2 13a4 4 0 118 0 4 4 0 01-8 0zm6-7a2 2 0 100 4 2 2 0 000-4zm-2 2a4 4 0 118 0 4 4 0 01-8 0zm10-2a2 2 0 100 4 2 2 0 000-4zm-2 2a4 4 0 118 0 4 4 0 01-8 0z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Transitions', 
      path: '/transitions', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-7-8a7 7 0 1114 0 7 7 0 01-14 0zm7-4a1 1 0 00-1 1v2a1 1 0 002 0V7a1 1 0 00-1-1zm1 4a1 1 0 00-2 0v2a1 1 0 002 0v-2zm-1 3a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Business Operations', 
      path: '/business-operations', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M12 10a2 2 0 11-4 0 2 2 0 014 0z" />
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Knowledge Platform', 
      path: '/knowledge', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M12 10a2 2 0 11-4 0 2 2 0 014 0z" />
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Tasks & Milestones', 
      path: '/tasks', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.5-6a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-3z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Artifact Vault', 
      path: '/artifacts', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1H6zm2 4a1 1 0 100 2h4a1 1 0 100-2H8zm-1 4a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Security & Access', 
      path: '/security', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v5a1 1 0 102 0V7z" clipRule="evenodd" />
        </svg>
      )
    },
  ];

  const isCurrentPath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Close user menu if clicking outside
      if (isUserMenuOpen && !target.closest('#user-menu-btn') && !target.closest('#user-menu')) {
        setIsUserMenuOpen(false);
      }
      
      // Close search if clicking outside
      if (isSearchOpen && !target.closest('#search-btn') && !target.closest('#search-input')) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen, isSearchOpen]);

  return (
    <div className={`flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} border-r border-gray-200 dark:border-gray-700`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center space-x-2 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 19h12" />
            </svg>
            <span className="text-xl font-bold">TIP</span>
          </div>
          
          {/* Desktop collapse button */}
          <button
            onClick={toggleSidebar}
            className="hidden md:block p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
          >
            <svg 
              className={`w-6 h-6 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => {
                    navigate(item.path);
                    closeMobileSidebar();
                  }}
                  className={`flex items-center w-full p-2 space-x-2 rounded-lg transition-colors duration-200 text-left ${
                    isCurrentPath(item.path)
                      ? 'bg-green-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : ''}`}>
                    {item.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center p-2 space-x-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <img 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
              src="https://placehold.co/100x100/A0AEC0/000000?text=JD" 
              alt="User Profile" 
            />
            <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : ''}`}>
              Jane Doe
            </span>
          </div>
          <button className={`flex items-center justify-center w-full p-2 mt-2 space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors ${isSidebarCollapsed ? 'md:justify-center' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h5a1 1 0 000-2H4V4h4a1 1 0 100-2H3zm7 3a1 1 0 00-1 1v3.586l-.293-.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 10-1.414-1.414L11 10.586V7a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : ''}`}>
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Top Header */}
        <header className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {/* Mobile menu toggle */}
            <button
              onClick={toggleMobileSidebar}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page Title */}
            <h1 className="text-2xl font-bold">{pageTitle}</h1>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Dev Auth Bypass toggle */}
              <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded border text-xs" title="Sends x-auth-bypass: true header to backend">
                <span className="opacity-70">Auth Bypass</span>
                <label className="relative inline-block w-10 h-5 cursor-pointer">
                  <input type="checkbox" checked={authBypass} onChange={toggleAuthBypass} className="opacity-0 w-0 h-0" />
                  <span className={`absolute inset-0 ${authBypass ? 'bg-green-500' : 'bg-gray-300'} rounded-full`}>
                    <span className={`absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${authBypass ? 'translate-x-5' : ''}`} />
                  </span>
                </label>
              </div>
              {/* Search */}
              <div className="relative">
                <button
                  id="search-btn"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                {isSearchOpen && (
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search..."
                    className="absolute right-0 top-full mt-2 w-48 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                )}
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* Dark mode toggle */}
              <label className="relative inline-block w-14 h-8 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="opacity-0 w-0 h-0"
                />
                <span className={`absolute inset-0 bg-gray-300 rounded-full transition-all duration-400 ${isDarkMode ? 'bg-green-500' : ''}`}>
                  <span className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform duration-400 ${isDarkMode ? 'translate-x-6' : ''}`} />
                </span>
              </label>

              {/* User menu */}
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center focus:outline-none"
                >
                  <img 
                    className="w-8 h-8 rounded-full object-cover" 
                    src="https://placehold.co/100x100/A0AEC0/000000?text=JD" 
                    alt="User Profile" 
                  />
                </button>
                
                {isUserMenuOpen && (
                  <div id="user-menu" className="absolute right-0 z-50 w-48 py-2 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <button className="flex items-center w-full px-4 py-2 space-x-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span>Account</span>
                    </button>
                    <button className="flex items-center w-full px-4 py-2 space-x-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      <span>Settings</span>
                    </button>
                    <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
                    <button className="flex items-center w-full px-4 py-2 space-x-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h5a1 1 0 000-2H4V4h4a1 1 0 100-2H3zm7 3a1 1 0 00-1 1v3.586l-.293-.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 10-1.414-1.414L11 10.586V7a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
