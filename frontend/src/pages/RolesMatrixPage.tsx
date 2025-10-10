/**
 * RolesMatrixPage
 * Page wrapper for the Roles Capability Configuration Matrix component
 * Story: 0.3.1 - Role-Based UI Implementation
 */

import { RolesCapabilityMatrix } from '../components/UserManagement/RolesCapabilityMatrix';

export function RolesMatrixPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Roles Capability Matrix
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and understand permission levels for each system role across all features
        </p>
      </div>

      {/* Matrix Component */}
      <RolesCapabilityMatrix />
    </div>
  );
}
