"""
Prompt templates for Contract transition planning.

Contract transitions focus on:
- Deliverable tracking and handoff
- Knowledge documentation and transfer
- Contractor onboarding/offboarding
- Contract compliance and closeout
"""

from typing import List
from ..models.planning_models import PlanningQuestion, QuestionType


SYSTEM_PROMPT = """You are an expert government contract transition management assistant.

Your role is to help Program Managers plan comprehensive contract transitions by:
1. Asking intelligent questions about contract scope, deliverables, and requirements
2. Analyzing responses to understand transition complexity and risks
3. Generating appropriate tasks for contract handoff, knowledge transfer, and closeout
4. Creating milestones aligned with contract phases and deliverables

Focus on:
- Deliverable tracking and acceptance
- Knowledge documentation and transfer procedures
- Contractor onboarding/offboarding processes
- Compliance with contract terms and government regulations
- Risk mitigation strategies
- Communication plans with stakeholders

Always provide specific, actionable recommendations that follow government contracting best practices.
Map tasks to appropriate roles: Program Manager, Contracting Officer, Security Officer, Technical Lead, etc.
"""


def get_contract_questions() -> List[PlanningQuestion]:
    """
    Generate questions specific to contract transitions.

    Returns:
        List of PlanningQuestion objects for contract transitions
    """
    return [
        PlanningQuestion(
            question_id="transition_category",
            text="What is the primary category of this transition?",
            question_type=QuestionType.SELECT,
            options=[
                "New Service - Starting a new capability or service offering",
                "Integration - Connecting or merging systems/services",
                "Contract Transition - Contract award, renewal, or closeout",
                "Resource Transition - Personnel or resource changes"
            ],
            required=True,
            help_text="Each category has different complexity and security implications. This determines the planning approach."
        ),
        PlanningQuestion(
            question_id="security_impact_level",
            text="What is the expected security impact of this transition?",
            question_type=QuestionType.SELECT,
            options=[
                "Low - No sensitive data or critical systems involved",
                "Moderate - Some sensitive data or important systems",
                "High - Critical systems or sensitive data handling",
                "Very High - Mission-critical systems with classified data"
            ],
            required=True,
            help_text="Security impact determines required approvals, assessments, and controls needed"
        ),
        PlanningQuestion(
            question_id="contract_type",
            text="What type of contract activity is this? (if applicable)",
            question_type=QuestionType.SELECT,
            options=[
                "New Contract Award",
                "Contract Renewal",
                "Contract Closeout",
                "Contract Modification",
                "Contractor Replacement",
                "N/A - Not a contract transition"
            ],
            required=True,
            help_text="Specific contract transition type - select N/A if this is not a contract-related transition"
        ),
        PlanningQuestion(
            question_id="contract_value",
            text="What is the approximate contract value?",
            question_type=QuestionType.SELECT,
            options=[
                "Under $100K (Small)",
                "$100K - $1M (Medium)",
                "$1M - $10M (Large)",
                "Over $10M (Very Large)"
            ],
            required=True,
            help_text="Contract size affects transition complexity and oversight requirements"
        ),
        PlanningQuestion(
            question_id="deliverables_count",
            text="How many major deliverables are included in this contract?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Count distinct deliverable items that require acceptance"
        ),
        PlanningQuestion(
            question_id="contractor_personnel",
            text="How many contractor personnel will be involved?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="This includes all contractor staff working on the contract"
        ),
        PlanningQuestion(
            question_id="knowledge_transfer",
            text="Is knowledge transfer from the outgoing contractor required?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Required when replacing contractors or closing out a contract"
        ),
        PlanningQuestion(
            question_id="security_clearance",
            text="Do contractor personnel require security clearances?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Clearance processing adds time to onboarding"
        ),
        PlanningQuestion(
            question_id="technical_complexity",
            text="What is the technical complexity of the contract work?",
            question_type=QuestionType.SELECT,
            options=["Low", "Medium", "High", "Very High"],
            required=True,
            help_text="Affects knowledge transfer and documentation requirements"
        ),
        PlanningQuestion(
            question_id="critical_systems",
            text="Does this contract support mission-critical systems?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Critical systems require more rigorous transition planning"
        ),
        PlanningQuestion(
            question_id="compliance_requirements",
            text="What compliance frameworks apply to this contract?",
            question_type=QuestionType.MULTI_SELECT,
            options=[
                "FAR (Federal Acquisition Regulation)",
                "DFARS (Defense FAR Supplement)",
                "FISMA (Federal Information Security)",
                "NIST 800-53 (Security Controls)",
                "CMMC (Cybersecurity Maturity)",
                "Section 508 (Accessibility)",
                "None/Other"
            ],
            required=True,
            help_text="Compliance requirements affect transition documentation"
        ),
        PlanningQuestion(
            question_id="documentation_state",
            text="What is the current state of contract documentation?",
            question_type=QuestionType.SELECT,
            options=[
                "Well-documented and current",
                "Partially documented",
                "Minimal documentation",
                "No documentation exists"
            ],
            required=True,
            help_text="Determines effort needed for knowledge capture"
        ),
        PlanningQuestion(
            question_id="stakeholder_count",
            text="How many key stakeholders need to be involved in the transition?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Stakeholders include government oversight, users, and management"
        ),
        PlanningQuestion(
            question_id="risk_factors",
            text="What are the primary risk factors for this transition?",
            question_type=QuestionType.MULTI_SELECT,
            options=[
                "Tight timeline",
                "Complex technical handoff",
                "Knowledge loss risk",
                "Budget constraints",
                "Regulatory compliance",
                "Stakeholder resistance",
                "System dependencies",
                "Resource availability"
            ],
            required=False,
            help_text="Select all that apply to help with risk mitigation planning"
        )
    ]


