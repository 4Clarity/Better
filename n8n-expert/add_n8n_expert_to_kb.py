#!/usr/bin/env python3.12
"""
Add the N8N Expert Agent workflow itself to the knowledge base.
This allows users to discover this AI-powered workflow recommendation system.
"""

import json
from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

def create_workflow_summaries(workflow_json):
    """Generate AI summaries of the N8N Expert Agent workflow"""

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)

    # Summary 1: What the workflow accomplishes
    accomplishment_prompt = f"""Analyze this n8n workflow and describe what it accomplishes in 2-3 sentences.

Workflow: N8N Expert Agent

Nodes: {len(workflow_json['nodes'])} nodes including:
- Webhook and Chatbot triggers
- OpenAI embeddings and chat
- Supabase vector store
- Gap analysis with AI
- Dual-trigger support

Focus on the user-facing functionality and value proposition."""

    accomplishment = llm.invoke(accomplishment_prompt).content

    # Summary 2: How nodes are configured
    nodes_summary = f"""This workflow uses {len(workflow_json['nodes'])} nodes:

Key nodes:
- Webhook & Chatbot Triggers: Dual entry points for API and chat interfaces
- Edit Fields: Unified data extraction handling both webhook and chatbot formats
- OpenAI Embeddings (text-embedding-3-small): Converts queries to 1536-dim vectors
- Supabase Vector Store: Semantic search using match_summaries() function
- Basic LLM Chain (5x parallel): Filters workflows by relevance using GPT-4o
- IF Node: Routes to gap analysis or normal flow based on matches
- Gap Analysis LLM (GPT-4o-mini): Generates actionable feedback when no matches found
- Format Response: Creates unified JSON output structure

Data flow: Trigger → Extract → Embed → Search → Filter → Branch (Gap/Normal) → Format → Respond"""

    # Summary 3: Variations and suggestions
    suggestions_prompt = f"""Based on this AI-powered workflow recommendation system, suggest 3-4 similar workflows that could be built using different services or expanded capabilities.

Current workflow:
- Uses OpenAI for embeddings and LLM
- Uses Supabase for vector storage
- Provides workflow recommendations
- Includes gap analysis

Suggest variations with different:
- AI providers (Anthropic, local LLMs)
- Vector databases (Pinecone, Weaviate)
- Use cases (code recommendations, documentation search, product search)"""

    suggestions = llm.invoke(suggestions_prompt).content

    return [accomplishment, nodes_summary, suggestions]

def ingest_n8n_expert():
    """Add N8N Expert Agent to knowledge base"""

    print("🚀 Adding N8N Expert Agent to knowledge base...")

    # Load workflow
    with open('N8N_Expert_Agent.json', 'r') as f:
        workflow = json.load(f)

    print(f"✅ Loaded N8N Expert Agent workflow ({len(workflow['nodes'])} nodes)")

    # Create workflow info
    workflow_id = 9999  # Use a high ID to avoid conflicts
    workflow_name = "AI-Powered Workflow Recommendation System (N8N Expert Agent)"
    workflow_description = """An intelligent n8n workflow that uses AI to recommend relevant workflows from a knowledge base. Features dual-trigger support (webhook + chatbot), semantic search with vector embeddings, LLM-powered relevance filtering, and gap analysis that provides actionable feedback when no matches are found. Built with OpenAI, Supabase, and advanced prompt engineering."""

    # Generate n8n demo component
    n8n_demo = f'<n8n-demo workflow=\'{json.dumps(workflow)}\'></n8n-demo>'

    print("🤖 Generating AI summaries...")
    summaries = create_workflow_summaries(workflow)

    print("✅ Generated summaries:")
    print(f"   - Accomplishment: {summaries[0][:80]}...")
    print(f"   - Nodes: {summaries[1][:80]}...")
    print(f"   - Suggestions: {summaries[2][:80]}...")

    # Create embeddings
    print("🔢 Generating embeddings...")
    combined_summaries = "\n\n".join(summaries)
    embeddings = OpenAIEmbeddings(model='text-embedding-3-small', dimensions=1536)
    embedding = embeddings.embed_query(combined_summaries)

    print(f"✅ Generated {len(embedding)}-dimensional embedding")

    # Store in Supabase
    print("💾 Storing in Supabase...")
    supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

    data = {
        "workflow_id": workflow_id,
        "workflow_name": workflow_name,
        "workflow_description": workflow_description,
        "workflow_json": json.dumps(workflow),
        "n8n_demo": n8n_demo,
        "summary_accomplishment": summaries[0],
        "summary_nodes": summaries[1],
        "summary_suggestions": summaries[2],
        "embedding": embedding,
        "content": combined_summaries,
        "metadata": {
            "workflow_id": workflow_id,
            "workflow_name": workflow_name,
            "workflow_description": workflow_description,
            "n8n_demo": n8n_demo,
            "workflow_json": workflow,
            "node_count": len(workflow['nodes']),
            "features": [
                "AI-powered recommendations",
                "Semantic search",
                "Gap analysis",
                "Dual-trigger support",
                "Vector embeddings",
                "LLM filtering"
            ],
            "technologies": ["OpenAI", "Supabase", "n8n", "LangChain"],
            "category": "AI/ML Workflows"
        }
    }

    # Use upsert to update if exists
    result = supabase.table("workflows").upsert(data, on_conflict="workflow_id").execute()

    print("✅ Stored in knowledge base")
    print(f"   Workflow ID: {workflow_id}")
    print(f"   Name: {workflow_name}")

    # Verify
    verify = supabase.table("workflows").select("workflow_id, workflow_name").eq("workflow_id", workflow_id).execute()

    if verify.data:
        print("\n🎉 SUCCESS! N8N Expert Agent added to knowledge base")
        print("\nNow users can discover this workflow by searching for:")
        print("  - 'AI workflow recommendations'")
        print("  - 'semantic search for workflows'")
        print("  - 'intelligent workflow discovery'")
        print("  - 'gap analysis for missing workflows'")
        print("  - 'chatbot workflow assistant'")
    else:
        print("\n⚠️  Verification failed - check Supabase manually")

if __name__ == "__main__":
    ingest_n8n_expert()
