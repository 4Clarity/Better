"""
Prompt templates for System transition planning.

System transitions focus on:
- Technical migration and cutover planning
- Testing and validation phases
- Rollback procedures and contingency plans
- Data migration and integrity verification
"""

from typing import List
from ..models.planning_models import PlanningQuestion, QuestionType


SYSTEM_PROMPT = """You are an expert system transition management assistant for government IT systems.

Your role is to help Program Managers plan comprehensive system transitions by:
1. Asking intelligent questions about system architecture, dependencies, and migration requirements
2. Analyzing responses to understand technical complexity and risk factors
3. Generating appropriate tasks for migration, testing, validation, and cutover
4. Creating milestones aligned with system transition phases

Focus on:
- Technical migration planning and execution
- Comprehensive testing and validation
- Data migration and integrity verification
- Rollback procedures and contingency planning
- Security and compliance verification
- Stakeholder communication and training
- Post-migration monitoring and support

Always provide specific, actionable recommendations that follow government IT modernization best practices.
Map tasks to appropriate roles: Technical Lead, System Administrator, Database Administrator, Security Officer, QA Tester, etc.
"""


def get_system_questions() -> List[PlanningQuestion]:
    """
    Generate questions specific to system transitions.

    Returns:
        List of PlanningQuestion objects for system transitions
    """
    return [
        PlanningQuestion(
            question_id="transition_type",
            text="What type of system transition is this?",
            question_type=QuestionType.SELECT,
            options=[
                "System migration (moving to new infrastructure)",
                "System upgrade (major version change)",
                "System replacement (new system replacing old)",
                "System integration (connecting systems)",
                "Cloud migration",
                "System decommissioning"
            ],
            required=True,
            help_text="Transition type determines planning approach"
        ),
        PlanningQuestion(
            question_id="system_criticality",
            text="What is the criticality level of this system?",
            question_type=QuestionType.SELECT,
            options=[
                "Low (non-critical, limited impact)",
                "Medium (important but not mission-critical)",
                "High (mission-critical, significant impact)",
                "Critical (essential for operations, zero-downtime required)"
            ],
            required=True,
            help_text="Determines testing rigor and rollback requirements"
        ),
        PlanningQuestion(
            question_id="user_count",
            text="How many users actively use this system?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="User count affects training and communication requirements"
        ),
        PlanningQuestion(
            question_id="acceptable_downtime",
            text="What is the maximum acceptable downtime for cutover?",
            question_type=QuestionType.SELECT,
            options=[
                "None (zero-downtime required)",
                "1-4 hours",
                "4-8 hours",
                "8-24 hours",
                "Multiple days acceptable"
            ],
            required=True,
            help_text="Downtime tolerance affects cutover strategy"
        ),
        PlanningQuestion(
            question_id="data_volume",
            text="What is the volume of data that needs to be migrated?",
            question_type=QuestionType.SELECT,
            options=[
                "Under 1 GB",
                "1 GB - 100 GB",
                "100 GB - 1 TB",
                "1 TB - 10 TB",
                "Over 10 TB"
            ],
            required=True,
            help_text="Data volume affects migration time and strategy"
        ),
        PlanningQuestion(
            question_id="data_sensitivity",
            text="What is the data sensitivity classification?",
            question_type=QuestionType.SELECT,
            options=[
                "Public",
                "Sensitive But Unclassified (SBU)",
                "For Official Use Only (FOUO)",
                "Classified (Confidential)",
                "Classified (Secret)",
                "Classified (Top Secret)"
            ],
            required=True,
            help_text="Data sensitivity affects security requirements"
        ),
        PlanningQuestion(
            question_id="dependent_systems",
            text="How many other systems depend on or integrate with this system?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Dependencies require coordination and integration testing"
        ),
        PlanningQuestion(
            question_id="technical_complexity",
            text="What is the technical complexity of this system?",
            question_type=QuestionType.SELECT,
            options=[
                "Low (simple application, few components)",
                "Medium (multiple components, moderate integration)",
                "High (complex architecture, extensive integration)",
                "Very High (distributed systems, microservices, complex data flows)"
            ],
            required=True,
            help_text="Complexity affects testing and migration approach"
        ),
        PlanningQuestion(
            question_id="testing_environment",
            text="Is a full testing environment available?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Testing environment is critical for validation"
        ),
        PlanningQuestion(
            question_id="rollback_required",
            text="Is a rollback plan required?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Critical systems typically require detailed rollback procedures"
        ),
        PlanningQuestion(
            question_id="compliance_frameworks",
            text="What compliance frameworks apply to this system?",
            question_type=QuestionType.MULTI_SELECT,
            options=[
                "FISMA (Federal Information Security)",
                "FedRAMP (Cloud security)",
                "NIST 800-53 (Security controls)",
                "HIPAA (Health data)",
                "PCI DSS (Payment cards)",
                "SOC 2",
                "ISO 27001",
                "None/Other"
            ],
            required=True,
            help_text="Compliance requirements affect validation activities"
        ),
        PlanningQuestion(
            question_id="documentation_state",
            text="What is the state of current system documentation?",
            question_type=QuestionType.SELECT,
            options=[
                "Comprehensive and up-to-date",
                "Partially documented",
                "Minimal documentation",
                "No documentation exists"
            ],
            required=True,
            help_text="Determines documentation effort required"
        ),
        PlanningQuestion(
            question_id="custom_integrations",
            text="How many custom integrations or APIs does this system have?",
            question_type=QuestionType.NUMBER,
            required=True,
            help_text="Custom integrations require testing and validation"
        ),
        PlanningQuestion(
            question_id="performance_requirements",
            text="Are there specific performance requirements that must be validated?",
            question_type=QuestionType.BOOLEAN,
            required=True,
            help_text="Performance testing ensures SLA compliance"
        ),
        PlanningQuestion(
            question_id="risk_factors",
            text="What are the primary risk factors for this system transition?",
            question_type=QuestionType.MULTI_SELECT,
            options=[
                "Data integrity concerns",
                "Complex dependencies",
                "Limited testing capability",
                "Tight timeline constraints",
                "Resource availability",
                "Vendor dependencies",
                "Legacy technology challenges",
                "Security vulnerabilities"
            ],
            required=False,
            help_text="Risk factors guide mitigation planning"
        )
    ]


