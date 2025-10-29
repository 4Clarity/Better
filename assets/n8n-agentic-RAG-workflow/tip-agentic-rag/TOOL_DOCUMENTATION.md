# TIP Agentic RAG - Tool Documentation

This document provides comprehensive documentation for the AI agent tools in the TIP Agentic RAG workflow.

---

## Overview

The TIP RAG AI Agent has **5 specialized tools** that it can intelligently select based on the user's query:

1. **knowledge_search** (Vector Search Tool) - Semantic similarity search
2. **List Documents** - Browse available documents and metadata
3. **Get File Contents** (Get Full Document Tool) - Retrieve complete document text
4. **Query Document Rows** (SQL Query Tool) - Execute SQL on tabular data
5. **Search Facts** (mem0 Tool) - Query extracted facts and memories

This guide focuses on documenting tools #3 and #4 in detail.

---

## Tool 3: Get File Contents (Get Full Document Tool)

### Purpose

Retrieves the **complete text content** of a specific document by concatenating all its chunks in order. This tool is essential when:
- Vector search chunks don't provide enough context
- You need to see the entire document structure
- Reading complete policies, procedures, or contracts
- Understanding document flow and organization

### How It Works

**Backend Implementation:**

The tool uses a PostgreSQL function `get_document_full_text()` defined in the database migration:

```sql
CREATE OR REPLACE FUNCTION get_document_full_text(doc_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    full_text TEXT;
BEGIN
    -- Concatenate all chunks for this document in order
    SELECT STRING_AGG(content, E'\n\n' ORDER BY chunk_index)
    INTO full_text
    FROM knowledge_document_chunks
    WHERE document_id = doc_id;

    -- Return full text or empty string if no chunks found
    RETURN COALESCE(full_text, '');
END;
$$;
```

**Workflow Configuration:**

```json
{
  "parameters": {
    "name": "Get File Contents",
    "description": "Retrieve the complete text content of a specific document. Use this when you need full context or when chunks don't provide enough information. Requires document_id.",
    "operation": "executeQuery",
    "query": "SELECT get_document_full_text('{{ $json.document_id }}') as full_text"
  },
  "type": "@n8n/n8n-nodes-langchain.toolPostgres",
  "credentials": {
    "postgres": {
      "id": "{{ POSTGRES_CREDENTIAL_ID }}",
      "name": "TIP PostgreSQL"
    }
  }
}
```

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `document_id` | TEXT | Yes | Unique identifier of the document (UUID format) |

**Example Input:**
```json
{
  "document_id": "3f7e4b1a-9c2d-4e5f-8a1b-6c9d3e2f1a0b"
}
```

### Output Format

Returns a TEXT field containing the complete document content with chunks separated by double newlines.

**Example Output:**
```text
Section 1: Introduction

This transition plan outlines the key milestones and activities...

Section 2: Stakeholder Identification

The following stakeholders have been identified for this transition...

Section 3: Timeline

The transition timeline spans 180 days prior to contract award...
```

### Use Cases

#### 1. Complete Policy Review
**User Query:** "Show me the entire security clearance policy"

**Agent Action:**
1. Use "List Documents" to find document_id for "Security_Clearance_Policy.pdf"
2. Use "Get File Contents" with that document_id
3. Return complete policy text

**Benefit:** User sees full policy context, not just relevant excerpts

#### 2. Contract Analysis
**User Query:** "What are all the deliverables in Contract XYZ-2024?"

**Agent Action:**
1. Find Contract XYZ-2024 document_id
2. Retrieve full contract text
3. Extract and summarize all deliverables mentioned

**Benefit:** Ensures no deliverables are missed by chunk-based search

#### 3. Procedure Walkthrough
**User Query:** "Walk me through the complete handover procedure step by step"

**Agent Action:**
1. Retrieve full procedure document
2. Present sequential steps in order
3. Maintain procedural flow and dependencies

**Benefit:** Preserves document structure and sequence

### When NOT to Use This Tool

❌ **DON'T use when:**
- Document is very long (>10,000 words) - may timeout or return too much data
- Only specific information is needed - use vector search instead
- Query is conceptual - use knowledge_search for semantic retrieval
- Working with tabular data - use SQL Query Tool

✅ **DO use when:**
- Need complete document context
- Reviewing policies or procedures end-to-end
- Understanding document structure matters
- Vector search chunks are insufficient

