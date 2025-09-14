import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

interface OperationalChangeDialogProps {
  contractId: string;
  onTransitionCreated: (transition: any) => void;
  userRole: string;
}

export function OperationalChangeDialog({ contractId, onTransitionCreated, userRole }: OperationalChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    duration: 'THIRTY_DAYS' as const,
    keyPersonnel: '',
    status: 'NOT_STARTED' as const,
    requiresContinuousService: false,
    transitionSource: 'ENHANCEMENT' as const,
    createdBy: 'default-user-id', // TODO: Replace with actual user ID
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enhanced-transitions/operational', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          ...formData,
          startDate: formData.startDate.split('T')[0],
          endDate: formData.endDate.split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create operational change');
      }

      const transition = await response.json();
      onTransitionCreated(transition);
      setOpen(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        duration: 'THIRTY_DAYS',
        keyPersonnel: '',
        status: 'NOT_STARTED',
        requiresContinuousService: false,
        transitionSource: 'ENHANCEMENT',
        createdBy: 'default-user-id',
      });
    } catch (err) {
      console.error('Failed to create operational change:', err);
      setError(err instanceof Error ? err.message : 'Failed to create operational change');
    } finally {
      setLoading(false);
    }
  };

  // Operational changes can be created by more user types
  const canCreate = ['program_manager', 'director', 'admin', 'team_lead', 'analyst'].includes(userRole);

  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          New Operational Change
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Create Operational Change
            <Badge className="bg-green-100 text-green-800">Process Level</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Operational changes include process improvements, enhancement requests, and communication-driven modifications.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Change Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Update Reporting Process"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the operational change, its impact, and implementation plan..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Expected Duration</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                  <SelectItem value="THIRTY_DAYS">30 Days</SelectItem>
                  <SelectItem value="FORTY_FIVE_DAYS">45 Days</SelectItem>
                  <SelectItem value="SIXTY_DAYS">60 Days</SelectItem>
                  <SelectItem value="NINETY_DAYS">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transitionSource">Change Source *</Label>
              <Select value={formData.transitionSource} onValueChange={(value) => setFormData({ ...formData, transitionSource: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENHANCEMENT">Enhancement Request</SelectItem>
                  <SelectItem value="COMMUNICATION">User Feedback</SelectItem>
                  <SelectItem value="CHANGE_REQUEST">Formal Change Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="keyPersonnel">Key Personnel</Label>
            <Input
              id="keyPersonnel"
              value={formData.keyPersonnel}
              onChange={(e) => setFormData({ ...formData, keyPersonnel: e.target.value })}
              placeholder="Team members responsible for implementing the change..."
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Operational Change'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}