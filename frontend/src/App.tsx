import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
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
import { KnowledgeManagementPage } from './pages/KnowledgeManagementPage';
import { RolesMatrixPage } from './pages/RolesMatrixPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ProductsProgramsPage } from './pages/ProductsProgramsPage';
import { AIPlanningPage } from './pages/AIPlanningPage';
import { AIPlanningConfigPage } from './pages/AIPlanningConfigPage';
import { BusinessOperationsSetupPage } from './pages/BusinessOperationsSetupPage';
import { KnowledgeSetupPage } from './pages/KnowledgeSetupPage';
import { StakeholdersSetupPage } from './pages/StakeholdersSetupPage';

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

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

  // Show main app routes
  return (
    <Routes>
        {/* Login route - redirect to dashboard if already authenticated */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />

        {/* Protected routes - redirect to login if not authenticated */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout pageTitle="Dashboard">
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout pageTitle="Dashboard">
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/setup/business-operations" element={
          <ProtectedRoute>
            <Layout pageTitle="Business Operations Setup">
              <BusinessOperationsSetupPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/setup/knowledge" element={
          <ProtectedRoute>
            <Layout pageTitle="Knowledge Setup">
              <KnowledgeSetupPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/setup/stakeholders" element={
          <ProtectedRoute>
            <Layout pageTitle="Stakeholders Setup">
              <StakeholdersSetupPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transitions" element={
          <ProtectedRoute>
            <Layout pageTitle="Transitions">
              <TransitionsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transitions/:id" element={
          <ProtectedRoute>
            <Layout pageTitle="Transition Details">
              <EnhancedTransitionDetailPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transitions/:id/ai-planning" element={
          <ProtectedRoute>
            <Layout pageTitle="AI Planning Wizard">
              <AIPlanningPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/enhanced-transitions/:id" element={
          <ProtectedRoute>
            <Layout pageTitle="Enhanced Transition Details">
              <EnhancedTransitionDetailPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transitions/:transitionId/users" element={
          <ProtectedRoute>
            <Layout pageTitle="Transition Users">
              <TransitionUserPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/business-operations" element={
          <ProtectedRoute>
            <Layout pageTitle="Business Operations">
              <BusinessOperationsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/business-operations/:id" element={
          <ProtectedRoute>
            <Layout pageTitle="Business Operation Details">
              <BusinessOperationDetailPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/business-operations/:id/edit" element={
          <ProtectedRoute>
            <Layout pageTitle="Edit Business Operation">
              <EditBusinessOperationPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/contracts/:id" element={
          <ProtectedRoute>
            <Layout pageTitle="Contract Details">
              <ContractDetailPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/executive" element={
          <ProtectedRoute>
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
          </ProtectedRoute>
        } />
        <Route path="/business-operations/products-programs/*" element={
          <ProtectedRoute>
            <Layout pageTitle="Products & Programs">
              <ProductsProgramsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge/*" element={
          <ProtectedRoute>
            <Layout pageTitle="Knowledge">
              <KnowledgeManagementPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tasks" element={
          <ProtectedRoute>
            <Layout pageTitle="Tasks & Milestones">
              <TasksAndMilestonesPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transitions/:id/tasks-milestones" element={
          <ProtectedRoute>
            <Layout pageTitle="Tasks & Milestones">
              <TasksAndMilestonesPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/artifacts" element={
          <ProtectedRoute>
            <Layout pageTitle="Artifact Vault">
              <div className="p-8">
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold mb-4">Artifact Vault</h2>
                  <p className="text-muted-foreground">This section will contain artifact storage and management features.</p>
                </div>
              </div>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute>
            <Layout pageTitle="Security & Access">
              <UserManagementPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/security/roles-matrix" element={
          <ProtectedRoute>
            <Layout pageTitle="Roles Capability Matrix">
              <RolesMatrixPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/security/ai-planning-config" element={
          <ProtectedRoute>
            <Layout pageTitle="AI Planning Configuration">
              <AIPlanningConfigPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout pageTitle="My Profile">
              <UserProfilePage />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App
