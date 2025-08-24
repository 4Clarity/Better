import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectHubPage } from './pages/ProjectHubPage';
import { BusinessOperationsPage } from './pages/BusinessOperationsPage';
import { BusinessOperationDetailPage } from './pages/BusinessOperationDetailPage';
import { ContractDetailPage } from './pages/ContractDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transitions/:id" element={<ProjectHubPage />} />
        <Route path="/business-operations" element={<BusinessOperationsPage />} />
        <Route path="/business-operations/:id" element={<BusinessOperationDetailPage />} />
        <Route path="/contracts/:id" element={<ContractDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App