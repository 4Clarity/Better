#!/usr/bin/env python3.12
"""Add chatbot trigger and update Edit Fields for dual-trigger support"""

import json
import uuid

def generate_id():
    """Generate a unique ID for n8n nodes"""
    return str(uuid.uuid4())

def add_chatbot_integration(workflow):
    """
    1. Add chatbot trigger node
    2. Update Edit Fields to handle both webhook and chatbot formats
    """

    # Generate ID for chatbot trigger
    chatbot_trigger_id = generate_id()

    # Add chatbot trigger node
    chatbot_trigger = {
        "parameters": {},
        "id": chatbot_trigger_id,
        "name": "When chat message received",
        "type": "@n8n/n8n-nodes-langchain.chatTrigger",
        "typeVersion": 1.1,
        "position": [460, 640],
        "webhookId": generate_id()
    }

    # Add chatbot trigger to nodes
    workflow['nodes'].append(chatbot_trigger)
    print("✅ Added chatbot trigger node")

    # Update Edit Fields node to handle both webhook and chatbot formats
    for node in workflow['nodes']:
        if node['name'] == 'Edit Fields':
            # Update field assignments with OR operators for dual-trigger support
            node['parameters']['assignments']['assignments'] = [
                {
                    "id": generate_id(),
                    "name": "query",
                    "value": "={{ $json.chatInput || $json.body.query }}",
                    "type": "string"
                },
                {
                    "id": generate_id(),
                    "name": "user_id",
                    "value": "={{ $json.user?.id || $json.body.user_id || 'chatbot-user' }}",
                    "type": "string"
                },
                {
                    "id": generate_id(),
                    "name": "request_id",
                    "value": "={{ $json.body.request_id || Date.now().toString() }}",
                    "type": "string"
                },
                {
                    "id": generate_id(),
                    "name": "session_id",
                    "value": "={{ $json.sessionId || $json.body.session_id || 'chatbot-session' }}",
                    "type": "string"
                }
            ]
            print("✅ Updated Edit Fields node for dual-trigger support")
            print("   - query: chatInput (chatbot) OR body.query (webhook)")
            print("   - user_id: user.id (chatbot) OR body.user_id (webhook)")
            print("   - session_id: sessionId (chatbot) OR body.session_id (webhook)")
            print("   - request_id: body.request_id (webhook) OR timestamp (chatbot)")

    # Add connection from chatbot trigger to Edit Fields
    workflow['connections']['When chat message received'] = {
        "main": [[{
            "node": "Edit Fields",
            "type": "main",
            "index": 0
        }]]
    }
    print("✅ Connected chatbot trigger to Edit Fields")

    return workflow

def main():
    # Read the workflow
    with open('N8N_Expert_Agent.json', 'r') as f:
        workflow = json.load(f)

    print("✅ Loaded workflow")
    print(f"   Current node count: {len(workflow['nodes'])}")

    # Add chatbot integration
    workflow = add_chatbot_integration(workflow)

    print(f"✅ Updated workflow")
    print(f"   New node count: {len(workflow['nodes'])}")

    # Save the updated workflow
    with open('N8N_Expert_Agent.json', 'w') as f:
        json.dump(workflow, f, indent=2)

    print("\n✅ Saved updated workflow: N8N_Expert_Agent.json")
    print("\n🎉 Chatbot integration complete!")
    print("\nNext steps:")
    print("1. Re-import N8N_Expert_Agent.json into n8n")
    print("2. Verify both webhook and chatbot triggers are present")
    print("3. Test with webhook (existing test)")
    print("4. Test with chatbot interface")

if __name__ == "__main__":
    main()
