import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

export function WeeklyCuration() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Weekly Curation</h2>
        <Button>Start New Curation</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">This Week</h3>
              <Badge variant="default">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Current week's knowledge curation activities and pending items.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Documents reviewed:</span>
                <span className="font-medium">12/20</span>
              </div>
              <div className="flex justify-between">
                <span>Facts extracted:</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span>Pending approval:</span>
                <span className="font-medium">3</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Last Week</h3>
              <Badge variant="secondary">Completed</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Previous week's completed curation summary.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Documents processed:</span>
                <span className="font-medium">18/18</span>
              </div>
              <div className="flex justify-between">
                <span>Facts added:</span>
                <span className="font-medium">15</span>
              </div>
              <div className="flex justify-between">
                <span>Quality score:</span>
                <span className="font-medium">94%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Upcoming</h3>
              <Badge variant="outline">Scheduled</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Next week's planned curation activities.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Scheduled docs:</span>
                <span className="font-medium">25</span>
              </div>
              <div className="flex justify-between">
                <span>Priority items:</span>
                <span className="font-medium">7</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-assigned:</span>
                <span className="font-medium">18</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}