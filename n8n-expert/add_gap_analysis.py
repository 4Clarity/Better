#!/usr/bin/env python3.12
"""
Add gap analysis nodes to the N8N Expert Agent workflow.
This script modifies the workflow JSON to add gap analysis functionality.
"""

import json
import uuid

def generate_id():
    """Generate a unique ID for n8n nodes"""
    return str(uuid.uuid4())

def add_gap_analysis_nodes(workflow):
    """
    Add gap analysis nodes to the workflow.

    New flow:
    Aggregate → Gap Trigger → IF → Gap Analysis (FALSE) or Normal Flow (TRUE)
    """

    # Generate unique IDs for new nodes
    gap_trigger_id = generate_id()
    if_node_id = generate_id()
    gap_llm_id = generate_id()
    parse_gap_id = generate_id()
    merge_id = generate_id()
    format_response_id = generate_id()
    gap_chat_model_id = generate_id()

    # Node 1: Gap Analysis Trigger (Code node after Aggregate)
    gap_trigger_node = {
        "parameters": {
            "jsCode": """// Get all items and extract workflow IDs
const items = $input.all();
const allWorkflowIds = [];

// Collect workflow IDs from aggregated text field
items.forEach(item => {
  if (item.json.workflow_ids) {
    // Parse the workflow_ids array
    const ids = JSON.parse(item.json.workflow_ids);
    allWorkflowIds.push(...ids);
  }
});

// Count valid matches (not -1)
const validMatches = allWorkflowIds.filter(id => parseInt(id) !== -1);
const needsGapAnalysis = validMatches.length === 0;

// Get original query from Edit Fields node
const query = $('Edit Fields').first().json.query;

return [{
  json: {
    workflow_ids: items[0].json.workflow_ids,
    filtered_workflow_ids: allWorkflowIds,
    valid_workflow_ids: validMatches,
    needsGapAnalysis: needsGapAnalysis,
    hasValidMatches: validMatches.length > 0,
    match_count: validMatches.length,
    original_query: query
  }
}];"""
        },
        "id": gap_trigger_id,
        "name": "Gap Analysis Trigger",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1920, 640]
    }

    # Node 2: IF node to branch based on matches
    if_node = {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict"
                },
                "conditions": [
                    {
                        "id": generate_id(),
                        "leftValue": "={{ $json.hasValidMatches }}",
                        "rightValue": True,
                        "operator": {
                            "type": "boolean",
                            "operation": "equals"
                        }
                    }
                ],
                "combinator": "and"
            },
            "options": {}
        },
        "id": if_node_id,
        "name": "Check for Matches",
        "type": "n8n-nodes-base.if",
        "typeVersion": 2,
        "position": [2120, 640]
    }

    # Node 3: Gap Analysis Chat Model (OpenAI)
    gap_chat_model = {
        "parameters": {
            "model": "gpt-4o-mini",
            "options": {}
        },
        "id": gap_chat_model_id,
        "name": "Gap Analysis Chat Model",
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        "typeVersion": 1,
        "position": [2500, 840],
        "credentials": {
            "openAiApi": {
                "id": "05Q6PbnSdyEcu9Ze",
                "name": "OpenAi account"
            }
        }
    }

    # Node 4: Gap Analysis LLM (Basic LLM Chain)
    gap_llm_node = {
        "parameters": {
            "promptType": "define",
            "text": """Analyze this knowledge base gap:

USER QUERY: {{ $json.original_query }}

The vector search found workflows but they were all filtered as not relevant.

Generate a concise gap analysis (2-3 sentences per section) as JSON:

{
  "user_needs": "What workflow is the user looking for?",
  "available_workflows": "What types of workflows are in the knowledge base? (General categories)",
  "identified_gaps": "What's missing that prevents helping this user?",
  "suggestions": "Alternative queries, manual workflow building suggestions, or related workflows"
}

Output ONLY the JSON, nothing else."""
        },
        "id": gap_llm_id,
        "name": "Generate Gap Report",
        "type": "@n8n/n8n-nodes-langchain.chainLlm",
        "typeVersion": 1.4,
        "position": [2320, 840]
    }

    # Node 5: Parse Gap Report (Code)
    parse_gap_node = {
        "parameters": {
            "jsCode": """const items = $input.all();
const gapText = items[0].json.text || items[0].json.response?.text || "{}";

// Parse JSON from response
let gapReport;
try {
  const cleaned = gapText.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
  gapReport = JSON.parse(cleaned);
} catch (error) {
  gapReport = {
    user_needs: "Unable to parse gap analysis",
    available_workflows: gapText.substring(0, 200),
    identified_gaps: "Parsing error occurred",
    suggestions: "Please try rephrasing your query."
  };
}

return [{
  json: {
    ...items[0].json,
    gap_analysis: gapReport,
    needsGapAnalysis: true,
    hasValidMatches: false,
    original_query: items[0].json.original_query
  }
}];"""
        },
        "id": parse_gap_id,
        "name": "Parse Gap Report",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [2700, 840]
    }

    # Node 6: Merge node
    merge_node = {
        "parameters": {
            "mode": "combine",
            "combinationMode": "mergeByPosition",
            "options": {}
        },
        "id": merge_id,
        "name": "Merge Responses",
        "type": "n8n-nodes-base.merge",
        "typeVersion": 3,
        "position": [2900, 640]
    }

    # Node 7: Format Final Response (Code)
    format_response_node = {
        "parameters": {
            "jsCode": """const items = $input.all();
const data = items[0].json;

// Check if this is a gap analysis response
if (data.needsGapAnalysis && data.gap_analysis) {
  // Gap analysis response
  return [{
    json: {
      output: "I couldn't find workflows that directly match your query. Here's what I found:",
      data: [],
      gap_report: {
        what_you_need: data.gap_analysis.user_needs,
        what_we_have: data.gap_analysis.available_workflows,
        the_gap: data.gap_analysis.identified_gaps,
        suggestions: data.gap_analysis.suggestions
      },
      metadata: {
        total_matches: 0,
        query: data.original_query,
        gap_analysis_generated: true
      }
    }
  }];
} else {
  // Normal response - workflow matches found
  // Get aggregated data from Aggregate1 node
  const aggregated = $('Aggregate1').first().json;

  return [{
    json: {
      output: aggregated.data && aggregated.data.length > 0
        ? "Here are the recommended workflows to use as an example for you:"
        : "No related workflows found at this time.",
      data: aggregated.data || [],
      metadata: {
        total_matches: aggregated.data ? aggregated.data.length : 0,
        query: data.original_query || $('Edit Fields').first().json.query
      }
    }
  }];
}"""
        },
        "id": format_response_id,
        "name": "Format Final Response",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [3100, 640]
    }

    # Add new nodes to workflow
    workflow['nodes'].extend([
        gap_trigger_node,
        if_node,
        gap_chat_model,
        gap_llm_node,
        parse_gap_node,
        merge_node,
        format_response_node
    ])

    # Update connections
    # 1. Aggregate → Gap Trigger
    workflow['connections']['Aggregate'] = {
        "main": [[{"node": "Gap Analysis Trigger", "type": "main", "index": 0}]]
    }

    # 2. Gap Trigger → IF Node
    workflow['connections']['Gap Analysis Trigger'] = {
        "main": [[{"node": "Check for Matches", "type": "main", "index": 0}]]
    }

    # 3. IF Node → TRUE to Summarize, FALSE to Gap Analysis
    workflow['connections']['Check for Matches'] = {
        "main": [
            [{"node": "Summarize", "type": "main", "index": 0}],  # TRUE branch
            [{"node": "Generate Gap Report", "type": "main", "index": 0}]  # FALSE branch
        ]
    }

    # 4. Gap Chat Model → Gap LLM
    workflow['connections']['Gap Analysis Chat Model'] = {
        "ai_languageModel": [[{"node": "Generate Gap Report", "type": "ai_languageModel", "index": 0}]]
    }

    # 5. Gap LLM → Parse Gap Report
    workflow['connections']['Generate Gap Report'] = {
        "main": [[{"node": "Parse Gap Report", "type": "main", "index": 0}]]
    }

    # 6. Parse Gap Report → Merge
    workflow['connections']['Parse Gap Report'] = {
        "main": [[{"node": "Merge Responses", "type": "main", "index": 0}]]
    }

    # 7. Aggregate1 → Merge (instead of Edit Fields1)
    workflow['connections']['Aggregate1'] = {
        "main": [[{"node": "Merge Responses", "type": "main", "index": 1}]]
    }

    # 8. Merge → Format Final Response
    workflow['connections']['Merge Responses'] = {
        "main": [[{"node": "Format Final Response", "type": "main", "index": 0}]]
    }

    # 9. Format Final Response → Supabase1 (message logging)
    workflow['connections']['Format Final Response'] = {
        "main": [[{"node": "Supabase1", "type": "main", "index": 0}]]
    }

    # Update Supabase1 to use formatted output
    for node in workflow['nodes']:
        if node['name'] == 'Supabase1':
            node['parameters']['fieldsUi']['fieldValues'][1]['fieldValue'] = """={{ {
"type": "ai",
"content": $json.output,
"data": $json.data,
"gap_report": $json.gap_report || {},
"additional_kwargs": {},
"response_metadata": {}
} }}"""

    # Update Edit Fields2 to use formatted output
    for node in workflow['nodes']:
        if node['name'] == 'Edit Fields2':
            node['parameters']['assignments']['assignments'] = [
                {
                    "id": generate_id(),
                    "name": "output",
                    "value": "={{ $('Format Final Response').item.json.output }}",
                    "type": "string"
                },
                {
                    "id": generate_id(),
                    "name": "data",
                    "value": "={{ $('Format Final Response').item.json.data }}",
                    "type": "string"
                },
                {
                    "id": generate_id(),
                    "name": "gap_report",
                    "value": "={{ $('Format Final Response').item.json.gap_report }}",
                    "type": "object"
                }
            ]

    return workflow

def main():
    # Read original workflow
    with open('N8N_Expert_Agent.json', 'r') as f:
        workflow = json.load(f)

    print("✅ Loaded original workflow")
    print(f"   Original node count: {len(workflow['nodes'])}")

    # Add gap analysis nodes
    workflow = add_gap_analysis_nodes(workflow)

    print(f"✅ Added gap analysis nodes")
    print(f"   New node count: {len(workflow['nodes'])}")

    # Backup original
    with open('N8N_Expert_Agent.backup.json', 'w') as f:
        json.dump(workflow, f, indent=2)

    print("✅ Created backup: N8N_Expert_Agent.backup.json")

    # Save modified workflow
    with open('N8N_Expert_Agent.json', 'w') as f:
        json.dump(workflow, f, indent=2)

    print("✅ Saved modified workflow: N8N_Expert_Agent.json")
    print("\n🎉 Gap analysis implementation complete!")
    print("\nNext steps:")
    print("1. Import N8N_Expert_Agent.json into n8n")
    print("2. Verify all nodes are connected properly")
    print("3. Test with a query that has no matches")
    print("4. Test with a query that has matches")

if __name__ == "__main__":
    main()
