#!/usr/bin/env python3.12
"""
Enhance gap analysis to provide more specific details about missing functionality.
Also add a node to query actual workflow names from knowledge base.
"""

import json
import uuid

def generate_id():
    return str(uuid.uuid4())

def enhance_gap_analysis(workflow):
    """
    1. Add Supabase node to fetch actual workflow names
    2. Enhance gap analysis prompt with more specific instructions
    """

    # Add Supabase node to fetch workflow categories/names
    fetch_workflows_id = generate_id()
    fetch_workflows_node = {
        "parameters": {
            "operation": "getAll",
            "tableId": "workflows",
            "returnAll": True,
            "options": {}
        },
        "id": fetch_workflows_id,
        "name": "Fetch Workflow Categories",
        "type": "n8n-nodes-base.supabase",
        "typeVersion": 1,
        "position": [2140, 840],
        "credentials": {
            "supabaseApi": {
                "id": "hOLIm3Jeg9JcG616",
                "name": "Prod Supabase account"
            }
        }
    }

    workflow['nodes'].append(fetch_workflows_node)
    print("✅ Added 'Fetch Workflow Categories' node")

    # Update Generate Gap Report prompt with enhanced instructions
    for node in workflow['nodes']:
        if node['name'] == 'Generate Gap Report':
            node['parameters']['text'] = """You are analyzing a gap in an n8n workflow knowledge base.

USER QUERY:
{{ $json.original_query }}

AVAILABLE WORKFLOWS IN KNOWLEDGE BASE:
{{ $('Fetch Workflow Categories').all().map(w => `- ${w.json.workflow_name}`).join('\\n') }}

CONTEXT:
The vector search found some workflows, but the LLM determined they were all irrelevant to the user's query. This means there's a knowledge gap.

YOUR TASK:
Generate a detailed gap analysis as JSON with these sections:

1. **user_needs**: Analyze what the user is trying to accomplish. Be specific about:
   - The automation goal
   - Key processes or data flows involved
   - Expected inputs and outputs

2. **available_workflows**: Summarize the workflows currently in the knowledge base. Group them by:
   - Data integration workflows (databases, spreadsheets, APIs)
   - Communication workflows (email, Slack, notifications)
   - Data processing workflows (transformations, analysis)
   - List 2-3 specific examples

3. **identified_gaps**: Be VERY specific about what's missing:
   - **Missing n8n nodes**: Name specific nodes needed (e.g., "Twitter API node", "Sentiment Analysis node")
   - **Missing integrations**: Name services/platforms needed (e.g., "Social media APIs", "NLP services")
   - **Missing workflow patterns**: Describe workflow types (e.g., "Real-time data streaming", "ML model integration")

4. **suggestions**: Provide actionable next steps:
   - **Alternative queries**: 2-3 different ways to search (be specific, use actual n8n terminology)
   - **Manual build guide**: List specific n8n nodes to use in order (e.g., "HTTP Request → OpenAI → Postgres → Send Email")
   - **Related workflows**: Mention any partially-relevant workflows from the knowledge base that could be adapted

FORMAT:
Output as valid JSON only (no markdown, no explanations):

{
  "user_needs": "...",
  "available_workflows": "...",
  "identified_gaps": "...",
  "suggestions": "..."
}

Be specific, technical, and actionable. Users need to know exactly what's missing and how to proceed."""

            print("✅ Enhanced 'Generate Gap Report' prompt")
            print("   - Now includes actual workflow names from knowledge base")
            print("   - More specific instructions for gap identification")
            print("   - Requires specific n8n node names")
            print("   - Provides detailed manual build guide")

    # Update connections: IF FALSE branch → Fetch Workflow Categories → Generate Gap Report
    workflow['connections']['Check for Matches'][1] = [
        {"node": "Fetch Workflow Categories", "type": "main", "index": 0}
    ]

    workflow['connections']['Fetch Workflow Categories'] = {
        "main": [[{"node": "Generate Gap Report", "type": "main", "index": 0}]]
    }

    print("✅ Updated connections:")
    print("   IF (FALSE) → Fetch Workflow Categories → Generate Gap Report")

    return workflow

def main():
    # Read workflow
    with open('N8N_Expert_Agent.json', 'r') as f:
        workflow = json.load(f)

    print("✅ Loaded workflow")
    print(f"   Current node count: {len(workflow['nodes'])}")

    # Enhance gap analysis
    workflow = enhance_gap_analysis(workflow)

    print(f"✅ Enhanced workflow")
    print(f"   New node count: {len(workflow['nodes'])}")

    # Save
    with open('N8N_Expert_Agent.json', 'w') as f:
        json.dump(workflow, f, indent=2)

    print("\n✅ Saved enhanced workflow: N8N_Expert_Agent.json")
    print("\n🎉 Gap analysis enhancement complete!")
    print("\nThe gap analysis will now:")
    print("1. Fetch actual workflow names from knowledge base")
    print("2. Provide specific missing n8n node names")
    print("3. Give detailed manual build instructions")
    print("4. List alternative search queries")
    print("\nNext steps:")
    print("1. Re-import N8N_Expert_Agent.json into n8n")
    print("2. Test with a no-match query")
    print("3. Verify gap report includes specific n8n nodes and integrations")

if __name__ == "__main__":
    main()
