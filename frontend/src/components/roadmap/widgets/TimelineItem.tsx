import { useState } from "react";
import { CheckCircle2Icon, ClockIcon, CircleIcon, ChevronDownIcon } from "lucide-react";

interface TimelineItemProps {
  title: string;
  description: string;
  timestamp: Date | string;
  status: 'completed' | 'in-progress' | 'pending';
  author?: string;
  expandable?: boolean;
  onExpand?: () => void;
  isLast?: boolean;
}

export function TimelineItem({
  title,
  description,
  timestamp,
  status,
  author,
  expandable = false,
  onExpand,
  isLast = false,
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
      onExpand?.();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2Icon className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <ClockIcon className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <CircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusDotColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-400';
    }
  };

  const formatTimestamp = (ts: Date | string) => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div
          className={`w-2 h-2 rounded-full ${getStatusDotColor()} ${
            status === 'in-progress' ? 'animate-pulse' : ''
          }`}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-2 min-h-[40px]" />}
      </div>
      <div
        className={`flex-1 pb-6 ${
          expandable ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded' : ''
        } transition-colors`}
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            {getStatusIcon()}
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(timestamp)}
          </span>
          {expandable && (
            <ChevronDownIcon
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
        <p
          className={`text-sm text-muted-foreground mt-1 ${
            expandable && !isExpanded ? 'line-clamp-2' : ''
          }`}
        >
          {description}
        </p>
        {author && (
          <p className="text-xs text-muted-foreground mt-1">by {author}</p>
        )}
      </div>
    </div>
  );
}

interface TimelineProps {
  items: Array<{
    title: string;
    description: string;
    timestamp: Date | string;
    status: 'completed' | 'in-progress' | 'pending';
    author?: string;
    expandable?: boolean;
    onExpand?: () => void;
  }>;
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <TimelineItem
          key={index}
          {...item}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  );
}
