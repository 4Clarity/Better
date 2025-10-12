# TIPS Knowledge Base - Complete n8n Implementation Guide

## 🎯 Overview

This is a comprehensive, production-ready implementation of the TIPS Knowledge Base system with 7 core workflows and 21 total sub-workflows integrated into n8n.

## 📋 Workflows Included

### Core Workflows (Created)
1. **Master Orchestrator** - Routes all events to appropriate workflows
2. **Document Ingestion Pipeline** - Handles file uploads, chunking, version management
3. **Message Processing Pipeline** - Classifies messages, handles questions/directives
4. **User Onboarding Pipeline** - Personalized learning paths, progress tracking
5. **User Offboarding Pipeline** - Survey generation, knowledge capture
6. **Transition Management** - Handles major/minor/personnel transitions
7. **Search & Retrieval** - Context-aware search with user personalization
8. **Baseline Generation** - Creates best practices from all sources

### Supporting Workflows (Referenced)
- Duplicate Detection
- Version Management  
- Override Processing
- Approval Routing
- Notification & Communication
- Analytics & Improvement
- Error Recovery

## 🔧 Prerequisites

### Infrastructure Required

**1. n8n Instance**
- Version: 1.0+
- Self-hosted or Cloud
- Minimum: 4GB RAM, 2 CPU cores

**2. Databases**
```yaml
MongoDB:
  - Collections: documents, chunks, users, messages, approvals, reviews, etc.
  - Indexes: Required on chunk_id, document_id, user_id, embedding fields

PostgreSQL (Alternative):
  - Can replace MongoDB for metadata storage

Neo4j (Graph DB):
  - Version: 4.4+
  - For relationship storage and graph traversal

Vector Database:
  - Pinecone / Weaviate / Qdrant
  - For semantic search
```

**3. APIs & Services**
```yaml
Claude API:
  - Model: claude-sonnet-4-20250514
  - Rate Limit: Consider usage for high-volume processing
  
OpenAI API:
  - For embeddings: text-embedding-3-small
  
Slack API:
  - For notifications
  
Email Service:
  - SMTP or API-based (SendGrid, Mailgun, etc.)
```

## 📥 Installation Steps

### Step 1: Import Workflows

1. **Import Master Orchestrator**
```bash
# In n8n UI: Workflows > Import from File/URL
# Import: tips_kb_master_workflow.json
```

2. **Import Core Workflows** (in order)
   - Document Ingestion Pipeline
   - Message Processing Pipeline
   - User Onboarding Pipeline
   - User Offboarding Pipeline
   - Transition Management
   - Search & Retrieval
   - Baseline Generation

3. **Link Workflow IDs**
   - In Master Orchestrator, update `workflow_ids` with actual n8n workflow IDs
   - Update `executeWorkflow` nodes with correct IDs

### Step 2: Configure Credentials

**Claude API**
```yaml
Name: Claude API Key
Type: HTTP Header Auth
Header Name: x-api-key
Header Value: <your-claude-api-key>
```

**OpenAI API**
```yaml
Name: OpenAI API
Type: OpenAI API
API Key: <your-openai-api-key>
```

**MongoDB**
```yaml
Name: MongoDB TIPS KB
Connection String: mongodb://user:pass@host:port/database
```

**Neo4j**
```yaml
Name: Neo4j TIPS KB
URL: bolt://host:7687
Username: neo4j
Password: <your-password>
```

**Slack**
```yaml
Name: Slack TIPS Team
OAuth Token: xoxb-...
```

### Step 3: Database Schema Setup