### Performance Considerations

- **Execution Time:** Typically 100-500ms depending on document size
- **Document Size Limits:** Works best with documents under 50 pages (~25,000 words)
- **Token Consumption:** Large documents consume significant LLM context tokens
- **Database Load:** Minimal - single query with indexed lookup

### Error Handling

**Error: Document Not Found**
```
Query returned empty string - document_id does not exist
```

**Solution:** Verify document_id is correct, check if document was successfully processed

**Error: Query Timeout**
```
PostgreSQL query timeout after 30 seconds
```

**Solution:** Document may be too large, try using vector search for specific sections instead

### Related Tools

- **knowledge_search**: Use this first to find relevant sections, then use Get File Contents for full context
- **List Documents**: Use this to discover document_id values needed by Get File Contents

---

## Tool 4: Query Document Rows (SQL Query Tool)

### Purpose

Executes **SQL queries** on structured tabular data extracted from CSV and Excel files. This tool is essential for:
- Numerical analysis and calculations
- Aggregations (SUM, AVG, COUNT, MAX, MIN)
- Filtering and sorting tabular data
- Data exploration and reporting
- Budget analysis, contract metrics, schedule tracking

### How It Works

**Backend Implementation:**

CSV/Excel files are processed during document upload:
1. Each row is extracted and stored in `document_rows` table
2. Data is stored as JSONB for flexible schema
3. Column names become JSONB keys
4. Agent constructs SQL queries using JSONB operators

**Database Table Structure:**

```sql
CREATE TABLE document_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_rows_document_id ON document_rows(document_id);
CREATE INDEX idx_document_rows_data ON document_rows USING GIN(row_data);
```

**Workflow Configuration:**

```json
{
  "parameters": {
    "name": "Query Document Rows",
    "description": "Execute SQL queries on structured tabular data from CSV/Excel files. Use this for numerical analysis, aggregations, filtering, and data exploration. Returns query results as JSON.",
    "operation": "executeQuery",
    "query": "={{ $json.sql_query }}"
  },
  "type": "@n8n/n8n-nodes-langchain.toolPostgres",
  "credentials": {
    "postgres": {
      "id": "{{ POSTGRES_CREDENTIAL_ID }}",
      "name": "TIP PostgreSQL"
    }
  }
}
```

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sql_query` | TEXT | Yes | Valid PostgreSQL SQL query using JSONB operators |

**Example Input:**
```json
{
  "sql_query": "SELECT row_data->>'contract_name' as contract, SUM((row_data->>'value')::numeric) as total FROM document_rows WHERE document_id = 'abc-123' GROUP BY row_data->>'contract_name'"
}
```

### Output Format

Returns query results as JSON array of objects.

**Example Output:**
```json
[
  {
    "contract": "Contract A",
    "total": 1500000
  },
  {
    "contract": "Contract B",
    "total": 2300000
  }
]
```

### JSONB Query Syntax

Since tabular data is stored as JSONB, you must use JSONB operators:

**Accessing Text Fields:**
```sql
row_data->>'column_name'  -- Returns text
```

**Accessing Numeric Fields:**
```sql
(row_data->>'column_name')::numeric  -- Cast to number
(row_data->>'column_name')::integer  -- Cast to integer
```

**Accessing Date Fields:**
```sql
(row_data->>'date_column')::date  -- Cast to date
(row_data->>'timestamp_column')::timestamp  -- Cast to timestamp
```

**Filtering:**
```sql
WHERE row_data->>'status' = 'Active'
WHERE (row_data->>'budget')::numeric > 100000
WHERE row_data->>'contract_id' IS NOT NULL
```

### Use Cases

#### 1. Budget Analysis
**User Query:** "What is the total budget across all contracts?"

**SQL Query:**
```sql
SELECT
  SUM((row_data->>'budget_amount')::numeric) as total_budget,
  COUNT(*) as contract_count
FROM document_rows
WHERE row_data->>'budget_amount' IS NOT NULL;
```

**Output:**
```json
[{
  "total_budget": 15750000,
  "contract_count": 12
}]
```

#### 2. Contract Filtering
**User Query:** "Show me all contracts with budget over $1M"

**SQL Query:**
```sql
SELECT
  row_data->>'contract_name' as contract,
  row_data->>'contract_number' as number,
  (row_data->>'budget_amount')::numeric as budget