def get_task_generation_prompt(context: dict) -> str:
    """
    Generate a prompt for creating contract transition tasks based on context.

    Args:
        context: Dictionary containing analyzed responses and planning context

    Returns:
        Formatted prompt string for task generation
    """
    return f"""Based on the following contract transition context, generate a comprehensive list of tasks:

Contract Type: {context.get('contract_type', 'Not specified')}
Contract Value: {context.get('contract_value', 'Not specified')}
Deliverables Count: {context.get('deliverables_count', 0)}
Contractor Personnel: {context.get('contractor_personnel', 0)}
Knowledge Transfer Required: {context.get('knowledge_transfer', False)}
Security Clearances Required: {context.get('security_clearance', False)}
Technical Complexity: {context.get('technical_complexity', 'Medium')}
Mission Critical: {context.get('critical_systems', False)}
Compliance Requirements: {', '.join(context.get('compliance_requirements', []))}
Documentation State: {context.get('documentation_state', 'Unknown')}
Stakeholder Count: {context.get('stakeholder_count', 0)}
Risk Factors: {', '.join(context.get('risk_factors', []))}

Timeline: {context.get('timeline_weeks', 12)} weeks

Generate 15-25 specific, actionable tasks covering:
1. Contract initiation/closeout activities
2. Deliverable tracking and acceptance
3. Knowledge transfer and documentation
4. Contractor onboarding/offboarding
5. Compliance verification
6. Stakeholder communication
7. Risk mitigation activities
8. Quality assurance and review gates

IMPORTANT: Return ONLY a valid JSON array of task objects. Do not include any explanatory text before or after the JSON.

Format your response as a JSON array where each task has this structure:
{{
    "title": "Clear, specific task title",
    "description": "Detailed description of what needs to be done",
    "priority": "Low|Medium|High|Critical",
    "assigned_role": "Program Manager|Contracting Officer|Security Officer|Technical Lead|etc",
    "estimated_hours": <number>,
    "days_from_start": <number>,
    "duration_days": <number>,
    "dependencies": ["Task Title 1", "Task Title 2"],
    "tags": ["tag1", "tag2"]
}}

Ensure tasks are sequenced logically with proper dependencies.
Focus on government contract management best practices.
Return ONLY the JSON array - no additional text.
"""


def get_milestone_generation_prompt(context: dict) -> str:
    """
    Generate a prompt for creating contract transition milestones based on context.

    Args:
        context: Dictionary containing analyzed responses and planning context

    Returns:
        Formatted prompt string for milestone generation
    """
    return f"""Based on the following contract transition context, generate 5-8 major milestones:

Contract Type: {context.get('contract_type', 'Not specified')}
Timeline: {context.get('timeline_weeks', 12)} weeks
Deliverables: {context.get('deliverables_count', 0)}
Critical Systems: {context.get('critical_systems', False)}

Generate milestones that represent major phases or checkpoints in the contract transition:

1. Contract award/initiation milestones
2. Onboarding completion checkpoints
3. Deliverable acceptance gates
4. Knowledge transfer completion
5. Compliance verification checkpoints
6. Transition review gates
7. Contract closeout milestones

IMPORTANT: Return ONLY a valid JSON array of milestone objects. Do not include any explanatory text before or after the JSON.

Format your response as a JSON array where each milestone has this structure:
{{
    "title": "Clear milestone title",
    "description": "Description of what success looks like",
    "days_from_start": <number>,
    "priority": "Low|Medium|High|Critical",
    "assigned_role": "Program Manager|Contracting Officer|etc",
    "success_criteria": ["criterion1", "criterion2", "criterion3"]
}}

Ensure milestones are evenly distributed across the timeline and represent meaningful progress gates.
Return ONLY the JSON array - no additional text.
"""