**MongoDB Collections:**
```javascript
// Documents
db.createCollection("documents")
db.documents.createIndex({ "file_hash": 1 })
db.documents.createIndex({ "product": 1, "topic": 1 })
db.documents.createIndex({ "currency_status": 1 })

// Chunks
db.createCollection("chunks")
db.chunks.createIndex({ "chunk_id": 1 }, { unique: true })
db.chunks.createIndex({ "document_id": 1 })
db.chunks.createIndex({ "standalone_score": 1 })

// Users
db.createCollection("users")
db.users.createIndex({ "user_id": 1 }, { unique: true })
db.users.createIndex({ "status": 1 })

// Messages
db.createCollection("messages")
db.messages.createIndex({ "message_id": 1 }, { unique: true })
db.messages.createIndex({ "classification.message_type": 1 })

// Approvals
db.createCollection("approval_queue")
db.approval_queue.createIndex({ "status": 1 })
db.approval_queue.createIndex({ "directive_id": 1 })

// Review Queue
db.createCollection("review_queue")
db.review_queue.createIndex({ "status": 1 })

// Baselines
db.createCollection("baselines")
db.baselines.createIndex({ "product": 1, "status": 1 })

// Transitions
db.createCollection("transitions")
db.transitions.createIndex({ "transition_id": 1 }, { unique: true })

// Onboarding Roadmaps
db.createCollection("onboarding_roadmaps")
db.onboarding_roadmaps.createIndex({ "product": 1 })

// Offboarding Surveys
db.createCollection("offboarding_surveys")
db.offboarding_surveys.createIndex({ "user_id": 1 })

// Audit Log
db.createCollection("audit_log")
db.audit_log.createIndex({ "timestamp": -1 })
```

**Neo4j Constraints:**
```cypher
CREATE CONSTRAINT doc_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (c:Chunk) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT message_id IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT baseline_id IF NOT EXISTS FOR (b:Baseline) REQUIRE b.id IS UNIQUE;
```

### Step 4: Vector Store Setup

**Pinecone Example:**
```python
import pinecone

pinecone.init(api_key="your-api-key", environment="your-env")

# Create index
pinecone.create_index(
    name="tips-kb-chunks",
    dimension=1536,  # text-embedding-3-small
    metric="cosine",
    metadata_config={
        "indexed": ["document_id", "currency_status", "chunk_type"]
    }
)
```

### Step 5: Environment Variables

Create `.env` file or set in n8n:
```bash
# APIs
CLAUDE_API_KEY=your-claude-key
OPENAI_API_KEY=your-openai-key

# Databases
MONGODB_URI=mongodb://user:pass@host:port/tips_kb
NEO4J_URI=bolt://host:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Vector Store
VECTOR_STORE_URL=https://your-pinecone-index.io
VECTOR_STORE_API_KEY=your-vector-key

# Services
SLACK_TOKEN=xoxb-your-slack-token
EMAIL_SERVICE_URL=https://api.sendgrid.com/v3/mail/send
EMAIL_API_KEY=your-email-key

# Configuration
APPROVAL_TIMEOUT_HOURS=48
DUPLICATE_SIMILARITY_THRESHOLD=0.85
LOW_CONFIDENCE_THRESHOLD=0.7
```

## 🚀 Usage Guide

### Triggering Workflows

**1. Document Upload**
```bash
curl -X POST https://your-n8n.com/webhook/file-upload \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "file_upload",
    "file_path": "/uploads/SOP-v2.1.pdf",
    "file_name": "SOP-v2.1.pdf",
    "product": "TIPS",
    "source": "standard"
  }'
```

**6. Transition Event**
```bash
curl -X POST https://your-n8n.com/webhook/user-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "transition_initiated",
    "event_description": "TIPS v3.0 major release",
    "systems_affected": ["TIPS", "DataPipeline"],
    "affected_users": ["user-1", "user-2"],
    "user_count": 25,
    "user_roles": ["engineer", "analyst"]
  }'
```

**7. Baseline Generation (Manual Trigger)**
```bash
curl -X POST https://your-n8n.com/webhook/trigger-baseline \
  -H "Content-Type: application/json" \
  -d '{
    "product": "TIPS",
    "reason": "major_update"
  }'
```

## 🔐 Security & Access Control

### Role-Based Permissions

