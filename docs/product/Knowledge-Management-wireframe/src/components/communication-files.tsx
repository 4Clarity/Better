import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { MessageSquare, Mail, Upload, Plus, Calendar, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface Communication {
  id: string;
  title: string;
  type: 'email' | 'chat' | 'meeting' | 'call';
  date: string;
  participants: string[];
  content: string;
  source: string;
  status: 'pending' | 'processed' | 'extracted';
}

export function CommunicationFiles() {
  const [communications, setCommunications] = useState<Communication[]>([
    {
      id: '1',
      title: 'Client Requirements Discussion',
      type: 'email',
      date: '2024-01-16',
      participants: ['john.doe@company.com', 'sarah.smith@client.com'],
      content: 'Discussion about the new product features and specifications. Client mentioned they need better performance metrics and enhanced security features.',
      source: 'Email Thread',
      status: 'processed'
    },
    {
      id: '2',
      title: 'Product Review Meeting',
      type: 'meeting',
      date: '2024-01-15',
      participants: ['Product Team', 'Engineering Team'],
      content: 'Review of current product status and upcoming feature releases. Discussed technical constraints and user feedback.',
      source: 'Meeting Notes',
      status: 'extracted'
    },
    {
      id: '3',
      title: 'Support Ticket Analysis',
      type: 'chat',
      date: '2024-01-14',
      participants: ['Support Team', 'Customer'],
      content: 'Customer reported issues with the authentication system. Multiple users experiencing similar problems.',
      source: 'Support Chat',
      status: 'pending'
    }
  ]);

  const [newComm, setNewComm] = useState({
    title: '',
    type: 'email' as Communication['type'],
    content: '',
    participants: '',
    source: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const addCommunication = () => {
    if (!newComm.title || !newComm.content) return;

    const communication: Communication = {
      id: Date.now().toString(),
      title: newComm.title,
      type: newComm.type,
      date: new Date().toISOString().split('T')[0],
      participants: newComm.participants.split(',').map(p => p.trim()).filter(p => p),
      content: newComm.content,
      source: newComm.source || 'Manual Entry',
      status: 'pending'
    };

    setCommunications(prev => [communication, ...prev]);
    setNewComm({ title: '', type: 'email', content: '', participants: '', source: '' });
    setIsDialogOpen(false);
  };

  const getTypeIcon = (type: Communication['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'call':
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: Communication['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Analysis</Badge>;
      case 'processed':
        return <Badge variant="outline">Processed</Badge>;
      case 'extracted':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Facts Extracted</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTypeColor = (type: Communication['type']) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'chat':
        return 'bg-green-100 text-green-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'call':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Communication Files</h2>
            <p className="text-muted-foreground">
              Add and manage communication records for fact extraction and knowledge building.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Communication Record</DialogTitle>
                <DialogDescription>
                  Add a new communication file for knowledge extraction and analysis.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Communication title..."
                      value={newComm.title}
                      onChange={(e) => setNewComm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={newComm.type}
                      onChange={(e) => setNewComm(prev => ({ ...prev, type: e.target.value as Communication['type'] }))}
                    >
                      <option value="email">Email</option>
                      <option value="chat">Chat</option>
                      <option value="meeting">Meeting</option>
                      <option value="call">Call</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="participants">Participants (comma-separated)</Label>
                  <Input
                    id="participants"
                    placeholder="john@company.com, sarah@client.com"
                    value={newComm.participants}
                    onChange={(e) => setNewComm(prev => ({ ...prev, participants: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="Email thread, meeting notes, etc."
                    value={newComm.source}
                    onChange={(e) => setNewComm(prev => ({ ...prev, source: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter the communication content here..."
                    className="min-h-32"
                    value={newComm.content}
                    onChange={(e) => setNewComm(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addCommunication}>
                    Add Communication
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Communications List */}
        <div className="space-y-4">
          {communications.map((comm) => (
            <Card key={comm.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(comm.type)}
                      <CardTitle className="text-lg">{comm.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <Badge variant="outline" className={getTypeColor(comm.type)}>
                        {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                      </Badge>
                      <span>{comm.date}</span>
                      <span>{comm.source}</span>
                    </div>
                  </div>
                  {getStatusBadge(comm.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Participants:</p>
                    <div className="flex flex-wrap gap-1">
                      {comm.participants.map((participant, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {participant}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Content:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {comm.content}
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    {comm.status === 'pending' && (
                      <Button variant="outline" size="sm">
                        Process for Facts
                      </Button>
                    )}
                    {comm.status === 'processed' && (
                      <Button variant="outline" size="sm">
                        Extract Facts
                      </Button>
                    )}
                    {comm.status === 'extracted' && (
                      <Button variant="outline" size="sm">
                        View Facts
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {communications.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No communication files added yet.</p>
                <p className="text-sm text-muted-foreground">Add your first communication to start extracting knowledge.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}