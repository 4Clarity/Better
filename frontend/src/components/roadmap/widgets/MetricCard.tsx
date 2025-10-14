import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

interface MetricCardProps {
  value: string | number;
  label: string;
  gradient?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  animate?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  value,
  label,
  gradient = 'from-purple-500 to-blue-500',
  trend,
  animate = false,
  onClick,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;

    const iconClasses = "w-4 h-4";
    switch (trend.direction) {
      case 'up':
        return <ArrowUpIcon className={`${iconClasses} text-green-600`} />;
      case 'down':
        return <ArrowDownIcon className={`${iconClasses} text-red-600`} />;
      case 'stable':
        return <MinusIcon className={`${iconClasses} text-gray-600`} />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-lg p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <div className={`text-4xl font-bold mb-2 ${animate ? 'animate-pulse' : ''}`}>
          {value}
        </div>
        <div className="text-sm opacity-90 font-medium mb-2">{label}</div>
        {trend && (
          <div className="flex items-center gap-1 text-sm bg-white/20 rounded px-2 py-1 w-fit">
            {getTrendIcon()}
            <span className="font-semibold">{trend.percentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