Configure in MongoDB `users` collection:
```json
{
  "user_id": "user-123",
  "role": "data_engineer",
  "permissions": {
    "read": ["all_technical_docs"],
    "write": [],
    "approve": []
  }
}
```

**Role Definitions:**
- `data_engineer`: Read all technical docs
- `product_manager`: Read all, write roadmaps/config, approve directives
- `admin`: Full access
- `auditor`: Read all + history, audit trail access

### API Security

**Webhook Authentication:**
```javascript
// Add to webhook nodes
{
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "X-API-Key",
    "value": "{{$env.WEBHOOK_SECRET}}"
  }
}
```

## 📊 Monitoring & Observability

### Key Metrics to Track

**1. Ingestion Pipeline**
- Documents processed per day
- Average processing time
- Duplicate detection rate
- Classification confidence scores

**2. User Lifecycle**
- Onboarding completion rate
- Average time to productivity
- Offboarding survey completion rate
- Knowledge capture success rate

**3. Search Performance**
- Query response time (p95)
- Search relevance (user feedback)
- Context expansion usage
- Cache hit rate

**4. System Health**
- Claude API usage & rate limits
- Vector store query latency
- Database connection health
- Workflow execution success rate

### Logging Strategy

**Audit Trail (MongoDB):**
```json
{
  "event_id": "audit-12345",
  "timestamp": "2025-09-27T14:30:00Z",
  "event_type": "directive_approved",
  "user": "manager-123",
  "action": "approved_override",
  "target": {
    "directive_id": "msg-789",
    "affected_documents": ["doc-123"]
  }
}
```

**Error Logging:**
- Failed workflow executions → Slack alerts
- Low confidence classifications → Review queue
- API failures → Retry with exponential backoff

## 🧪 Testing Guide

### Unit Tests (per workflow)

**1. Document Ingestion:**
```bash
# Test duplicate detection
POST /webhook/file-upload
{
  "file_hash": "abc123...",  # Known duplicate hash
  "expected_result": "cataloged_as_duplicate"
}

# Test version extraction
POST /webhook/file-upload
{
  "content": "Version 2.1...",
  "expected_version": "2.1"
}
```

**2. Message Classification:**
```bash
# Test question detection
POST /webhook/message-received
{
  "content": "How do I configure the retry logic?",
  "expected_type": "question"
}

# Test directive detection
POST /webhook/message-received
{
  "content": "Effective immediately, all changes require dual approval",
  "expected_type": "directive",
  "expected_system_changing": true
}
```

**3. Search & Retrieval:**
```bash
# Test context expansion
POST /webhook/search
{
  "query": "version conflict resolution",
  "user_id": "beginner-user",
  "expected_context": true
}
```

### Integration Tests

**End-to-End Scenarios:**

1. **Full Document Lifecycle**
   - Upload document → Classify → Chunk → Index → Search → Retrieve

2. **Directive Approval Flow**
   - Message received → Classify as directive → Analyze override → Queue approval → Apply override

3. **User Journey**
   - Onboard user → Complete modules → Search content → Progress tracking → Generate scorecard

4. **Knowledge Capture**
   - Initiate offboarding → Generate survey → Capture knowledge → Validate → Document → Ingest

### Load Testing

**Stress Test Scenarios:**
```bash
# Concurrent document uploads
for i in {1..100}; do
  curl -X POST webhook/file-upload -d @doc$i.json &
done

# Search load test
ab -n 1000 -c 50 -p search_query.json webhook/search
```

## 🔄 Operational Procedures

### Daily Operations

**Morning Checklist:**
- [ ] Check workflow execution dashboard
- [ ] Review overnight ingestion queue
- [ ] Process approval queue items
- [ ] Monitor API rate limit usage

**Approval Queue Management:**
- Review pending directives (SLA: 48 hours)
- Validate contradictions flagged by system
- Process baseline reviews

### Weekly Operations

