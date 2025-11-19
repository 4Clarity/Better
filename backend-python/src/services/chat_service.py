"""
AI Chat Service
Provides conversational AI assistance using Google Gemini API with RAG knowledge integration
Story: 1.5 - Roadmap UI Complete Implementation
Story: 2.2 - RAG Document Upload & Vector Search Implementation
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
import logging

from .vector_search import get_vector_search

logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ChatMessage:
    """Represents a single chat message"""
    def __init__(self, role: str, content: str, timestamp: Optional[datetime] = None):
        self.role = role  # 'user' or 'assistant'
        self.content = content
        self.timestamp = timestamp or datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat()
        }

class ChatSession:
    """Manages a chat session with conversation history"""
    def __init__(self, session_id: str, user_id: str, context: Optional[Dict[str, Any]] = None):
        self.session_id = session_id
        self.user_id = user_id
        self.context = context or {}
        self.messages: List[ChatMessage] = []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def add_message(self, role: str, content: str) -> ChatMessage:
        """Add a message to the conversation history"""
        message = ChatMessage(role, content)
        self.messages.append(message)
        self.updated_at = datetime.now()
        return message

    def get_history(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get conversation history"""
        messages = self.messages[-limit:] if limit else self.messages
        return [msg.to_dict() for msg in messages]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "context": self.context,
            "messages": self.get_history(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class ChatService:
    """Service for managing AI chat interactions with RAG knowledge integration"""

    def __init__(self):
        self.sessions: Dict[str, ChatSession] = {}
        self.model_name = "gemini-1.5-flash"  # Fast, efficient model for chat
        self.vector_search = get_vector_search()
        self.rag_enabled = True  # Enable RAG by default
        self.similarity_threshold = 0.6  # Lower threshold for broader matches
        self.max_context_chunks = 3  # Maximum knowledge chunks to include

    def create_session(self, session_id: str, user_id: str, context: Optional[Dict[str, Any]] = None) -> ChatSession:
        """Create a new chat session"""
        session = ChatSession(session_id, user_id, context)
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get an existing chat session"""
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    async def _query_knowledge_base(self, query: str) -> List[Dict[str, Any]]:
        """
        Query the RAG knowledge base for relevant context

        Args:
            query: User's question

        Returns:
            List of relevant knowledge chunks
        """
        try:
            if not self.rag_enabled:
                return []

            logger.info(f"Querying knowledge base for: {query[:100]}...")

            results = await self.vector_search.search_similar_chunks(
                query_text=query,
                limit=self.max_context_chunks,
                similarity_threshold=self.similarity_threshold
            )

            logger.info(f"Found {len(results)} relevant knowledge chunks")
            return results

        except Exception as e:
            logger.error(f"Error querying knowledge base: {str(e)}")
            return []

    def _format_knowledge_context(self, knowledge_chunks: List[Dict[str, Any]]) -> str:
        """
        Format knowledge chunks into context for the LLM

        Args:
            knowledge_chunks: Retrieved knowledge chunks

        Returns:
            Formatted context string
        """
        if not knowledge_chunks:
            return ""

        context_parts = ["\n--- KNOWLEDGE BASE CONTEXT ---"]

        for i, chunk in enumerate(knowledge_chunks, 1):
            context_parts.append(f"\n[Source {i}: {chunk['filename']} - Relevance: {chunk['similarity_score']:.2%}]")
            context_parts.append(chunk['content'])

        context_parts.append("\n--- END KNOWLEDGE BASE CONTEXT ---\n")

        return "\n".join(context_parts)

    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build system prompt based on context"""
        role = context.get("role", "user")
        transition_id = context.get("transitionId")

        base_prompt = """You are an AI assistant for the Transition Intelligence Platform (TIP), a government contract transition management system.
Your role is to help users manage contractor transitions effectively.

Key capabilities:
- Answer questions about transition processes and best practices
- Help navigate the platform features
- Provide guidance on knowledge transfer and handover procedures
- Assist with compliance and security requirements
- Offer suggestions for improving transition efficiency

When knowledge base context is provided:
- Use the provided context to answer questions accurately
- Cite sources by number (e.g., "According to Source 1...")
- If the context doesn't fully answer the question, say so clearly
- Combine knowledge base information with your general expertise

Always be:
- Professional and concise
- Focused on government contracting context
- Security-conscious (remind users about classification levels)
- Practical and actionable in your advice
"""

        role_specific = {
            "Government PM": """
You are assisting a Government Program Manager who oversees contractor transitions.
Focus on:
- Strategic oversight and decision-making
- Risk management and compliance
- Knowledge curation and quality control
- Resource allocation and timeline management
- Stakeholder communication
""",
            "Outgoing Contractor": """
You are assisting an Outgoing Contractor responsible for knowledge handover.
Focus on:
- Documentation best practices
- Knowledge transfer techniques
- Handover checklist completion
- Training session planning
- Ensuring continuity of operations
""",
            "Incoming Contractor": """
You are assisting an Incoming Contractor learning the systems and processes.
Focus on:
- Learning resources and training materials
- System architecture understanding
- Skills development and assessment
- Asking the right questions
- Building operational competency
"""
        }

        prompt = base_prompt
        if role in role_specific:
            prompt += "\n" + role_specific[role]

        if transition_id:
            prompt += f"\n\nCurrent transition context: {transition_id}"

        prompt += "\n\nRespond to user questions clearly and helpfully."
        return prompt

    async def send_message(
        self,
        session_id: str,
        message: str,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Send a message and get AI response with RAG knowledge integration

        Args:
            session_id: Chat session ID
            message: User message
            stream: Whether to stream the response (future enhancement)

        Returns:
            Dict with response data including knowledge sources
        """
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Add user message to history
        session.add_message("user", message)

        try:
            # Query knowledge base for relevant context
            knowledge_chunks = await self._query_knowledge_base(message)
            knowledge_context = self._format_knowledge_context(knowledge_chunks)

            # Initialize Gemini model
            model = genai.GenerativeModel(self.model_name)

            # Build conversation history for Gemini
            history = []
            for msg in session.messages[:-1]:  # Exclude the last message (current user message)
                history.append({
                    "role": "user" if msg.role == "user" else "model",
                    "parts": [msg.content]
                })

            # Start chat with history
            chat = model.start_chat(history=history)

            # Get system prompt
            system_prompt = self._build_system_prompt(session.context)

            # Build full message with knowledge context
            if len(session.messages) == 1:
                # First message: include system prompt
                full_message = f"{system_prompt}\n{knowledge_context}\nUser: {message}"
            else:
                # Subsequent messages: include knowledge context if available
                if knowledge_context:
                    full_message = f"{knowledge_context}\n{message}"
                else:
                    full_message = message

            # Get response
            response = chat.send_message(full_message)
            assistant_message = response.text

            # Add assistant response to history
            session.add_message("assistant", assistant_message)

            # Format knowledge sources for response
            sources = []
            if knowledge_chunks:
                for i, chunk in enumerate(knowledge_chunks, 1):
                    sources.append({
                        "source_number": i,
                        "filename": chunk['filename'],
                        "similarity_score": round(chunk['similarity_score'], 3),
                        "security_classification": chunk.get('security_classification', 'UNCLASSIFIED'),
                        "content_preview": chunk['content'][:200] + "..." if len(chunk['content']) > 200 else chunk['content']
                    })

            return {
                "success": True,
                "session_id": session_id,
                "message": {
                    "role": "assistant",
                    "content": assistant_message,
                    "timestamp": datetime.now().isoformat()
                },
                "knowledge_sources": sources,
                "knowledge_sources_used": len(sources),
                "conversation_length": len(session.messages)
            }

        except Exception as e:
            logger.error(f"Error in send_message: {str(e)}", exc_info=True)
            error_message = f"Error generating response: {str(e)}"
            return {
                "success": False,
                "error": error_message,
                "session_id": session_id
            }

    def get_session_history(self, session_id: str, limit: Optional[int] = None) -> Dict[str, Any]:
        """Get chat session history"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        return {
            "session_id": session_id,
            "user_id": session.user_id,
            "messages": session.get_history(limit),
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat()
        }

    def list_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """List all sessions for a user"""
        user_sessions = [
            session.to_dict()
            for session in self.sessions.values()
            if session.user_id == user_id
        ]
        return user_sessions

# Global chat service instance
chat_service = ChatService()
