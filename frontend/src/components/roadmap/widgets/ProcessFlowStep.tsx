import { CheckIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";

interface ProcessFlowStepProps {
  stepNumber: number;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'error';
  orientation?: 'horizontal' | 'vertical';
  isLast?: boolean;
}

export function ProcessFlowStep({
  stepNumber,
  title,
  description,
  status,
  orientation = 'horizontal',
  isLast = false,
}: ProcessFlowStepProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'not-started':
        return {
          circle: 'border-2 border-gray-300 bg-white text-gray-400',
          icon: null,
          connector: 'bg-gray-200',
        };
      case 'in-progress':
        return {
          circle: 'bg-gradient-to-br from-purple-500 to-blue-500 text-white animate-pulse',
          icon: <Loader2Icon className="w-4 h-4 animate-spin" />,
          connector: 'bg-gradient-to-r from-purple-500 to-gray-200',
        };
      case 'complete':
        return {
          circle: 'bg-green-500 text-white',
          icon: <CheckIcon className="w-4 h-4" />,
          connector: 'bg-green-500',
        };
      case 'error':
        return {
          circle: 'bg-red-500 text-white',
          icon: <AlertCircleIcon className="w-4 h-4" />,
          connector: 'bg-red-500',
        };
    }
  };

  const styles = getStatusStyles();

  if (orientation === 'vertical') {
    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${styles.circle}`}
          >
            {styles.icon || stepNumber}
          </div>
          {!isLast && (
            <div className={`w-0.5 h-16 my-2 ${styles.connector}`} />
          )}
        </div>
        <div className="flex-1 pb-8">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${styles.circle} transition-all`}
        >
          {styles.icon || stepNumber}
        </div>
        <div className="mt-3 text-center">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-[120px]">
            {description}
          </p>
        </div>
      </div>
      {!isLast && (
        <div className={`flex-1 h-0.5 mx-2 ${styles.connector} min-w-[40px]`} />
      )}
    </div>
  );
}

interface ProcessFlowProps {
  steps: Array<{
    title: string;
    description: string;
    status: 'not-started' | 'in-progress' | 'complete' | 'error';
  }>;
  orientation?: 'horizontal' | 'vertical';
}

export function ProcessFlow({ steps, orientation = 'horizontal' }: ProcessFlowProps) {
  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col">
        {steps.map((step, index) => (
          <ProcessFlowStep
            key={index}
            stepNumber={index + 1}
            title={step.title}
            description={step.description}
            status={step.status}
            orientation="vertical"
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between overflow-x-auto pb-4">
      {steps.map((step, index) => (
        <ProcessFlowStep
          key={index}
          stepNumber={index + 1}
          title={step.title}
          description={step.description}
          status={step.status}
          orientation="horizontal"
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
