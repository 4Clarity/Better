<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TIP Dashboard</title>
    <!-- Use Inter font from Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Tailwind config to extend colors for both light and dark themes
        tailwind.config = {
            darkMode: 'class', // Enable dark mode based on 'dark' class on <html>
            theme: {
                extend: {
                    colors: {
                        'primary': '#A5C460', // Vibrant accent color
                        'dark-bg': '#1E1E1E',
                        'dark-card': '#2A2A2A',
                        'dark-text': '#E5E5E5',
                        'dark-secondary-text': '#A0A0A0',
                        'light-bg': '#F3F4F6',
                        'light-card': '#FFFFFF',
                        'light-text': '#1F2937',
                        'light-secondary-text': '#6B7280',
                    }
                }
            }
        }
    </script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            overflow-x: hidden; /* Prevent horizontal scroll on small screens */
        }
        /* Custom scrollbar for the navigation */
        .nav-scroll {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
        .nav-scroll::-webkit-scrollbar {
            display: none; /* Chrome, Safari, and Opera */
        }
        /* Base sidebar styles and transitions */
        .sidebar-transition {
            transition: width 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
        .main-content-transition {
            transition: margin-left 0.3s ease-in-out;
        }

        /* Collapsed state styles for desktop */
        .sidebar-collapsed #sidebar {
            width: 5rem; /* Equivalent to w-20 */
        }
        .sidebar-collapsed #logo-container,
        .sidebar-collapsed .nav-text,
        .sidebar-collapsed .user-info {
            opacity: 0;
            width: 0;
            overflow: hidden;
            pointer-events: none;
        }
        .sidebar-collapsed #sidebar-header {
            justify-content: center;
        }
        .sidebar-collapsed #toggle-icon {
            transform: rotate(180deg);
        }
        .sidebar-collapsed .nav-icon {
            margin-right: 0;
        }

        /* Dark mode switch styling */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 3.5rem;
            height: 1.5rem;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #333;
            -webkit-transition: .4s;
            transition: .4s;
            border-radius: 9999px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 1.25rem;
            width: 1.25rem;
            left: 0.125rem;
            bottom: 0.125rem;
            background-color: white;
            -webkit-transition: .4s;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #A5C460;
        }
        input:checked + .slider:before {
            -webkit-transform: translateX(2rem);
            -ms-transform: translateX(2rem);
            transform: translateX(2rem);
        }
    </style>
