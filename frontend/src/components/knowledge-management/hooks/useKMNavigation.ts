import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { NavigationItem, KMPermissions } from '../types';

/**
 * Custom hook for Knowledge Management navigation logic
 * Handles role-based navigation filtering and active state management
 *
 * @param permissions - User's KM permissions object
 * @returns Filtered navigation items and helper functions
 */
export function useKMNavigation(permissions?: KMPermissions) {
  const location = useLocation();

  const allNavigationItems: NavigationItem[] = [
    {
      name: 'Weekly Curation',
      path: '/knowledge/weekly-curation',
      requiresPermission: ['canViewWeeklyCuration']
    },
    {
      name: 'Product Documents',
      path: '/knowledge/document-upload',
      requiresPermission: ['canUploadDocuments']
    },
    {
      name: 'Communication Files',
      path: '/knowledge/communication-files',
      requiresPermission: ['canViewCommunications']
    },
    {
      name: 'Facts Curation',
      path: '/knowledge/facts-curation',
      requiresPermission: ['canCurateFacts']
    },
    {
      name: 'Approval Queue',
      path: '/knowledge/approval-queue',
      requiresPermission: ['canApprove']
    },
    {
      name: 'Knowledge Search',
      path: '/knowledge/knowledge-search',
      requiresPermission: ['canSearch']
    },
    {
      name: 'Configuration',
      path: '/knowledge/configuration',
      requiresPermission: ['canConfigure']
    },
  ];

  const visibleNavigationItems = useMemo(() => {
    if (!permissions) {
      // If no permissions provided, show all items (development mode)
      return allNavigationItems;
    }

    return allNavigationItems.filter(item => {
      if (!item.requiresPermission) return true;

      return item.requiresPermission.some(permission =>
        permissions[permission as keyof KMPermissions]
      );
    });
  }, [permissions]);

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  const getCurrentSection = () => {
    const currentItem = allNavigationItems.find(item =>
      isCurrentPath(item.path)
    );
    return currentItem?.name || 'Knowledge Management';
  };

  return {
    navigationItems: visibleNavigationItems,
    isCurrentPath,
    getCurrentSection,
    hasAccess: (section: string) => {
      const item = allNavigationItems.find(nav => nav.name === section);
      if (!item?.requiresPermission || !permissions) return true;

      return item.requiresPermission.some(permission =>
        permissions[permission as keyof KMPermissions]
      );
    }
  };
}