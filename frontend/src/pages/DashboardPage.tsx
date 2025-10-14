import { useState, useEffect } from "react";
import { authApi, AuthUser } from "@/services/authApi";
import { GovernmentPMDashboard } from "@/components/roadmap/personas/GovernmentPMDashboard";
import { OutgoingContractorDashboard } from "@/components/roadmap/personas/OutgoingContractorDashboard";
import { IncomingContractorDashboard } from "@/components/roadmap/personas/IncomingContractorDashboard";

export function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getCurrentUser();
      setUser(response.data);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user information');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (): string => {
    if (!user || !user.roles || user.roles.length === 0) {
      return 'unknown';
    }

    // Check for specific roles (case-insensitive)
    const roles = user.roles.map(r => r.toLowerCase());

    if (roles.includes('government_program_manager')) {
      return 'government_pm';
    }
    if (roles.includes('outgoing_contractor')) {
      return 'outgoing_contractor';
    }
    if (roles.includes('incoming_contractor')) {
      return 'incoming_contractor';
    }

    // Default to first role if no specific match
    return roles[0];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  const role = getUserRole();

  switch (role) {
    case 'government_pm':
      return <GovernmentPMDashboard />;
    case 'outgoing_contractor':
      return <OutgoingContractorDashboard />;
    case 'incoming_contractor':
      return <IncomingContractorDashboard />;
    default:
      // Default dashboard for users without specific roles
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Welcome to the Transition Intelligence Platform</h2>
              <p className="mb-4">
                You are logged in as <strong>{user?.person?.displayName || user?.username}</strong>
              </p>
              <p className="text-sm mb-2">Your current roles: {user?.roles.join(', ')}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Role-Specific Dashboards</h3>
              <p className="text-muted-foreground mb-4">
                To access a persona-specific dashboard, please log in with one of the following accounts:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                  <h4 className="font-semibold text-purple-900">Government Program Manager</h4>
                  <p className="text-sm text-purple-800">Username: <code className="bg-purple-100 px-2 py-0.5 rounded">Garry.Grove@usdoj.gov</code></p>
                  <p className="text-sm text-purple-800">Password: <code className="bg-purple-100 px-2 py-0.5 rounded">garygrove</code></p>
                </div>

                <div className="border-l-4 border-pink-500 pl-4 py-2 bg-pink-50">
                  <h4 className="font-semibold text-pink-900">Outgoing Contractor</h4>
                  <p className="text-sm text-pink-800">Username: <code className="bg-pink-100 px-2 py-0.5 rounded">Henry.Hou@outbound.com</code></p>
                  <p className="text-sm text-pink-800">Password: <code className="bg-pink-100 px-2 py-0.5 rounded">henryhou</code></p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <h4 className="font-semibold text-blue-900">Incoming Contractor</h4>
                  <p className="text-sm text-blue-800">Username: <code className="bg-blue-100 px-2 py-0.5 rounded">Ian.Illum@inbound.com</code></p>
                  <p className="text-sm text-blue-800">Password: <code className="bg-blue-100 px-2 py-0.5 rounded">ianillum</code></p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Logout from the current session to access these accounts.
              </p>
            </div>
          </div>
        </div>
      );
  }
}
