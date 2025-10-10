/**
 * RolesCapabilityMatrix Component
 * Displays comprehensive role capability configuration matrix
 * Story: 0.3.1 - Role-Based UI Implementation
 */

import { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface RolePermission {
  [roleName: string]: 'full' | 'limited' | 'read_only' | 'no_access' | 'conditional';
}

interface MatrixFeature {
  name: string;
  permissions: RolePermission;
}

interface MatrixSection {
  name: string;
  features: MatrixFeature[];
}

interface RoleCapabilityMatrix {
  sections: MatrixSection[];
}

const ALL_ROLES = [
  'Admin',
  'Gov Program Director',
  'Program Manager',
  'Departing Contractor',
  'Incoming Contractor',
  'Security Officer',
  'Observer',
  'Operational Support',
];

const PERMISSION_ICONS: Record<string, string> = {
  full: '✓',
  limited: '⚠️',
  read_only: '👁️',
  no_access: '⛔',
  conditional: '🔐',
};

const PERMISSION_COLORS: Record<string, string> = {
  full: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  limited: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  read_only: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  no_access: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  conditional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const PERMISSION_LABELS: Record<string, string> = {
  full: 'Full Access',
  limited: 'Limited',
  read_only: 'Read Only',
  no_access: 'No Access',
  conditional: 'Conditional',
};

export function RolesCapabilityMatrix() {
  const [matrix, setMatrix] = useState<RoleCapabilityMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const permissions = usePermissions();

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/security/roles/matrix', {
        headers: {
          'x-auth-bypass': 'true',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load role capability matrix');
      }

      const data = await response.json();
      setMatrix(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matrix');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!matrix) return;

    const csvRows = [];

    // Header row
    csvRows.push(['Section', 'Feature', ...ALL_ROLES].join(','));

    // Data rows
    matrix.sections.forEach((section) => {
      section.features.forEach((feature) => {
        const row = [
          section.name,
          feature.name,
          ...ALL_ROLES.map((role) => PERMISSION_LABELS[feature.permissions[role]] || 'N/A'),
        ];
        csvRows.push(row.join(','));
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `role-capability-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredMatrix = (): MatrixSection[] => {
    if (!matrix) return [];

    let filtered = matrix.sections;

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter((section) => section.name === selectedSection);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered
        .map((section) => ({
          ...section,
          features: section.features.filter((feature) =>
            feature.name.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((section) => section.features.length > 0);
    }

    return filtered;
  };

  const filteredMatrix = getFilteredMatrix();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Roles Capability Configuration Matrix
          </h3>
          {matrix && (
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Export CSV
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>

          {/* Section Filter */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Sections</option>
            {matrix?.sections.map((section) => (
              <option key={section.name} value={section.name}>
                {section.name}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Roles</option>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Legend */}
        {!isLoading && matrix && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Legend:
            </h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(PERMISSION_ICONS).map(([key, icon]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {PERMISSION_LABELS[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matrix Table */}
        {!isLoading && filteredMatrix.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600">
                    Section / Feature
                  </th>
                  {ALL_ROLES.filter((role) => selectedRole === 'all' || selectedRole === role).map(
                    (role) => (
                      <th
                        key={role}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600"
                      >
                        <div className="whitespace-nowrap">{role}</div>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((section) => (
                  <>
                    {/* Section Header */}
                    <tr key={`section-${section.name}`} className="bg-gray-50 dark:bg-gray-800">
                      <td
                        colSpan={
                          selectedRole === 'all' ? ALL_ROLES.length + 1 : 2
                        }
                        className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                      >
                        {section.name}
                      </td>
                    </tr>

                    {/* Features */}
                    {section.features.map((feature) => (
                      <tr
                        key={`${section.name}-${feature.name}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                          {feature.name}
                        </td>
                        {ALL_ROLES.filter(
                          (role) => selectedRole === 'all' || selectedRole === role
                        ).map((role) => {
                          const permission = feature.permissions[role] || 'no_access';
                          return (
                            <td
                              key={role}
                              className="px-3 py-3 text-center border-b border-gray-200 dark:border-gray-700"
                            >
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${PERMISSION_COLORS[permission]}`}
                                title={PERMISSION_LABELS[permission]}
                              >
                                {PERMISSION_ICONS[permission]}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredMatrix.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No features match your filters</p>
          </div>
        )}

        {/* Info Note */}
        {!isLoading && matrix && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              ℹ️ This matrix shows the permission level each role has for system features.
              Conditional access may depend on additional factors like clearance level or PIV
              status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
