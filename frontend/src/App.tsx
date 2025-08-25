import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectHubPage } from './pages/ProjectHubPage';
import { BusinessOperationsPage } from './pages/BusinessOperationsPage';
import { BusinessOperationDetailPage } from './pages/BusinessOperationDetailPage';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { TransitionUserPage } from './pages/TransitionUserPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Layout pageTitle="Dashboard">
            <DashboardPage />
          </Layout>
        } />
        <Route path="/transitions" element={
          <Layout pageTitle="Transitions">
            <DashboardPage />
          </Layout>
        } />
        <Route path="/transitions/:id" element={
          <Layout pageTitle="Transition Details">
            <ProjectHubPage />
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
            <div className="p-8">
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold mb-4">Tasks & Milestones</h2>
                <p className="text-muted-foreground">This section will contain task and milestone management features.</p>
              </div>
            </div>
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
      </Routes>
    </Router>
  )
}

export default App