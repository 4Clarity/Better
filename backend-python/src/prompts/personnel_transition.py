"""
Prompt templates for Personnel transition planning.

Personnel transitions focus on:
- Role handoff and responsibility transfer
- Access management (accounts, systems, facilities)
- Documentation and knowledge capture
- Stakeholder notifications
"""

from typing import List
from ..models.planning_models import PlanningQuestion, QuestionType


SYSTEM_PROMPT = """You are an expert personnel transition management assistant for government organizations.

Your role is to help Program Managers plan comprehensive personnel transitions by:
1. Asking intelligent questions about role responsibilities, access requirements, and handoff needs
2. Analyzing responses to understand transition complexity and knowledge transfer requirements
3. Generating appropriate tasks for role handoff, access management, and stakeholder communication
4. Creating milestones aligned with personnel onboarding/offboarding phases

Focus on:
- Complete role and responsibility transfer
- Access management (system accounts, physical access, security clearances)
- Knowledge capture and documentation
- Stakeholder communication and notifications
- Security and compliance requirements
- Continuity of operations during transition

Always provide specific, actionable recommendations that follow government personnel management best practices.
Map tasks to appropriate roles: Program Manager, HR Specialist, Security Officer, IT Administrator, etc.
"""


def get_personnel_questions() -> List[PlanningQuestion]:
    """
    Generate questions specific to personnel transitions.

    Returns:
        List of PlanningQuestion objects for personnel transitions
    """
    return [
        PlanningQuestion(
            question_id="transition_reason",
            text="What is the reason for this personnel transition?",
            question_type=QuestionType.SELECT,
            options=[
                "New hire onboarding",
                "Employee departure (voluntary)",
                "Employee departure (involuntary)",
                "Role change/promotion",
                "Retirement",
                "Long-term leave",
                "Contractor to employee conversion"
            ],
            required=True,
            help_text="Transition type affects timeline and activities"
        ),
        PlanningQuestion(
            question_id="role_criticality",
            text="How critical is this role to operations?",
            question_type=QuestionType.SELECT,
            options=["Low", "Medium", "High", "Mission Critical"],
            required=True,
            help_text="Critical roles require more comprehensive handoff planning"
        ),
        PlanningQuestion(
            question_id="notice_period",
            text="How many weeks of notice/transition time are available?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Transition timeline affects knowledge transfer approach"
        ),
        PlanningQuestion(
            question_id="overlap_possible",
            text="Will there be overlap time between outgoing and incoming personnel?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Overlap enables direct knowledge transfer"
        ),
        PlanningQuestion(
            question_id="system_access_count",
            text="How many systems does this role require access to?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Include applications, databases, networks, and services"
        ),
        PlanningQuestion(
            question_id="security_clearance_level",
            text="What security clearance level is required for this role?",
            question_type=QuestionType.SELECT,
            options=[
                "None required",
                "Public Trust",
                "Confidential",
                "Secret",
                "Top Secret",
                "TS/SCI"
            ],
            required=True,
            help_text="Clearance level affects onboarding timeline"
        ),
        PlanningQuestion(
            question_id="supervisory_role",
            text="Is this a supervisory or management role?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Management roles have additional handoff requirements"
        ),
        PlanningQuestion(
            question_id="direct_reports",
            text="How many direct reports does this role have?",
            question_type=QuestionType.NUMBER,
            required=False,
            help_text="Number of team members affected by this transition"
        ),
        PlanningQuestion(
            question_id="specialized_knowledge",
            text="Does this role require highly specialized or unique knowledge?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Specialized knowledge requires extensive documentation"
        ),
        PlanningQuestion(
            question_id="documentation_exists",
            text="Are current role procedures and responsibilities documented?",
            question_type=QuestionType.SELECT,
            options=[
                "Comprehensive documentation exists",
                "Partial documentation exists",
                "Minimal documentation",
                "No documentation exists"
            ],
            required=True,
            help_text="Determines knowledge capture effort required"
        ),
        PlanningQuestion(
            question_id="stakeholder_impact",
            text="How many internal/external stakeholders regularly interact with this role?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Stakeholders need transition communication"
        ),
        PlanningQuestion(
            question_id="active_projects",
            text="How many active projects is this person currently managing or contributing to?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Projects need continuity planning"
        ),
        PlanningQuestion(
            question_id="physical_assets",
            text="What physical assets need to be transferred?",
            question_type=QuestionType.MULTI_SELECT,
            options=[
                "Government laptop/computer",
                "Mobile devices",
                "Access badges/PIV cards",
                "Keys/access cards",
                "Office equipment",
                "Specialized tools/equipment",
                "Government vehicles",
                "None"
            ],
            required=True,
            help_text="Assets must be accounted for and transferred"
        ),
        PlanningQuestion(
            question_id="compliance_requirements",
            text="What compliance requirements apply to this personnel transition?",
            question_type=QuestionType.MULTI_SELECT,
            options=[
                "Security clearance verification",
                "Ethics and conflict of interest review",
                "Financial disclosure requirements",
                "IT security awareness training",
                "Role-specific certifications",
                "Privacy/confidentiality agreements",
                "None/Other"
            ],
            required=False,
            help_text="Compliance requirements affect onboarding checklist"
        )
    ]