</head>
<body class="flex min-h-screen bg-light-bg text-light-text sidebar-wrapper dark:bg-dark-bg dark:text-dark-text">

    <!-- Mobile Backdrop -->
    <div id="mobile-backdrop" class="fixed inset-0 z-30 transition-opacity duration-300 bg-black opacity-0 pointer-events-none md:hidden"></div>

    <!-- Sidebar Navigation -->
    <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 flex flex-col flex-shrink-0 w-64 transform -translate-x-full bg-light-card text-light-text md:translate-x-0 sidebar-transition md:static dark:bg-dark-card dark:text-dark-text">
        <div id="sidebar-header" class="flex items-center justify-between p-4 transition-all duration-300 ease-in-out border-b border-gray-200 dark:border-gray-800">
            <!-- Platform Logo & Name -->
            <div id="logo-container" class="flex items-center space-x-2 transition-all duration-300 ease-in-out">
                <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 19h12" />
                </svg>
                <span class="ml-2 overflow-hidden text-xl font-bold whitespace-nowrap nav-text">TIP</span>
            </div>
            <!-- Collapse/Expand Button (Desktop Only) -->
            <button id="sidebar-toggle-btn" class="hidden p-1 transition-colors duration-200 rounded-full text-light-secondary-text hover:bg-gray-200 md:block dark:text-dark-secondary-text dark:hover:bg-dark-bg">
                <svg id="toggle-icon" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 transition-transform duration-300 ease-in-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
            </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 p-4 overflow-y-auto nav-scroll">
            <ul class="space-y-2 text-sm font-medium">
                <!-- Dashboard (Role-specific landing) -->
                <li>
                    <a href="#" class="flex items-center p-2 space-x-2 text-white rounded-lg bg-primary group">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Dashboard</span>
                    </a>
                </li>
                
                <!-- Executive Dashboard -->
                <li class="group">
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 16.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 100 2h-4a1 1 0 100-2h4z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Executive Dashboard</span>
                    </a>
                </li>
                
                <!-- Products & Programs -->
                <li class="group">
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2a1 1 0 100-2h-2z" /><path fill-rule="evenodd" d="M4 11a2 2 0 100 4 2 2 0 000-4zM2 13a4 4 0 118 0 4 4 0 01-8 0zm6-7a2 2 0 100 4 2 2 0 000-4zm-2 2a4 4 0 118 0 4 4 0 01-8 0zm10-2a2 2 0 100 4 2 2 0 000-4zm-2 2a4 4 0 118 0 4 4 0 01-8 0z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Products & Programs</span>
                    </a>
                </li>

                <!-- Transitions -->
                <li class="group">
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-7-8a7 7 0 1114 0 7 7 0 01-14 0zm7-4a1 1 0 00-1 1v2a1 1 0 002 0V7a1 1 0 00-1-1zm1 4a1 1 0 00-2 0v2a1 1 0 002 0v-2zm-1 3a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Transitions</span>
                    </a>
                </li>
            
                <!-- Other sections can be added here following the same pattern -->
                <li>
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M12 10a2 2 0 11-4 0 2 2 0 014 0z" /><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Knowledge Platform</span>
                    </a>
                </li>
                <li>
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.5-6a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-3z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Tasks & Milestones</span>
                    </a>
                </li>
                <li>
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1H6zm2 4a1 1 0 100 2h4a1 1 0 100-2H8zm-1 4a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Artifact Vault</span>
                    </a>
                </li>
                <li>
                    <a href="#" class="flex items-center p-2 space-x-2 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v5a1 1 0 102 0V7z" clip-rule="evenodd" /></svg>
                        <span class="overflow-hidden whitespace-nowrap nav-text">Security & Access</span>
                    </a>
                </li>
            </ul>
        </nav>
        
        <!-- User/Account Section -->
        <div class="p-4 mt-auto border-t border-gray-200 dark:border-gray-800">
            <a href="#" class="flex items-center p-2 space-x-3 transition-colors duration-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg">
                <img class="flex-shrink-0 object-cover w-8 h-8 rounded-full nav-icon" src="https://placehold.co/100x100/A0AEC0/000000?text=JD" alt="User Profile">
                <span class="overflow-hidden text-sm whitespace-nowrap nav-text user-info">Jane Doe</span>
            </a>
            <button class="flex items-center justify-center w-full p-2 mt-2 space-x-2 transition-colors duration-200 rounded-lg text-light-secondary-text hover:text-light-text hover:bg-gray-200 dark:text-dark-secondary-text dark:hover:text-dark-text dark:hover:bg-dark-bg">
                <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h5a1 1 0 000-2H4V4h4a1 1 0 100-2H3zm7 3a1 1 0 00-1 1v3.586l-.293-.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 10-1.414-1.414L11 10.586V7a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                <span class="overflow-hidden whitespace-nowrap nav-text">Log Out</span>
            </button>
        </div>
    </aside>

    <!-- Main content area -->
    <div class="flex flex-col flex-1">
        <!-- Top Header -->
        <header class="z-30 flex-shrink-0 p-4 shadow-sm bg-light-card dark:bg-dark-card">
            <div class="flex items-center justify-between">
                <!-- Mobile menu toggle button -->
                <button id="mobile-menu-toggle" class="p-2 rounded-lg text-light-secondary-text hover:bg-gray-200 md:hidden dark:text-dark-secondary-text dark:hover:bg-dark-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <!-- Page Title -->
                <h1 class="text-2xl font-bold text-light-text dark:text-dark-text">Executive Dashboard</h1>
                <!-- Right-side actions (User Profile, Notifications, etc.) -->
                <div class="flex items-center space-x-4">
                    <!-- Search Icon and Input -->
                    <div class="relative flex items-center">
                        <button id="search-btn" class="p-2 rounded-lg text-light-secondary-text hover:bg-gray-200 dark:text-dark-secondary-text dark:hover:bg-dark-bg">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </button>
                        <input id="search-input" type="text" placeholder="Search..." class="absolute right-0 hidden w-48 px-4 py-2 text-sm bg-gray-100 rounded-lg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>

                    <!-- Notifications Icon -->
                    <button class="p-2 rounded-lg text-light-secondary-text hover:bg-gray-200 dark:text-dark-secondary-text dark:hover:bg-dark-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </button>

                    <!-- Dark Theme Toggle Switch -->
                    <label class="toggle-switch">
                        <input type="checkbox" id="theme-toggle">
                        <span class="slider"></span>
                    </label>

                    <!-- User Profile Dropdown -->
                    <div class="relative">
                        <button id="user-menu-btn" class="flex items-center space-x-2 focus:outline-none">
                            <img class="object-cover w-8 h-8 rounded-full" src="https://placehold.co/100x100/A0AEC0/000000?text=JD" alt="User Profile">
                        </button>
                        <!-- Dropdown menu -->
                        <div id="user-menu" class="absolute right-0 z-50 hidden w-48 py-2 mt-2 rounded-lg shadow-lg bg-light-card dark:bg-dark-card">
                            <a href="#" class="flex items-center px-4 py-2 mx-2 space-x-2 rounded-md text-light-text hover:bg-gray-200 dark:text-dark-text dark:hover:bg-dark-bg">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
                                <span>Account</span>
                            </a>
                            <a href="#" class="flex items-center px-4 py-2 mx-2 space-x-2 rounded-md text-light-text hover:bg-gray-200 dark:text-dark-text dark:hover:bg-dark-bg">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                                <span>Settings</span>
                            </a>
                            <div class="my-1 border-t border-gray-200 dark:border-gray-600"></div>
                            <a href="#" class="flex items-center px-4 py-2 mx-2 space-x-2 text-red-600 rounded-md hover:bg-red-50 dark:text-red-400 dark:hover:bg-dark-bg">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h5a1 1 0 000-2H4V4h4a1 1 0 100-2H3zm7 3a1 1 0 00-1 1v3.586l-.293-.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 10-1.414-1.414L11 10.586V7a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                                <span>Log Out</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content Section -->
        <div class="flex-1 p-8 overflow-y-auto">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <!-- Example Card/Module from the tree -->
                <div class="p-6 rounded-lg shadow-md bg-light-card dark:bg-dark-card">
                    <h2 class="mb-4 text-xl font-semibold">Portfolio Overview</h2>
                    <p class="text-light-secondary-text dark:text-dark-secondary-text">Placeholder for portfolio summary, key metrics, and status at a glance. This would be the main content of the Executive Dashboard.</p>
                </div>
                <!-- Add more cards and components here -->
                <div class="p-6 rounded-lg shadow-md bg-light-card dark:bg-dark-card">
                    <h2 class="mb-4 text-xl font-semibold">Cross-Program Analytics</h2>
                    <p class="text-light-secondary-text dark:text-dark-secondary-text">Placeholder for charts and data visualizations showing trends across different programs.</p>
                </div>
                 <div class="p-6 rounded-lg shadow-md bg-light-card dark:bg-dark-card">
                    <h2 class="mb-4 text-xl font-semibold">Resource Allocation</h2>
                    <p class="text-light-secondary-text dark:text-dark-secondary-text">Placeholder for resource allocation heat maps or summary tables.</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // User Profile Dropdown Logic
            const userMenuBtn = document.getElementById('user-menu-btn');
            const userMenu = document.getElementById('user-menu');
            const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
            const body = document.body;
            const sidebar = document.getElementById('sidebar');

            if (userMenuBtn && userMenu) {
                userMenuBtn.addEventListener('click', () => {
                    userMenu.classList.toggle('hidden');
                });

                // Hide dropdown when clicking outside
                document.addEventListener('click', (event) => {
                    if (!userMenuBtn.contains(event.target) && !userMenu.contains(event.target)) {
                        userMenu.classList.add('hidden');
                    }
                });
            }

            // Desktop Sidebar Collapse/Expand Logic
            if (sidebarToggleBtn) {
                sidebarToggleBtn.addEventListener('click', () => {
                    body.classList.toggle('sidebar-collapsed');
                });
            }

            // Mobile menu toggle logic
            const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
            if (mobileMenuToggle && sidebar) {
                mobileMenuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('-translate-x-full');
                });
                
                // New mobile close behavior: Click anywhere on the sidebar to close it
                sidebar.addEventListener('click', (event) => {
                    if (!sidebar.classList.contains('-translate-x-full')) {
                        const isLink = event.target.closest('a');
                        if (window.innerWidth < 768 && !isLink) {
                            sidebar.classList.add('-translate-x-full');
                        }
                    }
                });
            }
            
            // Search Input Toggle Logic
            const searchBtn = document.getElementById('search-btn');
            const searchInput = document.getElementById('search-input');
            if (searchBtn && searchInput) {
                searchBtn.addEventListener('click', () => {
                    searchInput.classList.toggle('hidden');
                    if (!searchInput.classList.contains('hidden')) {
                        searchInput.focus();
                    }
                });
                // Hide search input when clicking outside
                document.addEventListener('click', (event) => {
                    if (!searchBtn.contains(event.target) && !searchInput.contains(event.target)) {
                        searchInput.classList.add('hidden');
                    }
                });
            }

            // Dark Theme Toggle Logic
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                // Set initial state from localStorage or system preference
                const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    themeToggle.checked = true;
                } else {
                    document.documentElement.classList.remove('dark');
                    themeToggle.checked = false;
                }

                // Add event listener to toggle theme
                themeToggle.addEventListener('change', () => {
                    if (themeToggle.checked) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                    }
                });
            }
        });
    </script>

</body>
</html>