**Maintenance Tasks:**
- [ ] Run baseline generation (automated Sunday nights)
- [ ] Review knowledge gaps from onboarding questions
- [ ] Analyze offboarding survey insights
- [ ] Update transition configurations if needed

**Performance Review:**
- Check search relevance scores
- Review Claude API costs
- Analyze user progress metrics
- Identify documentation gaps

### Monthly Operations

**Strategic Review:**
- [ ] Analyze learning effectiveness (completion rates, scores)
- [ ] Review knowledge capture from offboarding
- [ ] Assess transition management effectiveness
- [ ] Plan roadmap updates based on analytics

## 🐛 Troubleshooting Guide

### Common Issues

**1. Workflow Not Triggering**
```bash
# Check webhook is active
curl https://your-n8n.com/webhook/file-upload

# Verify credentials
# n8n UI → Credentials → Test connection

# Check workflow is active
# n8n UI → Workflows → Activate toggle
```

**2. Claude API Errors**
```javascript
// Rate limit hit
Error: 429 Too Many Requests
Solution: Implement exponential backoff, upgrade API tier

// Invalid response
Error: JSON parse error
Solution: Check prompt formatting, validate response structure
```

**3. Vector Search Not Returning Results**
```bash
# Check vector store connection
curl -X POST $VECTOR_STORE_URL/query \
  -H "Authorization: Bearer $VECTOR_STORE_API_KEY" \
  -d '{"vector": [...], "top_k": 10}'

# Verify embeddings are being generated
# Check OpenAI API logs

# Rebuild index if corrupted
# Re-run ingestion for affected documents
```

**4. Low Classification Confidence**
```javascript
// Many items in review queue with confidence < 0.7
Solution: 
- Review and improve Claude prompts
- Add more context to classification requests
- Train on reviewed items (feedback loop)
```

**5. Context Not Expanding**
```javascript
// User clicks "expand context" but nothing happens
Check: 
- chunk.requires_context_from is populated
- Context chunks exist in database
- Webhook for context expansion is active
```

### Recovery Procedures

**Database Corruption:**
```bash
# MongoDB
mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)
mongorestore --uri="$MONGODB_URI" /backup/20250927

# Neo4j
neo4j-admin backup --backup-dir=/backup --name=graph-backup
neo4j-admin restore --from=/backup/graph-backup
```

**Workflow Failure Recovery:**
```javascript
// Re-run failed executions
1. n8n UI → Executions → Filter by "Error"
2. Select failed execution
3. Click "Retry Execution"
4. Monitor for success

// Bulk retry
// Use n8n API to retry multiple executions
```

## 📈 Scaling Considerations

### Horizontal Scaling

**n8n Workers:**
```yaml
# docker-compose.yml
version: '3'
services:
  n8n-main:
    image: n8nio/n8n
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
    
  n8n-worker-1:
    image: n8nio/n8n
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
  
  n8n-worker-2:
    image: n8nio/n8n
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
```

**Database Sharding:**
```javascript
// MongoDB sharding by product
sh.enableSharding("tips_kb")
sh.shardCollection("tips_kb.documents", { "product": 1 })
sh.shardCollection("tips_kb.chunks", { "document_id": 1 })
```

**Vector Store Partitioning:**
```python
# Create separate indexes per product
products = ["TIPS", "DataPipeline", "Analytics"]
for product in products:
    pinecone.create_index(
        name=f"tips-kb-{product.lower()}",
        dimension=1536
    )
```

### Performance Optimization

**Caching Strategy:**
```javascript
// Redis cache for frequent queries
const cache = require('redis').createClient();

// Cache search results (1 hour TTL)
const cacheKey = `search:${hash(query)}`;
const cached = await cache.get(cacheKey);
if (cached) return JSON.parse(cached);

// Execute search and cache
const results = await search(query);
await cache.setex(cacheKey, 3600, JSON.stringify(results));
```