FROM document_rows
WHERE (row_data->>'budget_amount')::numeric > 1000000
ORDER BY (row_data->>'budget_amount')::numeric DESC;
```

**Output:**
```json
[
  {
    "contract": "Enterprise System Modernization",
    "number": "GS-35F-0119Y",
    "budget": 3500000
  },
  {
    "contract": "Cloud Infrastructure Migration",
    "number": "GS-35F-0120Y",
    "budget": 2200000
  }
]
```

#### 3. Milestone Tracking
**User Query:** "How many milestones are due this month?"

**SQL Query:**
```sql
SELECT
  COUNT(*) as milestones_due
FROM document_rows
WHERE (row_data->>'due_date')::date BETWEEN
  DATE_TRUNC('month', CURRENT_DATE) AND
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

**Output:**
```json
[{
  "milestones_due": 8
}]
```

#### 4. Stakeholder Analysis
**User Query:** "Who are the primary stakeholders and how many contracts are they involved in?"

**SQL Query:**
```sql
SELECT
  row_data->>'stakeholder_name' as stakeholder,
  row_data->>'role' as role,
  COUNT(DISTINCT row_data->>'contract_id') as contract_count
FROM document_rows
WHERE row_data->>'stakeholder_name' IS NOT NULL
GROUP BY row_data->>'stakeholder_name', row_data->>'role'
ORDER BY contract_count DESC;
```

**Output:**
```json
[
  {
    "stakeholder": "John Smith",
    "role": "Government PM",
    "contract_count": 5
  },
  {
    "stakeholder": "Jane Doe",
    "role": "Contractor PM",
    "contract_count": 3
  }
]
```

#### 5. Data Aggregation
**User Query:** "What is the average contract duration by contract type?"

**SQL Query:**
```sql
SELECT
  row_data->>'contract_type' as type,
  ROUND(AVG((row_data->>'duration_months')::numeric), 1) as avg_duration_months,
  COUNT(*) as count
FROM document_rows
WHERE row_data->>'contract_type' IS NOT NULL
  AND row_data->>'duration_months' IS NOT NULL
GROUP BY row_data->>'contract_type';
```

**Output:**
```json
[
  {
    "type": "Fixed Price",
    "avg_duration_months": 24.5,
    "count": 8
  },
  {
    "type": "Time and Materials",
    "avg_duration_months": 36.2,
    "count": 4
  }
]
```

### Common SQL Patterns

#### Aggregation Functions
```sql
-- Sum
SUM((row_data->>'amount')::numeric)

-- Average
AVG((row_data->>'value')::numeric)

-- Count
COUNT(*)
COUNT(DISTINCT row_data->>'category')

-- Min/Max
MIN((row_data->>'date')::date)
MAX((row_data->>'priority')::integer)
```

#### Date Operations
```sql
-- Filter by date range
WHERE (row_data->>'date')::date BETWEEN '2024-01-01' AND '2024-12-31'

-- Group by month
DATE_TRUNC('month', (row_data->>'date')::date)

-- Days between dates
(row_data->>'end_date')::date - (row_data->>'start_date')::date
```

#### String Operations
```sql
-- Case-insensitive search
WHERE LOWER(row_data->>'name') LIKE '%transition%'

-- Concatenation
row_data->>'first_name' || ' ' || row_data->>'last_name'

-- Length
LENGTH(row_data->>'description')
```

#### Conditional Logic
```sql
-- CASE statement
CASE
  WHEN (row_data->>'budget')::numeric > 1000000 THEN 'Large'
  WHEN (row_data->>'budget')::numeric > 100000 THEN 'Medium'
  ELSE 'Small'
END as budget_category
```

### When NOT to Use This Tool

❌ **DON'T use when:**
- Working with unstructured text documents (use knowledge_search)
- Need semantic/conceptual answers (use vector search)
- Data is not in CSV/Excel format
- Complex joins across multiple documents (limited support)

✅ **DO use when:**
- Analyzing numerical data
- Need precise calculations (SUM, AVG, COUNT)
- Filtering/sorting tabular data
- Generating reports from spreadsheet data
- Budget analysis, metrics, tracking

### Performance Considerations