def get_task_generation_prompt(context: dict) -> str:
    """
    Generate a prompt for creating system transition tasks based on context.

    Args:
        context: Dictionary containing analyzed responses and planning context

    Returns:
        Formatted prompt string for task generation
    """
    return f"""Based on the following system transition context, generate a comprehensive list of tasks:

Transition Type: {context.get('transition_type', 'Not specified')}
System Criticality: {context.get('system_criticality', 'Medium')}
User Count: {context.get('user_count', 0)}
Acceptable Downtime: {context.get('acceptable_downtime', 'Not specified')}
Data Volume: {context.get('data_volume', 'Not specified')}
Data Sensitivity: {context.get('data_sensitivity', 'Not specified')}
Dependent Systems: {context.get('dependent_systems', 0)}
Technical Complexity: {context.get('technical_complexity', 'Medium')}
Testing Environment Available: {context.get('testing_environment', False)}
Rollback Required: {context.get('rollback_required', True)}
Compliance Frameworks: {', '.join(context.get('compliance_frameworks', []))}
Documentation State: {context.get('documentation_state', 'Unknown')}
Custom Integrations: {context.get('custom_integrations', 0)}
Performance Testing Required: {context.get('performance_requirements', False)}
Risk Factors: {', '.join(context.get('risk_factors', []))}

Timeline: {context.get('timeline_weeks', 12)} weeks

Generate 20-30 specific, actionable tasks covering:
1. Pre-migration planning and assessment
2. Environment preparation and configuration
3. Data migration planning and execution
4. Integration testing phases
5. Security validation and compliance verification
6. Performance and load testing
7. User acceptance testing (UAT)
8. Rollback procedure development
9. Cutover planning and execution
10. Post-migration monitoring and support
11. Documentation updates
12. Training and communication

IMPORTANT: Return ONLY a valid JSON array of task objects. Do not include any explanatory text before or after the JSON.

Format your response as a JSON array where each task has this structure:
{{
    "title": "Clear, specific task title",
    "description": "Detailed description of what needs to be done",
    "priority": "Low|Medium|High|Critical",
    "assigned_role": "Technical Lead|System Administrator|Database Administrator|Security Officer|QA Tester|etc",
    "estimated_hours": <number>,
    "days_from_start": <number>,
    "duration_days": <number>,
    "dependencies": ["Task Title 1", "Task Title 2"],
    "tags": ["tag1", "tag2"]
}}

Ensure tasks are sequenced logically with proper dependencies.
Follow proper system transition methodology with appropriate testing gates.
Include tasks for all phases: plan, prepare, test, migrate, validate, stabilize.
Return ONLY the JSON array - no additional text.
"""


def get_milestone_generation_prompt(context: dict) -> str:
    """
    Generate a prompt for creating system transition milestones based on context.

    Args:
        context: Dictionary containing analyzed responses and planning context

    Returns:
        Formatted prompt string for milestone generation
    """
    return f"""Based on the following system transition context, generate 6-10 major milestones:

Transition Type: {context.get('transition_type', 'Not specified')}
System Criticality: {context.get('system_criticality', 'Medium')}
Timeline: {context.get('timeline_weeks', 12)} weeks
Testing Environment: {context.get('testing_environment', False)}
Rollback Required: {context.get('rollback_required', True)}

Generate milestones that represent major phases in the system transition:

1. Migration planning and design complete
2. Environment setup and configuration complete
3. Development/Test migration complete
4. Integration testing complete
5. Security and compliance validation complete
6. User acceptance testing complete
7. Rollback procedures validated
8. Production cutover complete
9. Post-migration stabilization complete
10. Transition formally closed

IMPORTANT: Return ONLY a valid JSON array of milestone objects. Do not include any explanatory text before or after the JSON.

Format your response as a JSON array where each milestone has this structure:
{{
    "title": "Clear milestone title",
    "description": "Description of what success looks like",
    "days_from_start": <number>,
    "priority": "Low|Medium|High|Critical",
    "assigned_role": "Technical Lead|System Administrator|etc",
    "success_criteria": ["criterion1", "criterion2", "criterion3"]
}}

Ensure milestones align with system transition methodology and are sequenced appropriately.
Critical systems should have more validation gates.
Return ONLY the JSON array - no additional text.
"""
