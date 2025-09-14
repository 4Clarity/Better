import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface TransitionFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sourceFilter?: string;
  onSourceFilterChange?: (value: string) => void;
  showSourceFilter?: boolean;
}

export function TransitionFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  showSourceFilter = false,
}: TransitionFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search transitions by name, description, or business operation..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="NOT_STARTED">Not Started</SelectItem>
          <SelectItem value="ON_TRACK">On Track</SelectItem>
          <SelectItem value="AT_RISK">At Risk</SelectItem>
          <SelectItem value="BLOCKED">Blocked</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
        </SelectContent>
      </Select>

      {showSourceFilter && sourceFilter !== undefined && onSourceFilterChange && (
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="STRATEGIC">Strategic</SelectItem>
            <SelectItem value="CONTRACTUAL">Contractual</SelectItem>
            <SelectItem value="PERSONNEL">Personnel</SelectItem>
            <SelectItem value="COMMUNICATION">Communication</SelectItem>
            <SelectItem value="CHANGE_REQUEST">Change Request</SelectItem>
            <SelectItem value="ENHANCEMENT">Enhancement</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}