- **Execution Time:** Typically 50-200ms for simple queries, up to 2 seconds for complex aggregations
- **Row Limits:** Works efficiently with up to 100,000 rows per document
- **JSONB Indexing:** GIN index on row_data enables fast filtering
- **Complex Queries:** Avoid nested subqueries, prefer CTEs for readability

### Security Considerations

**SQL Injection Protection:**

The AI agent constructs SQL queries dynamically, which could pose security risks. Mitigation strategies:

1. **Read-Only Queries:** The tool only executes SELECT queries (enforced by agent prompt)
2. **Database Permissions:** PostgreSQL credential has SELECT-only access
3. **Query Validation:** n8n validates query syntax before execution
4. **User Context:** Queries respect user's security classification permissions

**Example Safe Query:**
```sql
SELECT * FROM document_rows WHERE row_data->>'status' = 'Active'
```

**Example Unsafe Query (Blocked):**
```sql
DROP TABLE document_rows;  -- Will fail - no DROP permission
UPDATE document_rows SET row_data = '{}';  -- Will fail - no UPDATE permission
```

### Error Handling

**Error: Invalid JSONB Path**
```
ERROR: cannot extract field from a non-object
```

**Solution:** Verify column name exists in row_data JSONB:
```sql
-- Check available columns
SELECT DISTINCT jsonb_object_keys(row_data)
FROM document_rows
WHERE document_id = 'your-doc-id'
LIMIT 1;
```

**Error: Type Casting Failure**
```
ERROR: invalid input syntax for type numeric
```

**Solution:** Ensure field contains valid numeric data before casting:
```sql
-- Add null check
WHERE row_data->>'amount' IS NOT NULL
  AND row_data->>'amount' ~ '^[0-9]+(\.[0-9]+)?$'
```

**Error: Query Timeout**
```
ERROR: canceling statement due to statement timeout
```

**Solution:** Optimize query with indexes, reduce row scans, add LIMIT clause

### Testing SQL Queries

Before the agent uses queries in production, test them manually:

```bash
# Connect to database
docker-compose exec db psql -U user -d tip

# Test query
SELECT
  row_data->>'contract_name',
  (row_data->>'budget')::numeric
FROM document_rows
WHERE document_id = 'your-test-doc-id'
LIMIT 5;
```

### Related Tools

- **List Documents**: Use this to discover which documents contain tabular data (mime_type: text/csv, application/vnd.ms-excel)
- **knowledge_search**: Use this for semantic search on text summaries of tabular data
- **Get File Contents**: Use this to see original CSV/Excel structure before querying

---

## Tool Selection Guidelines

The AI agent automatically selects the most appropriate tool based on query type:

| Query Type | Recommended Tool | Example |
|------------|------------------|---------|
| **Specific facts/dates** | Search Facts (mem0) | "When is the transition deadline?" |
| **Conceptual questions** | knowledge_search | "What are best practices for stakeholder management?" |
| **Numerical analysis** | Query Document Rows | "What is the total budget?" |
| **Complete document** | Get File Contents | "Show me the entire policy" |
| **Document discovery** | List Documents | "What contracts are available?" |

### Multi-Tool Workflows

The agent often uses multiple tools together:

**Example: Budget Analysis with Context**
1. **List Documents** → Find "Budget_2024.csv" document_id
2. **Query Document Rows** → Calculate total budget
3. **knowledge_search** → Find budget justification documents
4. **Get File Contents** → Retrieve complete budget policy

**Agent Response:**
> "The total FY2024 budget is $15.7M across 12 contracts (per Budget_2024.csv). According to Budget_Policy.pdf, this represents a 12% increase over FY2023 to accommodate expanded scope in cloud modernization initiatives."

---

## Troubleshooting

### Get File Contents Issues

**Problem:** Returns empty string
- **Check:** Document was successfully processed (upload_status = 'COMPLETED')
- **Check:** Chunks exist in knowledge_document_chunks table
- **Check:** document_id is correct UUID format

**Problem:** Very slow execution
- **Check:** Document size (may be too large)
- **Solution:** Use knowledge_search for specific sections instead

### SQL Query Tool Issues

**Problem:** No results returned
- **Check:** Document is CSV/Excel format
- **Check:** Rows exist in document_rows table
- **Check:** JSONB column names match spreadsheet headers

**Problem:** Type casting errors
- **Check:** Data types in JSONB match casting operation
- **Solution:** Add null checks and data validation

