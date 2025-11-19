import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Plus, Trash2, Save, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlanningQuestion {
  question_id: string;
  text: string;
  question_type: 'TEXT' | 'SELECT' | 'MULTI_SELECT' | 'NUMBER' | 'BOOLEAN';
  options?: string[];
  required: boolean;
  help_text?: string;
}

interface TaskTemplate {
  title: string;
  description: string;
  phase: string;
  owner: string;
  days_from_start: number;
  duration_days: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  tags: string[];
}

interface TransitionTypeConfig {
  type: string;
  displayName: string;
  questions: PlanningQuestion[];
  taskTemplates: TaskTemplate[];
}

const TRANSITION_TYPES = [
  { value: 'Contract', label: 'Contract Transition' },
  { value: 'Personnel', label: 'Personnel Transition' },
  { value: 'System', label: 'System Integration' },
  { value: 'DeveloperOnboarding', label: 'Developer Onboarding' },
  { value: 'Custom', label: 'Custom Transition' },
];

const QUESTION_TYPES = [
  { value: 'TEXT', label: 'Text Input' },
  { value: 'SELECT', label: 'Single Select' },
  { value: 'MULTI_SELECT', label: 'Multi Select' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes/No' },
];

export function AIPlanningConfigPage() {
  const [selectedType, setSelectedType] = useState<string>('DeveloperOnboarding');
  const [config, setConfig] = useState<TransitionTypeConfig>({
    type: 'DeveloperOnboarding',
    displayName: 'Developer Onboarding',
    questions: [],
    taskTemplates: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load default developer onboarding template
  useEffect(() => {
    if (selectedType === 'DeveloperOnboarding') {
      loadDeveloperOnboardingTemplate();
    }
  }, [selectedType]);

  const loadDeveloperOnboardingTemplate = () => {
    const defaultQuestions: PlanningQuestion[] = [
      {
        question_id: 'dev_role',
        text: 'What is the primary role of this developer?',
        question_type: 'SELECT',
        options: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'Mobile Developer'],
        required: true,
        help_text: 'This helps tailor the onboarding tasks to their specific focus area',
      },
      {
        question_id: 'experience_level',
        text: 'What is the experience level of the new developer?',
        question_type: 'SELECT',
        options: ['Junior (0-2 years)', 'Mid-Level (3-5 years)', 'Senior (5-10 years)', 'Staff/Principal (10+ years)'],
        required: true,
        help_text: 'Experience level affects the complexity and pace of onboarding tasks',
      },
      {
        question_id: 'tech_stack_familiarity',
        text: 'How familiar is the developer with your tech stack?',
        question_type: 'SELECT',
        options: ['Complete beginner', 'Some exposure', 'Moderately familiar', 'Very familiar', 'Expert'],
        required: true,
        help_text: 'This determines how much time to allocate for tech stack learning',
      },
      {
        question_id: 'onboarding_duration',
        text: 'How many days for the onboarding period?',
        question_type: 'NUMBER',
        required: true,
        help_text: 'Typically 90 days, but can be adjusted based on role complexity',
      },
      {
        question_id: 'needs_security_clearance',
        text: 'Does this role require security clearance processing?',
        question_type: 'BOOLEAN',
        required: true,
        help_text: 'Security clearance adds significant time to the onboarding timeline',
      },
    ];

    const defaultTasks: TaskTemplate[] = [
      {
        title: 'Receive and review Technical Onboarding Guide',
        description: 'Architecture Overview, Git Workflow, Stack documentation',
        phase: 'Pre-Boarding',
        owner: 'Manager',
        days_from_start: -5,
        duration_days: 5,
        priority: 'High',
        tags: ['documentation', 'preparation'],
      },
      {
        title: 'Confirm developer tool accounts and hardware provisioning',
        description: 'All necessary accounts (GitHub, Jira, Slack, etc.) and hardware ready',
        phase: 'Pre-Boarding',
        owner: 'IT / Manager',
        days_from_start: -3,
        duration_days: 3,
        priority: 'Critical',
        tags: ['access', 'hardware'],
      },
      {
        title: 'Set up local development environment - Time to First Commit',
        description: 'Successfully configure dev environment and make first commit',
        phase: 'Day 1',
        owner: 'Buddy',
        days_from_start: 0,
        duration_days: 1,
        priority: 'Critical',
        tags: ['setup', 'environment'],
      },
      {
        title: 'Complete mandatory security and compliance training',
        description: 'Security awareness, data handling, compliance module',
        phase: 'Day 1',
        owner: 'New Developer',
        days_from_start: 0,
        duration_days: 1,
        priority: 'Critical',
        tags: ['compliance', 'security'],
      },
      {
        title: 'Comprehensive codebase walkthrough',
        description: 'Architecture, data flow, key services, deployment process',
        phase: 'Week 1',
        owner: 'Tech Lead / Senior Dev',
        days_from_start: 1,
        duration_days: 5,
        priority: 'High',
        tags: ['knowledge-transfer', 'architecture'],
      },
      {
        title: 'Review Git strategy, PR process, and Coding Standards',
        description: 'Understand team workflows and contribution guidelines',
        phase: 'Week 1',
        owner: 'Buddy',
        days_from_start: 1,
        duration_days: 5,
        priority: 'High',
        tags: ['process', 'standards'],
      },
      {
        title: 'Complete first small feature/bug fix with PR',
        description: 'Navigate the full PR and code review process',
        phase: 'Week 1',
        owner: 'New Developer / Buddy',
        days_from_start: 3,
        duration_days: 5,
        priority: 'High',
        tags: ['hands-on', 'code-review'],
      },
      {
        title: 'Attend Product/Business deep dive session',
        description: 'Understand the "Why" and business context of the system',
        phase: 'Week 1',
        owner: 'Product Manager',
        days_from_start: 5,
        duration_days: 1,
        priority: 'Medium',
        tags: ['business-context', 'product'],
      },
      {
        title: 'Complete Guided Contribution (2-3 medium tickets)',
        description: 'Focus on a core service area with guidance',
        phase: 'Month 1 (30 Days)',
        owner: 'New Developer',
        days_from_start: 7,
        duration_days: 23,
        priority: 'High',
        tags: ['hands-on', 'contribution'],
      },
      {
        title: 'Learn key debugging and logging tools',
        description: 'Demonstrate proficiency with Splunk, DataDog, or similar',
        phase: 'Month 1 (30 Days)',
        owner: 'Buddy / New Developer',
        days_from_start: 15,
        duration_days: 15,
        priority: 'High',
        tags: ['tools', 'debugging'],
      },
      {
        title: '30-Day Review - Technical blockers and goals',
        description: 'Review progress, system comprehension, goal alignment',
        phase: 'Month 1 (30 Days)',
        owner: 'Manager',
        days_from_start: 30,
        duration_days: 1,
        priority: 'Critical',
        tags: ['review', 'feedback'],
      },
      {
        title: 'Take primary ownership of well-defined feature',
        description: 'Including design documentation and estimates',
        phase: 'Month 2 (60 Days)',
        owner: 'New Developer',
        days_from_start: 31,
        duration_days: 30,
        priority: 'High',
        tags: ['ownership', 'feature-development'],
      },
      {
        title: 'Conduct code reviews for peers',
        description: 'With mentor sign-off and supervision',
        phase: 'Month 2 (60 Days)',
        owner: 'New Developer / Mentor',
        days_from_start: 40,
        duration_days: 20,
        priority: 'Medium',
        tags: ['code-review', 'collaboration'],
      },
      {
        title: 'Shadow On-Call rotation for a week',
        description: 'Focus on triage and incident response flow',
        phase: 'Month 2 (60 Days)',
        owner: 'On-Call Team',
        days_from_start: 50,
        duration_days: 7,
        priority: 'High',
        tags: ['on-call', 'incident-response'],
      },
      {
        title: 'System Design/Architecture deep dive',
        description: 'Critical system component analysis',
        phase: 'Month 2 (60 Days)',
        owner: 'Tech Lead',
        days_from_start: 55,
        duration_days: 5,
        priority: 'High',
        tags: ['architecture', 'system-design'],
      },
      {
        title: 'Support Readiness - Join on-call rotation',
        description: 'Integrated into light/secondary on-call rotation',
        phase: 'Month 3 (90 Days)',
        owner: 'Manager / On-Call Team',
        days_from_start: 60,
        duration_days: 30,
        priority: 'High',
        tags: ['on-call', 'support'],
      },
      {
        title: 'Deliver independent project start to finish',
        description: 'Design, code, test, deploy to production',
        phase: 'Month 3 (90 Days)',
        owner: 'New Developer',
        days_from_start: 61,
        duration_days: 29,
        priority: 'Critical',
        tags: ['independent', 'end-to-end'],
      },
      {
        title: '90-Day Review - Impact and career development',
        description: 'Focus on independent impact and long-term plan',
        phase: 'Month 3 (90 Days)',
        owner: 'Manager',
        days_from_start: 90,
        duration_days: 1,
        priority: 'Critical',
        tags: ['review', 'career-development'],
      },
    ];

    setConfig({
      type: 'DeveloperOnboarding',
      displayName: 'Developer Onboarding',
      questions: defaultQuestions,
      taskTemplates: defaultTasks,
    });
  };

  const addQuestion = () => {
    const newQuestion: PlanningQuestion = {
      question_id: `question_${Date.now()}`,
      text: '',
      question_type: 'TEXT',
      required: false,
      help_text: '',
    };
    setConfig({
      ...config,
      questions: [...config.questions, newQuestion],
    });
  };

  const updateQuestion = (index: number, updates: Partial<PlanningQuestion>) => {
    const updatedQuestions = [...config.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setConfig({ ...config, questions: updatedQuestions });
  };

  const deleteQuestion = (index: number) => {
    setConfig({
      ...config,
      questions: config.questions.filter((_, i) => i !== index),
    });
  };

  const addTask = () => {
    const newTask: TaskTemplate = {
      title: '',
      description: '',
      phase: 'Day 1',
      owner: '',
      days_from_start: 0,
      duration_days: 1,
      priority: 'Medium',
      tags: [],
    };
    setConfig({
      ...config,
      taskTemplates: [...config.taskTemplates, newTask],
    });
  };

  const updateTask = (index: number, updates: Partial<TaskTemplate>) => {
    const updatedTasks = [...config.taskTemplates];
    updatedTasks[index] = { ...updatedTasks[index], ...updates };
    setConfig({ ...config, taskTemplates: updatedTasks });
  };

  const deleteTask = (index: number) => {
    setConfig({
      ...config,
      taskTemplates: config.taskTemplates.filter((_, i) => i !== index),
    });
  };

  const duplicateTask = (index: number) => {
    const taskToDuplicate = { ...config.taskTemplates[index] };
    taskToDuplicate.title = `${taskToDuplicate.title} (Copy)`;
    setConfig({
      ...config,
      taskTemplates: [...config.taskTemplates, taskToDuplicate],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // TODO: Implement actual API call to save configuration
      // For now, save to localStorage as a placeholder
      localStorage.setItem(`ai-planning-config-${selectedType}`, JSON.stringify(config));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">AI Planning Configuration</h1>
        </div>
        <p className="text-gray-600">
          Configure questions and task templates for AI-assisted transition planning
        </p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Transition Type Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transition Type</CardTitle>
          <CardDescription>Select the type of transition to configure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSITION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="questions">Questions ({config.questions.length})</TabsTrigger>
          <TabsTrigger value="tasks">Task Templates ({config.taskTemplates.length})</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planning Questions</CardTitle>
                  <CardDescription>
                    Define the questions asked during the AI planning wizard
                  </CardDescription>
                </div>
                <Button onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {config.questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No questions configured. Click "Add Question" to get started.
                </div>
              ) : (
                config.questions.map((question, index) => (
                  <Card key={question.question_id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div>
                            <Label>Question Text *</Label>
                            <Input
                              value={question.text}
                              onChange={(e) => updateQuestion(index, { text: e.target.value })}
                              placeholder="Enter your question"
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Question Type</Label>
                              <Select
                                value={question.question_type}
                                onValueChange={(value: any) =>
                                  updateQuestion(index, { question_type: value })
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {QUESTION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                              <input
                                type="checkbox"
                                checked={question.required}
                                onChange={(e) =>
                                  updateQuestion(index, { required: e.target.checked })
                                }
                                className="h-4 w-4"
                              />
                              <Label>Required</Label>
                            </div>
                          </div>
                          {(question.question_type === 'SELECT' ||
                            question.question_type === 'MULTI_SELECT') && (
                            <div>
                              <Label>Options (comma-separated)</Label>
                              <Input
                                value={question.options?.join(', ') || ''}
                                onChange={(e) =>
                                  updateQuestion(index, {
                                    options: e.target.value.split(',').map((s) => s.trim()),
                                  })
                                }
                                placeholder="Option 1, Option 2, Option 3"
                                className="mt-1"
                              />
                            </div>
                          )}
                          <div>
                            <Label>Help Text</Label>
                            <Input
                              value={question.help_text || ''}
                              onChange={(e) =>
                                updateQuestion(index, { help_text: e.target.value })
                              }
                              placeholder="Provide additional context or guidance"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuestion(index)}
                          className="ml-4"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Templates Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Task Templates</CardTitle>
                  <CardDescription>
                    Define the roadmap and task templates for this transition type
                  </CardDescription>
                </div>
                <Button onClick={addTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {config.taskTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No task templates configured. Click "Add Task" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {config.taskTemplates.map((task, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-4">
                            <div>
                              <Label>Task Title *</Label>
                              <Input
                                value={task.title}
                                onChange={(e) => updateTask(index, { title: e.target.value })}
                                placeholder="Task title"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <textarea
                                value={task.description}
                                onChange={(e) =>
                                  updateTask(index, { description: e.target.value })
                                }
                                placeholder="Task description and details"
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                                rows={2}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label>Phase/Milestone</Label>
                                <Input
                                  value={task.phase}
                                  onChange={(e) => updateTask(index, { phase: e.target.value })}
                                  placeholder="e.g., Week 1"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Owner</Label>
                                <Input
                                  value={task.owner}
                                  onChange={(e) => updateTask(index, { owner: e.target.value })}
                                  placeholder="e.g., Manager"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <Select
                                  value={task.priority}
                                  onValueChange={(value: any) =>
                                    updateTask(index, { priority: value })
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Days from Start</Label>
                                <Input
                                  type="number"
                                  value={task.days_from_start}
                                  onChange={(e) =>
                                    updateTask(index, {
                                      days_from_start: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Duration (Days)</Label>
                                <Input
                                  type="number"
                                  value={task.duration_days}
                                  onChange={(e) =>
                                    updateTask(index, {
                                      duration_days: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Tags (comma-separated)</Label>
                              <Input
                                value={task.tags.join(', ')}
                                onChange={(e) =>
                                  updateTask(index, {
                                    tags: e.target.value.split(',').map((s) => s.trim()),
                                  })
                                }
                                placeholder="e.g., onboarding, setup, training"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateTask(index)}
                              title="Duplicate task"
                            >
                              <Copy className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(index)}
                              title="Delete task"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