**Batch Processing:**
```javascript
// Process documents in batches
const BATCH_SIZE = 10;
for (let i = 0; i < documents.length; i += BATCH_SIZE) {
  const batch = documents.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(doc => processDocument(doc)));
}
```

## 🔧 Configuration Management

### Transition Type Configuration

**Product Manager Interface (MongoDB):**
```json
{
  "transition_type": "major",
  "description": "Significant system change, new version, architecture overhaul",
  "triggers": [
    "version_change_major",
    "architecture_redesign",
    "new_product_launch"
  ],
  "offboarding_requirements": {
    "survey_depth": "comprehensive",
    "technical_questions": "advanced",
    "knowledge_transfer": "mandatory",
    "documentation_priority": "high",
    "approval_required": true,
    "transition_time_days": 30
  },
  "onboarding_requirements": {
    "roadmap_update": "required",
    "new_module_creation": "likely",
    "assessment_revision": "required",
    "accelerated_timeline": false
  },
  "automation_triggers": [
    "generate_comprehensive_offboarding_survey",
    "flag_all_documentation_for_review",
    "notify_product_manager",
    "create_transition_task_list",
    "schedule_knowledge_transfer_sessions"
  ]
}
```

### Roadmap Configuration

**Learning Module Definition:**
```json
{
  "roadmap_id": "onboard-tips-v1",
  "product": "TIPS",
  "learning_modules": [
    {
      "module_id": "mod-001",
      "module_name": "TIPS Architecture Overview",
      "sequence_order": 1,
      "required": true,
      "estimated_time_hours": 2,
      "prerequisites": [],
      "content_sources": {
        "documents": ["doc-123", "doc-456"],
        "baseline_sections": ["bp-tips-architecture"],
        "qa_pairs": ["qa-045", "qa-067"]
      },
      "assessment_criteria": {
        "quiz_questions": ["q-001", "q-002"],
        "passing_score": 80
      }
    }
  ],
  "role_based_paths": {
    "data_engineer": ["mod-001", "mod-002", "mod-005"],
    "analyst": ["mod-001", "mod-003", "mod-006"]
  }
}
```

## 📚 Advanced Features

### Custom Integrations

**Slack Commands:**
```javascript
// /tips search <query>
app.command('/tips', async ({ command, ack, respond }) => {
  await ack();
  
  const result = await fetch('https://n8n.com/webhook/search', {
    method: 'POST',
    body: JSON.stringify({ query: command.text })
  });
  
  await respond(result);
});
```

**API Extensions:**
```javascript
// Custom endpoint for external systems
app.post('/api/knowledge/query', async (req, res) => {
  const { query, context } = req.body;
  
  // Trigger n8n workflow
  const result = await triggerWorkflow('search_retrieval', {
    query,
    user_context: context
  });
  
  res.json(result);
});
```

### Analytics Dashboard

**Metrics to Display:**
- Documents ingested (trend)
- Active learners progress
- Approval queue backlog
- Knowledge gaps identified
- Search usage patterns
- Offboarding insights captured

**Implementation:**
```javascript
// Aggregate metrics from MongoDB
db.documents.aggregate([
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$ingestion_date" }},
    count: { $sum: 1 }
  }},
  { $sort: { _id: -1 }},
  { $limit: 30 }
])
```

## 🎓 Training Materials

### For Product Managers

**Topics to Cover:**
1. Configuring onboarding roadmaps
2. Defining transition types
3. Reviewing and approving baselines
4. Managing approval queues
5. Analyzing knowledge gaps

**Hands-on Exercises:**
- Create a new learning module
- Configure a minor transition type
- Approve a directive with override
- Generate and review a baseline

### For End Users

**Topics to Cover:**
1. Searching the knowledge base effectively
2. Understanding context expansion
3. Completing onboarding modules
4. Requesting custom learning paths
5. Participating in offboarding surveys

### For Administrators

**Topics to Cover:**
1. Workflow monitoring and maintenance
2. Database management
3. Troubleshooting common issues
4. Performance optimization
5. Security and access control

