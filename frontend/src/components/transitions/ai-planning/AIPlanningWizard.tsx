/**
 * AIPlanningWizard Component
 * Multi-step wizard for AI-assisted transition planning
 * Story 1.4: AI-Assisted Transition Planning
 */

import React, { useState, useEffect } from 'react';
import {
  TransitionType,
  PlanningSession,
  PlanningResponse,
  TaskRecommendation,
  MilestoneRecommendation,
  WizardStep,
} from '../../../types/ai-planning';
import {
  startPlanningSession,
  submitPlanningResponses,
  generateRecommendations,
  acceptRecommendations,
  rejectRecommendations,
  checkAIPlanningHealth,
} from '../../../services/aiPlanningApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { Alert, AlertDescription } from '../../ui/alert';
import { PlanningQuestionCard } from './PlanningQuestionCard';
import { RecommendationReviewPanel } from './RecommendationReviewPanel';
import {
  Bot,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from 'lucide-react';

interface AIPlanningWizardProps {
  transitionId: string;
  transitionType: TransitionType;
  onComplete: (result: {
    sessionId: string;
    tasksCreated: number;
    milestonesCreated: number;
  }) => void;
  onCancel: () => void;
}

export const AIPlanningWizard: React.FC<AIPlanningWizardProps> = ({
  transitionId,
  transitionType,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [session, setSession] = useState<PlanningSession | null>(null);
  const [responses, setResponses] = useState<Map<string, any>>(new Map());
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
  const [taskEdits, setTaskEdits] = useState<Map<string, Partial<TaskRecommendation>>>(new Map());
  const [milestoneEdits, setMilestoneEdits] = useState<Map<string, Partial<MilestoneRecommendation>>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  const steps: WizardStep[] = [
    {
      id: 1,
      title: 'Welcome',
      description: 'Introduction to AI-assisted planning',
      completed: currentStep > 0,
    },
    {
      id: 2,
      title: 'Questions',
      description: 'Answer questions about your transition',
      completed: currentStep > 1,
    },
    {
      id: 3,
      title: 'Review',
      description: 'Review AI-generated recommendations',
      completed: currentStep > 2,
    },
    {
      id: 4,
      title: 'Complete',
      description: 'Finalize your planning',
      completed: currentStep > 3,
    },
  ];

  // Check service health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkAIPlanningHealth();
        setServiceAvailable(health.pythonServiceAvailable);
        if (!health.pythonServiceAvailable) {
          setError(
            'AI Planning service is currently unavailable. You can use manual planning instead.'
          );
        }
      } catch (err) {
        setServiceAvailable(false);
        setError('Unable to connect to AI Planning service. Using manual planning mode.');
      }
    };
    checkHealth();
  }, []);

  // Start planning session
  const handleStartSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await startPlanningSession(transitionId, transitionType);
      setSession(newSession);
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to start planning session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer to a question
  const handleAnswer = (questionId: string, answer: any) => {
    setResponses(new Map(responses.set(questionId, answer)));
  };

  // Submit responses and move to next step
  const handleSubmitResponses = async () => {
    if (!session) return;

    // Validate required questions
    const requiredQuestions = session.questions_asked.filter((q) => q.required);
    const unansweredRequired = requiredQuestions.filter((q) => !responses.has(q.question_id));

    if (unansweredRequired.length > 0) {
      setError('Please answer all required questions before continuing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const planningResponses: PlanningResponse[] = Array.from(responses.entries()).map(
        ([question_id, answer]) => ({
          question_id,
          answer,
          answered_at: new Date().toISOString(),
        })
      );

      const updatedSession = await submitPlanningResponses(session.session_id, planningResponses);
      setSession(updatedSession);

      // Generate recommendations
      const recommendations = await generateRecommendations(session.session_id);

      // Update session with recommendations
      setSession({
        ...updatedSession,
        tasks_generated: recommendations.tasks,
        milestones_generated: recommendations.milestones,
      });

      // Auto-select all recommendations
      setSelectedTasks(recommendations.tasks.map((_, idx) => `task-${idx}`));
      setSelectedMilestones(recommendations.milestones.map((_, idx) => `milestone-${idx}`));

      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle accept recommendations
  const handleAcceptRecommendations = async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      // Prepare edits
      const edits: Record<string, any> = {};
      taskEdits.forEach((edit, key) => {
        edits[key] = edit;
      });
      milestoneEdits.forEach((edit, key) => {
        edits[key] = edit;
      });

      const result = await acceptRecommendations(
        session.session_id,
        selectedTasks,
        selectedMilestones,
        edits
      );

      setCurrentStep(3);
      setTimeout(() => {
        onComplete({
          sessionId: session.session_id,
          tasksCreated: result.tasksCreated,
          milestonesCreated: result.milestonesCreated,
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reject recommendations
  const handleReject = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      await rejectRecommendations(session.session_id, 'User chose manual planning');
      onCancel();
    } catch (err: any) {
      setError(err.message || 'Failed to reject recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle task edit
  const handleTaskEdit = (index: number, updates: Partial<TaskRecommendation>) => {
    if (!session) return;
    const taskId = `task-${index}`;
    const updatedTasks = [...session.tasks_generated];
    updatedTasks[index] = { ...updatedTasks[index], ...updates };
    setSession({ ...session, tasks_generated: updatedTasks });
    setTaskEdits(new Map(taskEdits.set(taskId, updates)));
  };

  // Handle milestone edit
  const handleMilestoneEdit = (index: number, updates: Partial<MilestoneRecommendation>) => {
    if (!session) return;
    const milestoneId = `milestone-${index}`;
    const updatedMilestones = [...session.milestones_generated];
    updatedMilestones[index] = { ...updatedMilestones[index], ...updates };
    setSession({ ...session, milestones_generated: updatedMilestones });
    setMilestoneEdits(new Map(milestoneEdits.set(milestoneId, updates)));
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold mb-4">AI-Assisted Transition Planning</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Let our AI assistant help you create a comprehensive transition plan. I'll ask you some
              questions about your {transitionType.toLowerCase()} transition, then generate tailored
              tasks and milestones to guide you through the process.
            </p>
            {!serviceAvailable && (
              <Alert className="mb-6 max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  AI Planning service is currently unavailable. You can still use manual planning.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-center gap-4">
              <Button onClick={handleStartSession} disabled={isLoading || !serviceAvailable} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start AI Planning
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onCancel} size="lg">
                Use Manual Planning
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Tell us about your transition</h2>
              <p className="text-gray-600">
                Answer these questions to help us generate the best recommendations for your{' '}
                {transitionType.toLowerCase()} transition.
              </p>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {session?.questions_asked.map((question) => (
                <PlanningQuestionCard
                  key={question.question_id}
                  question={question}
                  value={responses.get(question.question_id)}
                  onAnswer={(answer) => handleAnswer(question.question_id, answer)}
                />
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Review Recommendations</h2>
              <p className="text-gray-600">
                Review the AI-generated tasks and milestones. Select the ones you want to create, or
                edit them to fit your needs.
              </p>
            </div>
            {session && (
              <RecommendationReviewPanel
                tasks={session.tasks_generated}
                milestones={session.milestones_generated}
                selectedTaskIds={selectedTasks}
                selectedMilestoneIds={selectedMilestones}
                onTaskSelectionChange={setSelectedTasks}
                onMilestoneSelectionChange={setSelectedMilestones}
                onTaskEdit={handleTaskEdit}
                onMilestoneEdit={handleMilestoneEdit}
              />
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-4">Planning Complete!</h2>
            <p className="text-gray-600 mb-6">
              Successfully created {selectedTasks.length} tasks and {selectedMilestones.length}{' '}
              milestones for your transition.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => onComplete({ sessionId: session?.session_id || '', tasksCreated: selectedTasks.length, milestonesCreated: selectedMilestones.length })}>
                View Transition
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              AI Planning Wizard
            </CardTitle>
            <CardDescription>Step {currentStep + 1} of {steps.length}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} className="mt-4" />
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {renderStepContent()}

        {currentStep > 0 && currentStep < 3 && (
          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={isLoading || currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep === 2 && (
                <Button variant="outline" onClick={handleReject} disabled={isLoading}>
                  Reject & Use Manual
                </Button>
              )}
              {currentStep === 1 && (
                <Button onClick={handleSubmitResponses} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Recommendations
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              {currentStep === 2 && (
                <Button onClick={handleAcceptRecommendations} disabled={isLoading || (selectedTasks.length === 0 && selectedMilestones.length === 0)}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Accept ({selectedTasks.length + selectedMilestones.length} items)
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
