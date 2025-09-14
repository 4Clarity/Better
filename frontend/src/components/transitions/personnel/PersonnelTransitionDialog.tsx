import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface PersonnelTransitionDialogProps {
  contractId: string;
  onTransitionCreated: (transition: any) => void;
  userRole: string;
}

export function PersonnelTransitionDialog({ contractId, onTransitionCreated, userRole }: PersonnelTransitionDialogProps) {
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
    requiresContinuousService: true,
    transitionSource: 'PERSONNEL' as const,
    createdBy: 'default-user-id', // TODO: Replace with actual user ID
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enhanced-transitions/personnel', {
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
        throw new Error('Failed to create personnel transition');
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
        requiresContinuousService: true,
        transitionSource: 'PERSONNEL',
        createdBy: 'default-user-id',
      });
    } catch (err) {
      console.error('Failed to create personnel transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to create personnel transition');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = userRole === 'program_manager' || userRole === 'director' || userRole === 'admin';

  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          New Personnel Transition
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Personnel Transition
            <Badge className="bg-blue-100 text-blue-800">Team Level</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Personnel transitions involve team member changes, role adjustments, and staffing modifications.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Transition Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., John Smith Role Transition"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details about the personnel change, roles affected, and transition plan..."
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
              <Label htmlFor="duration">Duration</Label>
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
              <Label htmlFor="transitionSource">Transition Type</Label>
              <Select value={formData.transitionSource} onValueChange={(value) => setFormData({ ...formData, transitionSource: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONNEL">Personnel Change</SelectItem>
                  <SelectItem value="STRATEGIC">Strategic Staffing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="keyPersonnel">Affected Personnel *</Label>
            <Input
              id="keyPersonnel"
              value={formData.keyPersonnel}
              onChange={(e) => setFormData({ ...formData, keyPersonnel: e.target.value })}
              placeholder="Names of personnel involved in this transition..."
              required
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
              {loading ? 'Creating...' : 'Create Personnel Transition'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}