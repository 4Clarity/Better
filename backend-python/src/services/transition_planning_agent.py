"""
AI-powered transition planning agent using PydanticAI.

This module implements the core AI agent for generating intelligent
transition planning recommendations based on user responses and transition type.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re

from pydantic_ai import Agent

from ..models.planning_models import (
    TransitionType,
    PlanningQuestion,
    PlanningResponse,
    PlanningContext,
    TaskRecommendation,
    MilestoneRecommendation,
    TaskPriority,
    TaskStatus,
    MilestoneStatus
)
from ..prompts import contract_transition, personnel_transition, system_transition


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TransitionPlanningAgent:
    """
    AI agent for intelligent transition planning using PydanticAI and Ollama.

    This agent generates contextual questions, analyzes responses, and creates
    tailored task and milestone recommendations for government transitions.
    """

    def __init__(self, model_name: str = None):
        """
        Initialize the transition planning agent.

        Args:
            model_name: Name of the model to use (default: uses Ollama from environment)
                       Can be:
                       - ollama:llama3.2 (local Ollama, fast)
                       - ollama:mistral (local Ollama, good quality)
                       - ollama:gemma2 (local Ollama, balanced)
                       - gemini-2.5-flash (free, fast, cloud)
                       - claude-3-5-sonnet (requires credits)
        """
        import os

        # Default to Ollama if not specified
        if model_name is None:
            ollama_model = os.getenv('OLLAMA_DEFAULT_MODEL', 'gemma3:1b')
            model_name = f"ollama:{ollama_model}"
            logger.info(f"No model specified, using Ollama with model: {ollama_model}")

        self.model_name = model_name
        model_lower = model_name.lower()

        # Set up API configuration based on model provider
        if "ollama" in model_lower:
            # Use Ollama - requires OLLAMA_API_URL
            ollama_url = os.getenv('OLLAMA_API_URL', 'http://host.docker.internal:11434')
            os.environ['OLLAMA_BASE_URL'] = ollama_url
            logger.info(f"Using Ollama at {ollama_url}")
            self.model = model_name

        elif "gemini" in model_lower or "google" in model_lower:
            # Use Gemini API key from environment
            google_api_key = os.getenv('GEMINI_API_KEY')
            if google_api_key:
                os.environ['GOOGLE_API_KEY'] = google_api_key
                logger.info(f"Using Google Gemini API key from environment")
            else:
                logger.warning("GEMINI_API_KEY not found in environment")
            self.model = model_name

        elif "claude" in model_lower or "anthropic" in model_lower:
            # Use Claude API key from environment
            anthropic_api_key = os.getenv('CLAUDE_API_KEY')
            if anthropic_api_key:
                os.environ['ANTHROPIC_API_KEY'] = anthropic_api_key
                logger.info(f"Using Anthropic Claude API key from environment")
            else:
                logger.warning("CLAUDE_API_KEY not found in environment")
            self.model = model_name

        elif "gpt" in model_lower or "openai" in model_lower:
            # Use OpenAI API key from environment
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if openai_api_key:
                os.environ['OPENAI_API_KEY'] = openai_api_key
                logger.info(f"Using OpenAI API key from environment")
            else:
                logger.warning("OPENAI_API_KEY not found in environment")
            self.model = model_name
        else:
            self.model = model_name

        logger.info(f"Initialized TransitionPlanningAgent with model: {model_name}")

    def generate_questions(self, transition_type: TransitionType) -> List[PlanningQuestion]:
        """
        Generate contextual questions based on transition type.

        Args:
            transition_type: Type of transition (Contract, Personnel, System)

        Returns:
            List of PlanningQuestion objects
        """
        logger.info(f"Generating questions for {transition_type} transition")

        if transition_type == TransitionType.CONTRACT:
            questions = contract_transition.get_contract_questions()
        elif transition_type == TransitionType.PERSONNEL:
            questions = personnel_transition.get_personnel_questions()
        elif transition_type == TransitionType.SYSTEM:
            questions = system_transition.get_system_questions()
        else:
            raise ValueError(f"Unknown transition type: {transition_type}")

        logger.info(f"Generated {len(questions)} questions")
        return questions

    def process_responses(
        self,
        transition_type: TransitionType,
        responses: List[PlanningResponse]
    ) -> PlanningContext:
        """
        Process user responses to create planning context.

        Args:
            transition_type: Type of transition
            responses: List of user responses to planning questions

        Returns:
            PlanningContext object with analyzed information
        """
        logger.info(f"Processing {len(responses)} responses for {transition_type} transition")

        # Convert responses to dict for easier access
        response_dict = {r.question_id: r.answer for r in responses}

        # Extract common context fields
        context_data = {
            "transition_type": transition_type,
            "scope": self._extract_scope(response_dict, transition_type),
            "scale": self._extract_scale(response_dict, transition_type),
            "timeline_weeks": self._extract_timeline(response_dict),
            "team_size": self._extract_team_size(response_dict, transition_type),
            "risk_factors": self._extract_risk_factors(response_dict),
            "special_requirements": self._extract_special_requirements(response_dict, transition_type),
            "key_deliverables": self._extract_deliverables(response_dict, transition_type)
        }

        return PlanningContext(**context_data)

    async def generate_tasks(
        self,
        transition_type: TransitionType,
        responses: List[PlanningResponse],
        context: Optional[PlanningContext] = None
    ) -> List[TaskRecommendation]:
        """
        Generate task recommendations using AI based on responses and context.

        Args:
            transition_type: Type of transition
            responses: List of user responses
            context: Optional pre-computed planning context

        Returns:
            List of TaskRecommendation objects
        """
        logger.info(f"Generating tasks for {transition_type} transition")

        # Process responses if context not provided
        if context is None:
            context = self.process_responses(transition_type, responses)

        # Convert responses to dict for prompting
        response_dict = {r.question_id: r.answer for r in responses}
        response_dict['timeline_weeks'] = context.timeline_weeks

        # Get transition-specific system prompt and task generation prompt
        if transition_type == TransitionType.CONTRACT:
            system_prompt = contract_transition.SYSTEM_PROMPT
            task_prompt = contract_transition.get_task_generation_prompt(response_dict)
        elif transition_type == TransitionType.PERSONNEL:
            system_prompt = personnel_transition.SYSTEM_PROMPT
            task_prompt = personnel_transition.get_task_generation_prompt(response_dict)
        elif transition_type == TransitionType.SYSTEM:
            system_prompt = system_transition.SYSTEM_PROMPT
            task_prompt = system_transition.get_task_generation_prompt(response_dict)
        else:
            raise ValueError(f"Unknown transition type: {transition_type}")

        # Create agent with system prompt
        agent = Agent(
            self.model,
            system_prompt=system_prompt
        )

        try:
            # Run agent to generate tasks
            logger.info(f"Calling LLM API for task generation with model {self.model}...")
            result = await agent.run(task_prompt)
            logger.info(f"Received response from LLM API")
            logger.debug(f"Raw LLM response: {result.output[:500]}...")

            # Parse AI response into TaskRecommendation objects
            tasks = self._parse_tasks_from_response(result.output, context)

            if tasks and len(tasks) > 0:
                logger.info(f"Successfully generated {len(tasks)} task recommendations from AI")
                return tasks
            else:
                logger.warning("AI returned no tasks, using fallback")
                return self._get_fallback_tasks(transition_type, context)

        except Exception as e:
            logger.error(f"Failed to generate tasks: {e}", exc_info=True)
            # Return fallback tasks based on transition type
            return self._get_fallback_tasks(transition_type, context)

    async def generate_milestones(
        self,
        transition_type: TransitionType,
        responses: List[PlanningResponse],
        context: Optional[PlanningContext] = None
    ) -> List[MilestoneRecommendation]:
        """
        Generate milestone recommendations using AI based on responses and context.

        Args:
            transition_type: Type of transition
            responses: List of user responses
            context: Optional pre-computed planning context

        Returns:
            List of MilestoneRecommendation objects
        """
        logger.info(f"Generating milestones for {transition_type} transition")

        # Process responses if context not provided
        if context is None:
            context = self.process_responses(transition_type, responses)

        # Convert responses to dict for prompting
        response_dict = {r.question_id: r.answer for r in responses}
        response_dict['timeline_weeks'] = context.timeline_weeks

        # Get transition-specific system prompt and milestone generation prompt
        if transition_type == TransitionType.CONTRACT:
            system_prompt = contract_transition.SYSTEM_PROMPT
            milestone_prompt = contract_transition.get_milestone_generation_prompt(response_dict)
        elif transition_type == TransitionType.PERSONNEL:
            system_prompt = personnel_transition.SYSTEM_PROMPT
            milestone_prompt = personnel_transition.get_milestone_generation_prompt(response_dict)
        elif transition_type == TransitionType.SYSTEM:
            system_prompt = system_transition.SYSTEM_PROMPT
            milestone_prompt = system_transition.get_milestone_generation_prompt(response_dict)
        else:
            raise ValueError(f"Unknown transition type: {transition_type}")

        # Create agent with system prompt
        agent = Agent(
            self.model,
            system_prompt=system_prompt
        )

        try:
            # Run agent to generate milestones
            logger.info(f"Calling LLM API for milestone generation with model {self.model}...")
            result = await agent.run(milestone_prompt)
            logger.info(f"Received response from LLM API")
            logger.debug(f"Raw LLM response: {result.output[:500]}...")

            # Parse AI response into MilestoneRecommendation objects
            milestones = self._parse_milestones_from_response(result.output, context)

            if milestones and len(milestones) > 0:
                logger.info(f"Successfully generated {len(milestones)} milestone recommendations from AI")
                return milestones
            else:
                logger.warning("AI returned no milestones, using fallback")
                return self._get_fallback_milestones(transition_type, context)

        except Exception as e:
            logger.error(f"Failed to generate milestones: {e}", exc_info=True)
            # Return fallback milestones based on transition type
            return self._get_fallback_milestones(transition_type, context)

    # Helper methods for context extraction

    def _extract_scope(self, responses: Dict, transition_type: TransitionType) -> str:
        """Extract transition scope from responses."""
        if transition_type == TransitionType.CONTRACT:
            return responses.get('contract_type', 'Not specified')
        elif transition_type == TransitionType.PERSONNEL:
            return responses.get('transition_reason', 'Not specified')
        elif transition_type == TransitionType.SYSTEM:
            return responses.get('transition_type', 'Not specified')
        return "General transition"

    def _extract_scale(self, responses: Dict, transition_type: TransitionType) -> str:
        """Extract transition scale from responses."""
        if transition_type == TransitionType.CONTRACT:
            return responses.get('contract_value', 'Medium')
        elif transition_type == TransitionType.PERSONNEL:
            criticality = responses.get('role_criticality', 'Medium')
            return f"{criticality} criticality role"
        elif transition_type == TransitionType.SYSTEM:
            return responses.get('system_criticality', 'Medium')
        return "Medium scale"

    def _extract_timeline(self, responses: Dict) -> int:
        """Extract timeline from responses, defaulting to reasonable values."""
        # Try various keys that might contain timeline info
        for key in ['timeline_weeks', 'notice_period', 'duration_weeks']:
            if key in responses:
                return int(responses[key])

        # Default to 12 weeks if not specified
        return 12

    def _extract_team_size(self, responses: Dict, transition_type: TransitionType) -> int:
        """Extract team size from responses."""
        if transition_type == TransitionType.CONTRACT:
            return int(responses.get('contractor_personnel', 5))
        elif transition_type == TransitionType.PERSONNEL:
            return int(responses.get('direct_reports', 0)) + 1  # Include the person
        elif transition_type == TransitionType.SYSTEM:
            # Estimate based on user count
            users = int(responses.get('user_count', 50))
            if users < 10:
                return 2
            elif users < 100:
                return 5
            elif users < 1000:
                return 10
            else:
                return 20
        return 5

    def _extract_risk_factors(self, responses: Dict) -> List[str]:
        """Extract risk factors from responses."""
        risk_factors = responses.get('risk_factors', [])
        if isinstance(risk_factors, list):
            return risk_factors
        elif isinstance(risk_factors, str):
            return [risk_factors]
        return []

    def _extract_special_requirements(self, responses: Dict, transition_type: TransitionType) -> List[str]:
        """Extract special requirements from responses."""
        requirements = []

        # Check for clearance requirements
        if responses.get('security_clearance') or responses.get('security_clearance_level'):
            requirements.append("Security clearance required")

        # Check for compliance requirements
        compliance = responses.get('compliance_requirements', [])
        if isinstance(compliance, list):
            requirements.extend(compliance)

        return requirements

    def _extract_deliverables(self, responses: Dict, transition_type: TransitionType) -> List[str]:
        """Extract key deliverables from responses."""
        deliverables = []

        if transition_type == TransitionType.CONTRACT:
            count = int(responses.get('deliverables_count', 0))
            for i in range(min(count, 5)):  # Limit to top 5
                deliverables.append(f"Deliverable {i+1}")

        return deliverables

    def _parse_tasks_from_response(self, response_text: str, context: PlanningContext) -> List[TaskRecommendation]:
        """
        Parse AI-generated text into TaskRecommendation objects.

        Attempts to parse JSON first, then falls back to text parsing.
        """
        tasks = []

        try:
            # Try to find and parse JSON in the response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                json_text = json_match.group(0)
                task_data = json.loads(json_text)

                for item in task_data:
                    try:
                        # Map priority string to enum
                        priority_map = {
                            'low': TaskPriority.LOW,
                            'medium': TaskPriority.MEDIUM,
                            'high': TaskPriority.HIGH,
                            'critical': TaskPriority.CRITICAL
                        }
                        priority = priority_map.get(item.get('priority', 'medium').lower(), TaskPriority.MEDIUM)

                        task = TaskRecommendation(
                            title=item.get('title', 'Unnamed Task'),
                            description=item.get('description', ''),
                            priority=priority,
                            assigned_role=item.get('assigned_role', 'Program Manager'),
                            estimated_hours=int(item.get('estimated_hours', 4)),
                            days_from_start=int(item.get('days_from_start', 0)),
                            duration_days=int(item.get('duration_days', 1)),
                            dependencies=item.get('dependencies', []),
                            tags=item.get('tags', [])
                        )
                        tasks.append(task)
                    except Exception as e:
                        logger.warning(f"Failed to parse task item: {e}")
                        continue

                if tasks:
                    logger.info(f"Successfully parsed {len(tasks)} tasks from JSON response")
                    return tasks
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON from response: {e}")
        except Exception as e:
            logger.warning(f"Error parsing tasks: {e}")

        # If JSON parsing fails, try text parsing
        try:
            lines = response_text.split('\n')
            current_task = {}

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Look for task headers (numbered or bulleted)
                if re.match(r'^(\d+\.|\*|\-)\s*Title:', line, re.IGNORECASE):
                    if current_task:
                        tasks.append(self._create_task_from_dict(current_task))
                        current_task = {}
                    title_match = re.search(r'Title:\s*(.+)', line, re.IGNORECASE)
                    if title_match:
                        current_task['title'] = title_match.group(1).strip()

                # Parse task attributes
                elif 'description:' in line.lower():
                    desc_match = re.search(r'Description:\s*(.+)', line, re.IGNORECASE)
                    if desc_match:
                        current_task['description'] = desc_match.group(1).strip()
                elif 'priority:' in line.lower():
                    priority_match = re.search(r'Priority:\s*(\w+)', line, re.IGNORECASE)
                    if priority_match:
                        current_task['priority'] = priority_match.group(1).lower()
                elif 'role:' in line.lower() or 'assigned' in line.lower():
                    role_match = re.search(r'(?:Role|Assigned):\s*(.+)', line, re.IGNORECASE)
                    if role_match:
                        current_task['assigned_role'] = role_match.group(1).strip()
                elif 'hours:' in line.lower():
                    hours_match = re.search(r'(\d+)', line)
                    if hours_match:
                        current_task['estimated_hours'] = int(hours_match.group(1))

            # Add last task
            if current_task and 'title' in current_task:
                tasks.append(self._create_task_from_dict(current_task))

            if tasks:
                logger.info(f"Successfully parsed {len(tasks)} tasks from text response")
                return tasks

        except Exception as e:
            logger.warning(f"Text parsing also failed: {e}")

        # Return empty list if parsing failed
        logger.warning("Could not parse any tasks from AI response")
        return []

    def _create_task_from_dict(self, task_dict: dict) -> TaskRecommendation:
        """Helper to create TaskRecommendation from parsed dictionary."""
        priority_map = {
            'low': TaskPriority.LOW,
            'medium': TaskPriority.MEDIUM,
            'high': TaskPriority.HIGH,
            'critical': TaskPriority.CRITICAL
        }

        return TaskRecommendation(
            title=task_dict.get('title', 'Unnamed Task'),
            description=task_dict.get('description', ''),
            priority=priority_map.get(task_dict.get('priority', 'medium'), TaskPriority.MEDIUM),
            assigned_role=task_dict.get('assigned_role', 'Program Manager'),
            estimated_hours=int(task_dict.get('estimated_hours', 4)),
            days_from_start=int(task_dict.get('days_from_start', 0)),
            duration_days=int(task_dict.get('duration_days', 1)),
            dependencies=task_dict.get('dependencies', []),
            tags=task_dict.get('tags', [])
        )

    def _parse_milestones_from_response(self, response_text: str, context: PlanningContext) -> List[MilestoneRecommendation]:
        """
        Parse AI-generated text into MilestoneRecommendation objects.

        Attempts to parse JSON first, then falls back to text parsing.
        """
        milestones = []

        try:
            # Try to find and parse JSON in the response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                json_text = json_match.group(0)
                milestone_data = json.loads(json_text)

                for item in milestone_data:
                    try:
                        # Map priority string to enum
                        priority_map = {
                            'low': TaskPriority.LOW,
                            'medium': TaskPriority.MEDIUM,
                            'high': TaskPriority.HIGH,
                            'critical': TaskPriority.CRITICAL
                        }
                        priority = priority_map.get(item.get('priority', 'medium').lower(), TaskPriority.MEDIUM)

                        milestone = MilestoneRecommendation(
                            title=item.get('title', 'Unnamed Milestone'),
                            description=item.get('description', ''),
                            days_from_start=int(item.get('days_from_start', 0)),
                            priority=priority,
                            assigned_role=item.get('assigned_role', 'Program Manager'),
                            success_criteria=item.get('success_criteria', [])
                        )
                        milestones.append(milestone)
                    except Exception as e:
                        logger.warning(f"Failed to parse milestone item: {e}")
                        continue

                if milestones:
                    logger.info(f"Successfully parsed {len(milestones)} milestones from JSON response")
                    return milestones
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON from response: {e}")
        except Exception as e:
            logger.warning(f"Error parsing milestones: {e}")

        # If JSON parsing fails, try text parsing
        try:
            lines = response_text.split('\n')
            current_milestone = {}

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Look for milestone headers
                if re.match(r'^(\d+\.|\*|\-)\s*Title:', line, re.IGNORECASE):
                    if current_milestone:
                        milestones.append(self._create_milestone_from_dict(current_milestone))
                        current_milestone = {}
                    title_match = re.search(r'Title:\s*(.+)', line, re.IGNORECASE)
                    if title_match:
                        current_milestone['title'] = title_match.group(1).strip()

                # Parse milestone attributes
                elif 'description:' in line.lower():
                    desc_match = re.search(r'Description:\s*(.+)', line, re.IGNORECASE)
                    if desc_match:
                        current_milestone['description'] = desc_match.group(1).strip()
                elif 'priority:' in line.lower():
                    priority_match = re.search(r'Priority:\s*(\w+)', line, re.IGNORECASE)
                    if priority_match:
                        current_milestone['priority'] = priority_match.group(1).lower()
                elif 'role:' in line.lower() or 'assigned' in line.lower():
                    role_match = re.search(r'(?:Role|Assigned):\s*(.+)', line, re.IGNORECASE)
                    if role_match:
                        current_milestone['assigned_role'] = role_match.group(1).strip()
                elif 'days' in line.lower() and 'from' in line.lower():
                    days_match = re.search(r'(\d+)', line)
                    if days_match:
                        current_milestone['days_from_start'] = int(days_match.group(1))

            # Add last milestone
            if current_milestone and 'title' in current_milestone:
                milestones.append(self._create_milestone_from_dict(current_milestone))

            if milestones:
                logger.info(f"Successfully parsed {len(milestones)} milestones from text response")
                return milestones

        except Exception as e:
            logger.warning(f"Text parsing also failed: {e}")

        # Return empty list if parsing failed
        logger.warning("Could not parse any milestones from AI response")
        return []

    def _create_milestone_from_dict(self, milestone_dict: dict) -> MilestoneRecommendation:
        """Helper to create MilestoneRecommendation from parsed dictionary."""
        priority_map = {
            'low': TaskPriority.LOW,
            'medium': TaskPriority.MEDIUM,
            'high': TaskPriority.HIGH,
            'critical': TaskPriority.CRITICAL
        }

        return MilestoneRecommendation(
            title=milestone_dict.get('title', 'Unnamed Milestone'),
            description=milestone_dict.get('description', ''),
            days_from_start=int(milestone_dict.get('days_from_start', 0)),
            priority=priority_map.get(milestone_dict.get('priority', 'medium'), TaskPriority.MEDIUM),
            assigned_role=milestone_dict.get('assigned_role', 'Program Manager'),
            success_criteria=milestone_dict.get('success_criteria', [])
        )

    def _get_fallback_tasks(self, transition_type: TransitionType, context: PlanningContext) -> List[TaskRecommendation]:
        """Provide fallback tasks when AI generation fails."""
        logger.warning("Using fallback task templates")

        if transition_type == TransitionType.CONTRACT:
            return [
                TaskRecommendation(
                    title="Initial Contract Review",
                    description="Review contract terms, deliverables, and requirements",
                    priority=TaskPriority.HIGH,
                    assigned_role="Program Manager",
                    estimated_hours=8,
                    days_from_start=0,
                    duration_days=2,
                    tags=["planning", "contract"]
                ),
                TaskRecommendation(
                    title="Stakeholder Kickoff Meeting",
                    description="Conduct kickoff meeting with all stakeholders",
                    priority=TaskPriority.HIGH,
                    assigned_role="Program Manager",
                    estimated_hours=4,
                    days_from_start=2,
                    duration_days=1,
                    dependencies=["Initial Contract Review"],
                    tags=["communication", "stakeholders"]
                )
            ]

        # Add similar fallback templates for other transition types
        return []

    def _get_fallback_milestones(self, transition_type: TransitionType, context: PlanningContext) -> List[MilestoneRecommendation]:
        """Provide fallback milestones when AI generation fails."""
        logger.warning("Using fallback milestone templates")

        timeline_days = context.timeline_weeks * 7

        milestones = [
            MilestoneRecommendation(
                title="Planning Complete",
                description="Initial planning and preparation phase complete",
                days_from_start=int(timeline_days * 0.15),
                priority=TaskPriority.HIGH,
                assigned_role="Program Manager",
                success_criteria=["All stakeholders identified", "Timeline confirmed", "Resources allocated"]
            ),
            MilestoneRecommendation(
                title="Mid-Transition Checkpoint",
                description="Halfway point - major activities in progress",
                days_from_start=int(timeline_days * 0.5),
                priority=TaskPriority.MEDIUM,
                assigned_role="Program Manager",
                success_criteria=["50% of tasks complete", "No critical blockers", "On schedule"]
            ),
            MilestoneRecommendation(
                title="Transition Complete",
                description="All transition activities completed successfully",
                days_from_start=timeline_days,
                priority=TaskPriority.CRITICAL,
                assigned_role="Program Manager",
                success_criteria=["All tasks complete", "All deliverables accepted", "Sign-off received"]
            )
        ]

        return milestones
