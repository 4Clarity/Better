import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { useKMNavigation } from '../hooks/useKMNavigation';
import { KMPermissions } from '../types';

interface KMLayoutProps {
  children: ReactNode;
  permissions?: KMPermissions;
}

export function KMLayout({ children, permissions }: KMLayoutProps) {
  const navigate = useNavigate();
  const { navigationItems, isCurrentPath } = useKMNavigation(permissions);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Operational Knowledge Platform</span>
        <span>/</span>
        <span className="text-foreground font-medium">Knowledge Curation Dashboard</span>
      </nav>

      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Knowledge Curation Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and curate organizational knowledge across different content types and workflows.
        </p>
      </div>

      {/* Navigation Tabs */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={isCurrentPath(item.path) ? "default" : "outline"}
              size="sm"
              onClick={() => navigate(item.path)}
              className="whitespace-nowrap"
              aria-current={isCurrentPath(item.path) ? 'page' : undefined}
            >
              {item.name}
            </Button>
          ))}
        </div>
        {navigationItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No Knowledge Management sections available for your role.
          </p>
        )}
      </Card>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {children}
      </div>
    </div>
  );
}