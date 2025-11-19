"""
End-to-end test for AI Planning workflow.
Tests the complete flow from session creation to AI recommendation generation.
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000/api/ai-planning"
HEADERS = {"x-auth-bypass": "true", "Content-Type": "application/json"}

def test_ai_planning_workflow():
    """Test complete AI planning workflow"""

    print("=" * 60)
    print("AI PLANNING END-TO-END TEST")
    print("=" * 60)

    # Step 1: Create planning session
    print("\n1️⃣  Creating planning session...")
    create_response = requests.post(
        f"{BASE_URL}/sessions/start",
        headers=HEADERS,
        json={
            "transition_id": "test-transition-123",
            "transition_type": "Contract",
            "execution_mode": "DirectLLM",
            "user_id": "test-user-123"
        }
    )

    if create_response.status_code != 200:
        print(f"❌ Failed to create session: {create_response.status_code}")
        print(create_response.text)
        return False

    session_data = create_response.json()
    session_id = session_data["session_id"]
    questions = session_data["questions_asked"]

    print(f"✅ Session created: {session_id}")
    print(f"   Generated {len(questions)} questions")

    # Step 2: Submit responses to all required questions
    print("\n2️⃣  Submitting responses to questions...")

    responses = []
    for question in questions:
        if question["required"]:
            # Provide sample answers based on question type
            answer = get_sample_answer(question)
            print(f"   Q: {question['question_id']} | Type: {question.get('question_type')} | Answer: {answer}")
            responses.append({
                "question_id": question["question_id"],
                "answer": answer
            })

    respond_response = requests.post(
        f"{BASE_URL}/sessions/{session_id}/respond",
        headers=HEADERS,
        json=responses
    )

    if respond_response.status_code != 200:
        print(f"❌ Failed to submit responses: {respond_response.status_code}")
        print(respond_response.text)
        return False

    updated_session = respond_response.json()
    print(f"✅ Submitted {len(responses)} responses")
    print(f"   Session complete: {updated_session.get('is_complete', False)}")

    # Step 3: Generate AI recommendations
    print("\n3️⃣  Generating AI recommendations...")
    print("   (This may take 5-10 seconds...)")

    start_time = time.time()
    generate_response = requests.post(
        f"{BASE_URL}/sessions/{session_id}/generate",
        headers=HEADERS,
        timeout=120  # 2 minute timeout
    )
    elapsed_time = time.time() - start_time

    if generate_response.status_code != 200:
        print(f"❌ Failed to generate recommendations: {generate_response.status_code}")
        print(generate_response.text)
        return False

    recommendations = generate_response.json()
    tasks = recommendations.get("tasks", [])
    milestones = recommendations.get("milestones", [])

    print(f"✅ Generation successful ({elapsed_time:.1f}s)")
    print(f"   Generated {len(tasks)} tasks")
    print(f"   Generated {len(milestones)} milestones")

    # Step 4: Display sample recommendations
    print("\n4️⃣  Sample Recommendations:")

    if tasks:
        print(f"\n📋 First Task:")
        first_task = tasks[0]
        print(f"   Title: {first_task.get('title', 'N/A')}")
        print(f"   Priority: {first_task.get('priority', 'N/A')}")
        print(f"   Assigned Role: {first_task.get('assigned_role', 'N/A')}")
        print(f"   Description: {first_task.get('description', 'N/A')[:80]}...")

    if milestones:
        print(f"\n🎯 First Milestone:")
        first_milestone = milestones[0]
        print(f"   Title: {first_milestone.get('title', 'N/A')}")
        print(f"   Days from start: {first_milestone.get('days_from_start', 'N/A')}")
        print(f"   Priority: {first_milestone.get('priority', 'N/A')}")

    # Step 5: Accept recommendations
    print("\n5️⃣  Accepting recommendations...")

    task_ids = [i for i in range(len(tasks))]
    milestone_ids = [i for i in range(len(milestones))]

    accept_response = requests.post(
        f"{BASE_URL}/sessions/{session_id}/accept",
        headers=HEADERS,
        json={
            "task_ids": task_ids,
            "milestone_ids": milestone_ids
        }
    )

    if accept_response.status_code != 200:
        print(f"❌ Failed to accept recommendations: {accept_response.status_code}")
        print(accept_response.text)
        return False

    accept_data = accept_response.json()
    print(f"✅ Accepted {accept_data['tasks_created']} tasks and {accept_data['milestones_created']} milestones")

    # Success!
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print(f"\n📊 Summary:")
    print(f"   Session ID: {session_id}")
    print(f"   Questions: {len(questions)}")
    print(f"   Responses: {len(responses)}")
    print(f"   Tasks: {len(tasks)}")
    print(f"   Milestones: {len(milestones)}")
    print(f"   Generation Time: {elapsed_time:.1f}s")

    return True


def get_sample_answer(question):
    """Generate sample answer based on question type and ID"""
    question_id = question["question_id"]
    question_type = str(question.get("question_type", "")).lower()  # Convert to lowercase
    options = question.get("options", [])

    # Handle specific question IDs
    if options:
        # For select/multi-select questions, return first option or list of options
        if "multi" in question_type:
            return [options[0]] if options else []
        return options[0]

    # Handle boolean questions
    if "boolean" in question_type:
        return True if "required" in question_id or "transfer" in question_id else False

    # Handle number questions
    if "number" in question_type:
        if "deliverables" in question_id:
            return 3
        elif "personnel" in question_id or "contractor" in question_id:
            return 5
        elif "stakeholder" in question_id:
            return 8
        elif "timeline" in question_id or "duration" in question_id or "weeks" in question_id:
            return 12
        else:
            return 5

    # Default text response
    return "Sample text response"


if __name__ == "__main__":
    try:
        success = test_ai_planning_workflow()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
