import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { LevelIndicator, TransitionLevel } from "./LevelIndicator";

interface TransitionCardProps {
  transition: {
    id: string;
    name?: string;
    description?: string;
    startDate: string;
    endDate: string;
    duration: string;
    status: 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'BLOCKED' | 'COMPLETED';
    keyPersonnel?: string;
    transitionLevel?: TransitionLevel;
    contract?: {
      businessOperation?: {
        name: string;
      };
    };
  };
  linkPath: string;
}

export function TransitionCard({ transition, linkPath }: TransitionCardProps) {
  const getStatusColor = (status: TransitionCardProps['transition']['status']) => {
    const colors = {
      'NOT_STARTED': 'bg-gray-100 text-gray-800',
      'ON_TRACK': 'bg-green-100 text-green-800',
      'AT_RISK': 'bg-yellow-100 text-yellow-800',
      'BLOCKED': 'bg-red-100 text-red-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">
                <Link
                  to={linkPath}
                  className="text-primary hover:underline"
                >
                  {transition.name || 'Unnamed Transition'}
                </Link>
              </CardTitle>
              {transition.transitionLevel && (
                <LevelIndicator level={transition.transitionLevel} />
              )}
            </div>
            {transition.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {transition.description}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(transition.status)}>
            {transition.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Business Operation</div>
              <div className="text-muted-foreground">
                {transition.contract?.businessOperation?.name || 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Start Date</div>
              <div className="text-muted-foreground">
                {new Date(transition.startDate).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">End Date</div>
              <div className="text-muted-foreground">
                {new Date(transition.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Duration</div>
              <div className="text-muted-foreground">
                {transition.duration.replace('_', ' ').toLowerCase()}
              </div>
            </div>
          </div>
        </div>
        {transition.keyPersonnel && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-sm">
              <span className="font-medium">Key Personnel: </span>
              <span className="text-muted-foreground">{transition.keyPersonnel}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}