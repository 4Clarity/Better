import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AIPlanningWizard } from '../components/transitions/ai-planning/AIPlanningWizard';
import { TransitionType } from '../types/ai-planning';
import { API_BASE_URL } from '../services/api';

export function AIPlanningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transitionType, setTransitionType] = useState<TransitionType>('Contract');
  const [loading, setLoading] = useState(true);

  // Fetch transition details to determine type
  useEffect(() => {
    const fetchTransition = async () => {
      if (!id) return;

      try {
        // Try enhanced transitions first
        let response = await fetch(`${API_BASE_URL}/enhanced-transitions/${id}`);
        if (!response.ok) {
          // Fall back to regular transitions
          response = await fetch(`${API_BASE_URL}/transitions/${id}`);
        }

        if (response.ok) {
          const transition = await response.json();

          // Map transitionLevel to TransitionType for AI Planning
          if (transition.transitionLevel) {
            const levelToTypeMap: Record<string, TransitionType> = {
              'MAJOR': 'Contract',
              'PERSONNEL': 'Personnel',
              'OPERATIONAL': 'System',
            };
            setTransitionType(levelToTypeMap[transition.transitionLevel] || 'Contract');
          } else {
            // Default to Contract type if no transitionLevel
            setTransitionType('Contract');
          }
        }
      } catch (error) {
        console.error('Failed to fetch transition:', error);
        // Default to Contract type on error
        setTransitionType('Contract');
      } finally {
        setLoading(false);
      }
    };

    fetchTransition();
  }, [id]);

  const handleComplete = (result: {
    sessionId: string;
    tasksCreated: number;
    milestonesCreated: number;
  }) => {
    // Navigate back to enhanced transition detail page
    navigate(`/enhanced-transitions/${id}`, {
      state: {
        message: `Successfully created ${result.tasksCreated} tasks and ${result.milestonesCreated} milestones!`,
      },
    });
  };

  const handleCancel = () => {
    // Navigate back to enhanced transition detail page
    navigate(`/enhanced-transitions/${id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading AI Planning Wizard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <p className="text-red-600">Invalid transition ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <AIPlanningWizard
        transitionId={id}
        transitionType={transitionType}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
