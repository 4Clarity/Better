import { useParams } from 'react-router-dom';
import { TransitionUserManagement } from '@/components/UserManagement/TransitionUserManagement';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TransitionUserPage() {
  const { transitionId } = useParams<{ transitionId: string }>();
  
  if (!transitionId) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Invalid Transition</h2>
          <p className="text-gray-600 dark:text-gray-400">No transition ID provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" className="flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transitions</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Transition {transitionId.slice(-8).toUpperCase()}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage users and their access levels for this transition
          </p>
        </div>
      </div>

      {/* Transition User Management Component */}
      <TransitionUserManagement 
        transitionId={transitionId}
        title="Transition Team Members"
      />
    </div>
  );
}