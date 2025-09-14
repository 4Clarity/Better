import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EnhancedAuthProvider, useEnhancedAuth } from './contexts/EnhancedAuthContext';
import { Layout } from './components/Layout';

// Import existing pages
import LoginPage from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectHubPage } from './pages/ProjectHubPage';
import { BusinessOperationsPage } from './pages/BusinessOperationsPage';
import { BusinessOperationDetailPage } from './pages/BusinessOperationDetailPage';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { TransitionsPage } from './pages/TransitionsPage';
import { EnhancedTransitionDetailPage } from './pages/EnhancedTransitionDetailPage';
import { EditBusinessOperationPage } from './pages/EditBusinessOperationPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { TransitionUserPage } from './pages/TransitionUserPage';
import { TasksAndMilestonesPage } from './pages/TasksAndMilestonesPage';

// Import new authentication pages
import { RegistrationForm } from './components/auth/RegistrationForm';
import { EmailVerificationPage } from './components/auth/EmailVerificationPage';
import { RegistrationSuccessPage } from './components/auth/RegistrationSuccessPage';
import { AdminPage } from './pages/AdminPage';

// Enhanced login page component that supports registration
function EnhancedLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/approval-pending" element={
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Approval Pending</h2>
              <p className="text-gray-600">Your registration is pending admin approval.</p>
            </div>
          } />
          <Route path="/registration-rejected" element={
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Registration Rejected</h2>
              <p className="text-red-600">Your registration was rejected. Please contact an administrator.</p>
            </div>
          } />
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// Protected route wrapper that checks for admin permissions
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useEnhancedAuth();

  // Check if user has admin role
  const hasAdminRole = user && (
    user.roles?.includes('admin') ||
    user.roles?.includes('super_admin') ||
    user.isFirstUser // First user is automatically admin
  );

  if (!hasAdminRole) {
    return (
      <Layout pageTitle="Access Denied">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this area.</p>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}

function EnhancedAppRoutes() {
  const { isAuthenticated, isLoading, user } = useEnhancedAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication pages if not authenticated
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth/*" element={<EnhancedLoginPage />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    );
  }

  // Show main app if authenticated
  return (
    <Routes>
      {/* Main Application Routes */}
      <Route path="/" element={
        <Layout pageTitle="Dashboard">
          <DashboardPage />
        </Layout>
      } />

      <Route path="/transitions" element={
        <Layout pageTitle="Transitions">
          <TransitionsPage />
        </Layout>
      } />

      <Route path="/transitions/:id" element={
        <Layout pageTitle="Transition Details">
          <ProjectHubPage />
        </Layout>
      } />

      <Route path="/enhanced-transitions/:id" element={
        <Layout pageTitle="Enhanced Transition Details">
          <EnhancedTransitionDetailPage />
        </Layout>
      } />

      <Route path="/transitions/:transitionId/users" element={
        <Layout pageTitle="Transition Users">
          <TransitionUserPage />
        </Layout>
      } />

      <Route path="/business-operations" element={
        <Layout pageTitle="Business Operations">
          <BusinessOperationsPage />
        </Layout>
      } />

      <Route path="/business-operations/:id" element={
        <Layout pageTitle="Business Operation Details">
          <BusinessOperationDetailPage />
        </Layout>
      } />

      <Route path="/business-operations/:id/edit" element={
        <Layout pageTitle="Edit Business Operation">
          <EditBusinessOperationPage />
        </Layout>
      } />

      <Route path="/contracts/:id" element={
        <Layout pageTitle="Contract Details">
          <ContractDetailPage />
        </Layout>
      } />

      <Route path="/executive" element={
        <Layout pageTitle="Executive Dashboard">
          <div className="p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-6 rounded-lg shadow-md bg-card">
                <h2 className="mb-4 text-xl font-semibold">Portfolio Overview</h2>
                <p className="text-muted-foreground">Placeholder for portfolio summary, key metrics, and status at a glance.</p>
              </div>
              <div className="p-6 rounded-lg shadow-md bg-card">
                <h2 className="mb-4 text-xl font-semibold">Cross-Program Analytics</h2>
                <p className="text-muted-foreground">Placeholder for charts and data visualizations showing trends across different programs.</p>
              </div>
              <div className="p-6 rounded-lg shadow-md bg-card">
                <h2 className="mb-4 text-xl font-semibold">Resource Allocation</h2>
                <p className="text-muted-foreground">Placeholder for resource allocation heat maps or summary tables.</p>
              </div>
            </div>
          </div>
        </Layout>
      } />

      <Route path="/programs" element={
        <Layout pageTitle="Products & Programs">
          <div className="p-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Products & Programs</h2>
              <p className="text-muted-foreground">This section will contain product and program management features.</p>
            </div>
          </div>
        </Layout>
      } />

      <Route path="/knowledge" element={
        <Layout pageTitle="Knowledge Platform">
          <div className="p-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Knowledge Platform</h2>
              <p className="text-muted-foreground">This section will contain knowledge management and documentation features.</p>
            </div>
          </div>
        </Layout>
      } />

      <Route path="/tasks" element={
        <Layout pageTitle="Tasks & Milestones">
          <TasksAndMilestonesPage />
        </Layout>
      } />

      <Route path="/transitions/:id/tasks-milestones" element={
        <Layout pageTitle="Tasks & Milestones">
          <TasksAndMilestonesPage />
        </Layout>
      } />

      <Route path="/artifacts" element={
        <Layout pageTitle="Artifact Vault">
          <div className="p-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Artifact Vault</h2>
              <p className="text-muted-foreground">This section will contain artifact storage and management features.</p>
            </div>
          </div>
        </Layout>
      } />

      <Route path="/security" element={
        <Layout pageTitle="Security & Access">
          <UserManagementPage />
        </Layout>
      } />

      {/* Admin Routes - Protected by AdminRoute wrapper */}
      <Route path="/admin" element={
        <AdminRoute>
          <Layout pageTitle="Administration">
            <AdminPage />
          </Layout>
        </AdminRoute>
      } />

      <Route path="/admin/registrations" element={
        <AdminRoute>
          <Layout pageTitle="Registration Management">
            <AdminPage />
          </Layout>
        </AdminRoute>
      } />

      {/* Authentication Routes - These should redirect to main app since user is authenticated */}
      <Route path="/auth/*" element={<Navigate to="/" replace />} />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function EnhancedApp() {
  return (
    <EnhancedAuthProvider>
      <Router>
        <EnhancedAppRoutes />
      </Router>
    </EnhancedAuthProvider>
  );
}

export default EnhancedApp;