## 📝 Changelog & Versioning

### Version 1.0.0 (Current)
- ✅ Core 7 workflows implemented
- ✅ Claude Sonnet 4 integration
- ✅ User lifecycle management
- ✅ Transition orchestration
- ✅ Context-aware search
- ✅ Baseline generation

### Roadmap (Future Versions)

**Version 1.1.0**
- [ ] Advanced analytics dashboard
- [ ] Machine learning for classification improvement
- [ ] Multi-language support
- [ ] Mobile app integration

**Version 1.2.0**
- [ ] Video/audio content support
- [ ] Real-time collaboration features
- [ ] Advanced visualization tools
- [ ] Automated content generation

## 🆘 Support Resources

### Documentation
- n8n Official Docs: https://docs.n8n.io
- Claude API Docs: https://docs.anthropic.com
- MongoDB Docs: https://docs.mongodb.com
- Neo4j Docs: https://neo4j.com/docs

### Community
- n8n Community Forum: https://community.n8n.io
- Internal Slack: #tips-knowledge-base
- Product Team: tips-pm@company.com

### Escalation Path
1. Check documentation and troubleshooting guide
2. Search internal knowledge base
3. Post in Slack #tips-support
4. Create ticket with IT support
5. Escalate to Product Manager

## ✅ Go-Live Checklist

### Pre-Launch (1 week before)
- [ ] All workflows imported and tested
- [ ] Databases configured and indexed
- [ ] Credentials configured for all services
- [ ] Initial document set ingested (500+ docs)
- [ ] User accounts created and roles assigned
- [ ] Roadmaps configured for all products
- [ ] Transition types defined
- [ ] Product Manager trained
- [ ] Load testing completed
- [ ] Backup and recovery tested

### Launch Day
- [ ] System health check passed
- [ ] Monitoring dashboards active
- [ ] All workflows activated
- [ ] User notifications sent
- [ ] Support team on standby
- [ ] Launch announcement posted

### Post-Launch (1 week after)
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Review performance metrics
- [ ] Address critical issues
- [ ] Plan iteration improvements

---

## 🎉 Congratulations!

You now have a complete, production-ready TIPS Knowledge Base system. This implementation provides:

✅ **Intelligent Document Management** - AI-powered ingestion, classification, and version control
✅ **Smart Search & Retrieval** - Context-aware, user-personalized search
✅ **Complete User Lifecycle** - Onboarding, learning, offboarding with knowledge capture
✅ **Automated Transitions** - Major/minor/personnel transition orchestration
✅ **Best Practices Baseline** - Continuously updated from all sources
✅ **Approval Workflows** - Human-in-loop for critical decisions
✅ **Comprehensive Audit Trail** - Full traceability and compliance

**Next Steps:**
1. Import all workflows into n8n
2. Configure databases and credentials
3. Run test scenarios
4. Train your team
5. Go live!

For questions or support: tips-support@company.com

**2. Message Received**
```bash
curl -X POST https://your-n8n.com/webhook/message-received \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "message",
    "content": "We need to update the approval process immediately",
    "author": "user-123",
    "date": "2025-09-27T10:00:00Z"
  }'
```

**3. User Onboarding**
```bash
curl -X POST https://your-n8n.com/webhook/user-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "user_created",
    "user_id": "user-789",
    "name": "Jane Doe",
    "email": "jane@company.com",
    "role": "data_engineer",
    "product": "TIPS"
  }'
```

**4. User Offboarding**
```bash
curl -X POST https://your-n8n.com/webhook/user-event \
  -H "Content-Type": application/json" \
  -d '{
    "event_type": "user_offboarding",
    "user_id": "user-456",
    "transition_type": "personnel"
  }'
```

**5. Search Query**
```bash
curl -X POST https://your-n8n.com/webhook/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does version control work?",
    "user_id": "user-789",
    "show_superseded": false
  