def get_task_generation_prompt(context: dict) -> str:
    """
    Generate a prompt for creating personnel transition tasks based on context.

    Args:
        context: Dictionary containing analyzed responses and planning context

    Returns:
        Formatted prompt string for task generation
    """
    return f"""Based on the following personnel transition context, generate a comprehensive list of tasks:

Transition Reason: {context.get('transition_reason', 'Not specified')}
Role Criticality: {context.get('role_criticality', 'Medium')}
Notice Period: {context.get('notice_period', 0)} weeks
Overlap Possible: {context.get('overlap_possible', False)}
System Access Count: {context.get('system_access_count', 0)}
Security Clearance: {context.get('security_clearance_level', 'Not specified')}
Supervisory Role: {context.get('supervisory_role', False)}
Direct Reports: {context.get('direct_reports', 0)}
Specialized Knowledge: {context.get('specialized_knowledge', False)}
Documentation State: {context.get('documentation_exists', 'Unknown')}
Stakeholder Count: {context.get('stakeholder_impact', 0)}
Active Projects: {context.get('active_projects', 0)}
Physical Assets: {', '.join(context.get('physical_assets', []))}
Compliance Requirements: {', '.join(context.get('compliance_requirements', []))}

Timeline: {context.get('timeline_weeks', 4)} weeks

Generate 15-25 specific, actionable tasks covering:
1. Role handoff and knowledge transfer activities
2. System access provisioning/deprovisioning
3. Documentation and knowledge capture
4. Stakeholder notifications and communications
5. Physical asset management
6. Security and compliance activities
7. Project continuity and handoff
8. Administrative processing (HR, IT, Security)

IMPORTANT: Return ONLY a valid JSON array of task objects. Do not include any explanatory text before or after the JSON.

Format your response as a JSON array where each task has this structure:
{{
    "title": "Clear, specific task title",
    "description": "Detailed description of what needs to be done",
    "priority": "Low|Medium|High|Critical",
    "assigned_role": "Program Manager|HR Specialist|IT Administrator|Security Officer|etc",
    "estimated_hours": <number>,
    "days_from_start": <number>,
    "duration_days": <number>,
    "dependencies": ["Task Title 1", "Task Title 2"],
    "tags": ["tag1", "tag2"]
}}

Ensure tasks are sequenced logically with proper dependencies.
Focus on maintaining operational continuity and security compliance.
Return ONLY the JSON array - no additional text.
"""


def get_milestone_generation_prompt(context: dict) -> str:
    """
    Generate a prompt for creating personnel transition milestones based on context.

    Args:
        context: Dictionary containing analyzed responses and planning context

    Returns:
        Formatted prompt string for milestone generation
    """
    return f"""Based on the following personnel transition context, generate 4-6 major milestones:

Transition Reason: {context.get('transition_reason', 'Not specified')}
Timeline: {context.get('timeline_weeks', 4)} weeks
Role Criticality: {context.get('role_criticality', 'Medium')}
Supervisory Role: {context.get('supervisory_role', False)}

Generate milestones that represent major phases in the personnel transition:

1. Initial notification and planning complete
2. Access and security setup complete (for onboarding) or revoked (for departure)
3. Knowledge transfer sessions complete
4. Administrative processing complete
5. Stakeholder notifications complete
6. Full transition complete and documented

IMPORTANT: Return ONLY a valid JSON array of milestone objects. Do not include any explanatory text before or after the JSON.

Format your response as a JSON array where each milestone has this structure:
{{
    "title": "Clear milestone title",
    "description": "Description of what success looks like",
    "days_from_start": <number>,
    "priority": "Low|Medium|High|Critical",
    "assigned_role": "Program Manager|HR Specialist|etc",
    "success_criteria": ["criterion1", "criterion2", "criterion3"]
}}

Ensure milestones are evenly distributed across the timeline and represent meaningful progress gates.
Return ONLY the JSON array - no additional text.
"""