**Problem:** Query syntax errors
- **Check:** Using JSONB operators (->>, ->) correctly
- **Check:** Proper type casting (::numeric, ::date)
- **Solution:** Test query manually in psql first

---

## Best Practices

### For Get File Contents

1. **Check Document Size First:** Use List Documents to verify file size before retrieval
2. **Use Sparingly:** Only when vector search is insufficient
3. **Cache Results:** Store full document text if using repeatedly
4. **Verify document_id:** Use List Documents to get correct UUID

### For SQL Query Tool

1. **Start Simple:** Begin with basic SELECT queries, add complexity incrementally
2. **Use EXPLAIN:** Test query performance before production use
3. **Validate Data Types:** Always use appropriate type casting
4. **Add NULL Checks:** Prevent errors from missing data
5. **Limit Results:** Add LIMIT clause for large result sets
6. **Test First:** Verify queries in psql before agent uses them

---

## Example Agent Interactions

### Scenario 1: Contract Budget Analysis

**User:** "What is our total contract spend for FY2024 and which contract is the largest?"

**Agent Thought Process:**
1. This is numerical analysis on tabular data → Use SQL Query Tool
2. Need to find FY2024 contract document → Use List Documents first

**Agent Actions:**
```json
// 1. List Documents to find contract spreadsheet
{
  "tool": "List Documents",
  "result": [{
    "document_id": "abc-123",
    "filename": "FY2024_Contracts.xlsx",
    "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }]
}

// 2. Query total and max contract
{
  "tool": "Query Document Rows",
  "sql_query": "SELECT SUM((row_data->>'contract_value')::numeric) as total_spend, MAX((row_data->>'contract_value')::numeric) as largest_contract, (SELECT row_data->>'contract_name' FROM document_rows WHERE (row_data->>'contract_value')::numeric = (SELECT MAX((row_data->>'contract_value')::numeric) FROM document_rows WHERE document_id = 'abc-123') AND document_id = 'abc-123' LIMIT 1) as largest_contract_name FROM document_rows WHERE document_id = 'abc-123'",
  "result": [{
    "total_spend": 15750000,
    "largest_contract": 3500000,
    "largest_contract_name": "Enterprise System Modernization"
  }]
}
```

**Agent Response:**
> "For FY2024, the total contract spend is $15.75M across all contracts. The largest individual contract is 'Enterprise System Modernization' at $3.5M."

### Scenario 2: Complete Policy Review

**User:** "I need to review the complete data security policy to ensure we're compliant"

**Agent Thought Process:**
1. User needs complete document, not excerpts → Use Get File Contents
2. First find the policy document_id → Use List Documents

**Agent Actions:**
```json
// 1. Find security policy
{
  "tool": "List Documents",
  "result": [{
    "document_id": "def-456",
    "filename": "Data_Security_Policy_v2.1.pdf",
    "mime_type": "application/pdf"
  }]
}

// 2. Retrieve full policy text
{
  "tool": "Get File Contents",
  "document_id": "def-456",
  "result": {
    "full_text": "SECTION 1: SCOPE\n\nThis policy applies to all personnel...\n\nSECTION 2: DATA CLASSIFICATION\n\nData shall be classified as...\n\n[Complete 15-page policy text]"
  }
}
```

**Agent Response:**
> "I've retrieved the complete Data Security Policy v2.1 for your review. The policy covers:\n\n1. Scope - Applies to all personnel and contractors\n2. Data Classification - Four levels: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED\n3. Handling Requirements - Specific controls for each classification level\n4. Compliance Verification - Quarterly audits required\n\n[Agent provides detailed summary with section references]\n\nWould you like me to clarify any specific section?"

---

## Summary

The **Get File Contents** and **Query Document Rows** tools are powerful additions to the TIP Agentic RAG system:

- **Get File Contents**: Essential for complete document context when vector search chunks are insufficient
- **Query Document Rows**: Critical for numerical analysis and reporting on CSV/Excel data

Both tools use PostgreSQL directly for efficiency and leverage TIP's existing database infrastructure. The AI agent intelligently selects these tools based on query type, often combining them with vector search and fact retrieval for comprehensive answers.

For questions about implementation, see:
- `README.md` - Main documentation
- `ENHANCED_ARCHITECTURE.md` - System architecture
- `database-migration-tip-agentic-rag.sql` - Database schema and functions
