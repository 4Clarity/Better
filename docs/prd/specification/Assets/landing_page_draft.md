<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TIP Enterprise Platform</title>
    <!-- Use Inter font from Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>
<body class="text-gray-800 bg-gray-50">

    <!-- Header & Navigation -->
    <header class="sticky top-0 z-50 bg-white shadow-sm">
        <div class="container flex items-center justify-between px-4 py-4 mx-auto">
            <!-- Logo/Brand -->
            <div class="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 19h12" />
                </svg>
                <span class="text-xl font-bold text-gray-900">TIP</span>
            </div>
            <!-- Navigation Links -->
            <nav class="hidden space-x-6 md:flex">
                <a href="#features" class="text-gray-600 transition-colors duration-300 hover:text-blue-600">Features</a>
                <a href="#platform" class="text-gray-600 transition-colors duration-300 hover:text-blue-600">Platform</a>
                <a href="#contact" class="text-gray-600 transition-colors duration-300 hover:text-blue-600">Contact</a>
            </nav>
            <!-- Call-to-Action Buttons -->
            <div class="flex items-center space-x-4">
                <a href="#" class="hidden text-gray-600 transition-colors duration-300 md:block hover:text-blue-600">Log In</a>
                <a href="#" class="px-6 py-2 font-medium text-white transition-colors duration-300 bg-blue-600 rounded-lg hover:bg-blue-700">Get a Demo</a>
            </div>
        </div>
    </header>

    <main>
        <!-- Hero Section -->
        <section class="py-20 bg-gray-100 md:py-32">
            <div class="container px-4 mx-auto text-center">
                <h1 class="mb-4 text-4xl font-extrabold leading-tight text-gray-900 md:text-6xl">
                    Streamline Your Program Transitions
                </h1>
                <p class="max-w-3xl mx-auto mb-8 text-lg text-gray-600 md:text-xl">
                    The TIP Enterprise Platform provides an all-in-one solution for secure, efficient, and compliant program management transitions.
                </p>
                <div class="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <a href="#" class="w-full px-8 py-3 font-medium text-center text-white transition-colors duration-300 bg-blue-600 rounded-lg hover:bg-blue-700 sm:w-auto">
                        Request a Demo
                    </a>
                    <a href="#" class="w-full px-8 py-3 font-medium text-center text-gray-800 transition-colors duration-300 bg-white border border-gray-300 rounded-lg hover:bg-gray-200 sm:w-auto">
                        Learn More
                    </a>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="py-16 md:py-24">
            <div class="container px-4 mx-auto">
                <h2 class="mb-12 text-3xl font-bold text-center text-gray-900 md:text-4xl">
                    Key Platform Modules
                </h2>
                <!-- Features Grid -->
                <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">

                    <!-- Executive Dashboard -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Executive Dashboard</h3>
                        <p class="text-gray-600">
                            Gain a high-level view of all programs and portfolios with critical insights and analytics.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>Portfolio Overview & Cross-Program Analytics</li>
                            <li>Resource & Product Assignment Management</li>
                            <li>Comprehensive Executive Reports</li>
                        </ul>
                    </div>

                    <!-- Products & Programs -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Products & Programs</h3>
                        <p class="text-gray-600">
                            Manage the lifecycle of products and programs with multi-level hierarchies and archives.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>Product Assignment & My Products Dashboard</li>
                            <li>Quarantined & Archived Products</li>
                            <li>Multi-level hierarchy for all products</li>
                        </ul>
                    </div>

                    <!-- Transitions -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Transitions</h3>
                        <p class="text-gray-600">
                            Oversee active and historical transitions, from setup to completion and archiving.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>Active & My Transitions</li>
                            <li>Transition Setup & Government Reassignments</li>
                            <li>Historical & Completed Transitions Archive</li>
                        </ul>
                    </div>

                    <!-- Operational Knowledge Platform -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Operational Knowledge</h3>
                        <p class="text-gray-600">
                            Capture and leverage institutional memory with an AI-powered knowledge base.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>Living Knowledge Base & AI-Powered Search</li>
                            <li>Best Practices Repository & Lessons Learned</li>
                            <li>Institutional Memory Capture</li>
                        </ul>
                    </div>
                    
                    <!-- Tasks & Milestones -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Tasks & Milestones</h3>
                        <p class="text-gray-600">
                            Track progress and manage dependencies to keep every transition on schedule.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>My Tasks, Team Tasks & Milestones</li>
                            <li>Calendar View & Dependency Management</li>
                        </ul>
                    </div>

                    <!-- Artifact Vault -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Artifact Vault</h3>
                        <p class="text-gray-600">
                            Securely store and manage all project documentation with PIV-filtered access.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>PIV-Filtered Document Library</li>
                            <li>Security Classification Management</li>
                            <li>Review & Approval Queue</li>
                        </ul>
                    </div>

                    <!-- Assessment Center -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Assessment Center</h3>
                        <p class="text-gray-600">
                            Measure team proficiency and track progress on certifications and learning goals.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>Proficiency Assessments & Progress Tracking</li>
                            <li>Certification Management & Competency Analytics</li>
                        </ul>
                    </div>

                    <!-- Communications & Reports -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Communications & Reporting</h3>
                        <p class="text-gray-600">
                            Stay connected with secure messaging and get the data you need to make informed decisions.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>Secure Message Center & Security-Filtered Notifications</li>
                            <li>Risk Assessment & Compliance Dashboard</li>
                            <li>Predictive Analytics & Performance Metrics</li>
                        </ul>
                    </div>

                    <!-- Security & Administration -->
                    <div class="p-6 bg-white shadow-lg rounded-xl">
                        <h3 class="mb-3 text-xl font-semibold text-gray-900">Security & Administration</h3>
                        <p class="text-gray-600">
                            Maintain complete control over user access, security policies, and system configuration.
                        </p>
                        <ul class="mt-4 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            <li>PIV Status Dashboard & Clearance Verification</li>
                            <li>User & Role Management with comprehensive audit logs</li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>

        <!-- Call-to-Action Section -->
        <section id="contact" class="py-20 text-center bg-blue-600 md:py-24">
            <div class="container px-4 mx-auto">
                <h2 class="mb-4 text-3xl font-bold text-white md:text-4xl">
                    Ready to Simplify Your Transitions?
                </h2>
                <p class="max-w-2xl mx-auto mb-8 text-lg text-blue-100 md:text-xl">
                    Take the next step in optimizing your program management with our secure and intelligent platform.
                </p>
                <a href="#" class="px-8 py-3 font-medium text-blue-600 transition-colors duration-300 bg-white rounded-lg shadow-md hover:bg-gray-200">
                    Schedule a Free Demo
                </a>
            </div>
        </section>

    </main>

    <!-- Footer -->
    <footer class="py-12 text-gray-300 bg-gray-900">
        <div class="container px-4 mx-auto text-center">
            <div class="mb-4">
                <span class="text-lg font-bold">TIP Enterprise Platform</span>
            </div>
            <div class="flex justify-center mb-4 space-x-6">
                <a href="#" class="text-gray-400 transition-colors duration-300 hover:text-white">Privacy Policy</a>
                <a href="#" class="text-gray-400 transition-colors duration-300 hover:text-white">Terms of Service</a>
                <a href="#" class="text-gray-400 transition-colors duration-300 hover:text-white">Contact Us</a>
            </div>
            <p class="text-sm text-gray-500">&copy; 2024 TIP. All Rights Reserved.</p>
        </div>
    </footer>

</body>
</html>

