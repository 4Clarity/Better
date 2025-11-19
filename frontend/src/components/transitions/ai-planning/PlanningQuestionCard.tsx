/**
 * PlanningQuestionCard Component
 * Renders a single planning question with appropriate input based on question type
 * Story 1.4: AI-Assisted Transition Planning
 */

import React, { useState, useEffect } from 'react';
import { PlanningQuestion, QuestionType } from '../../../types/ai-planning';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { AlertCircle } from 'lucide-react';

interface PlanningQuestionCardProps {
  question: PlanningQuestion;
  value?: any;
  onAnswer: (answer: any) => void;
  error?: string;
}

export const PlanningQuestionCard: React.FC<PlanningQuestionCardProps> = ({
  question,
  value,
  onAnswer,
  error,
}) => {
  const [localValue, setLocalValue] = useState<any>(value || question.default_value || '');

  useEffect(() => {
    setLocalValue(value || question.default_value || '');
  }, [value, question.default_value]);

  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    onAnswer(newValue);
  };

  const renderInput = () => {
    switch (question.question_type) {
      case QuestionType.TEXT:
        return (
          <Textarea
            id={question.question_id}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter your answer..."
            className={error ? 'border-red-500' : ''}
            rows={3}
          />
        );

      case QuestionType.NUMBER:
        return (
          <Input
            id={question.question_id}
            type="number"
            value={localValue}
            onChange={(e) => handleChange(Number(e.target.value))}
            placeholder="Enter a number..."
            className={error ? 'border-red-500' : ''}
          />
        );

      case QuestionType.DATE:
        return (
          <Input
            id={question.question_id}
            type="date"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
        );

      case QuestionType.SELECT:
        return (
          <Select value={localValue} onValueChange={handleChange}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case QuestionType.MULTI_SELECT:
        return (
          <div className="space-y-2">
            {question.options?.map((option) => {
              const isChecked = Array.isArray(localValue) && localValue.includes(option);
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.question_id}-${option}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(localValue) ? localValue : [];
                      const newValues = checked
                        ? [...currentValues, option]
                        : currentValues.filter((v) => v !== option);
                      handleChange(newValues);
                    }}
                  />
                  <label
                    htmlFor={`${question.question_id}-${option}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case QuestionType.BOOLEAN:
        return (
          <div className="flex items-center space-x-4">
            <Button
              type="button"
              variant={localValue === true ? 'default' : 'outline'}
              onClick={() => handleChange(true)}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={localValue === false ? 'default' : 'outline'}
              onClick={() => handleChange(false)}
              className="flex-1"
            >
              No
            </Button>
          </div>
        );

      default:
        return (
          <Input
            id={question.question_id}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter your answer..."
            className={error ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <Card className={`mb-4 ${error ? 'border-red-300' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <span className="text-base">
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </CardTitle>
        {question.help_text && (
          <CardDescription className="text-sm text-gray-600">
            {question.help_text}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {renderInput()}
          {error && (
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
