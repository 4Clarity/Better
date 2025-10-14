import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RoadmapWidgetProps {
  title: string;
  icon?: ReactNode;
  badge?: number | string;
  variant?: 'standard' | 'highlighted' | 'compact';
  loading?: boolean;
  onHeaderClick?: () => void;
  children: ReactNode;
}

export function RoadmapWidget({
  title,
  icon,
  badge,
  variant = 'standard',
  loading = false,
  onHeaderClick,
  children,
}: RoadmapWidgetProps) {
  const variantClasses = {
    standard: 'bg-white',
    highlighted: 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200',
    compact: 'bg-white p-3',
  };

  if (loading) {
    return (
      <Card className={variantClasses[variant]}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${variantClasses[variant]} transition-shadow hover:shadow-md`}>
      <CardHeader
        className={onHeaderClick ? 'cursor-pointer' : ''}
        onClick={onHeaderClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                {icon}
              </div>
            )}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {badge !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className={variant === 'compact' ? 'pt-0' : ''}>
        {children}
      </CardContent>
    </Card>
  );
}
