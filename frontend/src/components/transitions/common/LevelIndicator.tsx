import { Badge } from "@/components/ui/badge";
import { Building, Users, Settings } from "lucide-react";

export type TransitionLevel = 'MAJOR' | 'PERSONNEL' | 'OPERATIONAL';

interface LevelIndicatorProps {
  level: TransitionLevel;
  className?: string;
}

export function LevelIndicator({ level, className }: LevelIndicatorProps) {
  const config = {
    MAJOR: {
      label: 'Major Transition',
      icon: Building,
      className: 'bg-red-100 text-red-800 border-red-200',
    },
    PERSONNEL: {
      label: 'Personnel Transition',
      icon: Users,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    OPERATIONAL: {
      label: 'Operational Change',
      icon: Settings,
      className: 'bg-green-100 text-green-800 border-green-200',
    },
  };

  const { label, icon: Icon, className: levelClassName } = config[level];

  return (
    <Badge className={`${levelClassName} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}