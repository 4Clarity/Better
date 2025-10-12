# Artifact Vault Assessment

## Current State
Placeholder page with message: "This section will contain artifact storage and management features."

**Current Implementation:** Not yet developed

## User Role Perspective

### Program Manager
- **Needs:**
  - Store and organize program/contract artifacts
  - Version control for documents
  - Access control for sensitive materials
  - Audit trail of document access and changes

### Outgoing Contractor
- **Needs:**
  - Upload transition artifacts (SOPs, diagrams, code, documentation)
  - Organize artifacts for handoff
  - Ensure incoming contractor can access materials

### Incoming Contractor
- **Needs:**
  - Access all transition artifacts
  - Download materials for local use
  - Understand document context and version history

### Project Director
- **Needs:**
  - Compliance and retention management
  - Audit trail for contractual documentation
  - Search across all program artifacts

### System Admin
- **Needs:**
  - Configure storage backends
  - Manage retention policies
  - Monitor storage usage

## Flow Classification

**Primary Flow:** Steady-State (Ongoing document storage and retrieval)

**Secondary Flow:** Operational (Active artifact collection during transitions)

## Recommendations

### Relationship to Knowledge Platform

**Important Question:** How does Artifact Vault differ from Knowledge Platform?

**Option 1 - Artifact Vault is Subset:**
- Knowledge Platform = structured knowledge (facts, curated content)
- Artifact Vault = raw files and documents
- Artifact Vault feeds into Knowledge Platform (upload document → AI extracts facts)

**Option 2 - Artifact Vault is Separate:**
- Knowledge Platform = searchable, curated knowledge
- Artifact Vault = secure file storage for formal artifacts (contracts, official docs)
- Different access controls and retention policies

**Recommendation:** Option 1 - Consolidate to avoid confusion
- Artifact Vault becomes "Document Library" section within Knowledge Platform
- Focus on version control, access control, and organization
- Documents in vault automatically available for knowledge extraction

### Critical Implementation Needs

If Implementing as Separate Component:

1. **File Management:**
   - Upload files (drag-and-drop, bulk upload)
   - Folder/category organization
   - Version history
   - File metadata (tags, description, related transition/contract)
   - Preview capability for common formats

2. **Access Control:**
   - Folder-level permissions
   - Share links (internal and external)
   - Time-limited access
   - Download tracking (audit trail)

3. **Search and Discovery:**
   - Full-text search within documents
   - Filter by type, date, owner, transition, contract
   - Recently accessed
   - Favorites/bookmarks

4. **Integration with Existing Systems:**
   - Could this leverage MinIO (already in tech stack)?
   - Connection to Knowledge Platform for AI extraction
   - Link artifacts to specific transitions, contracts, operations

### Streamlining Opportunities

1. **Avoid Duplication:**
   - If Knowledge Platform already handles document upload (Product Documents tab), don't duplicate
   - Clarify distinction or merge functionality

2. **Context-Aware Storage:**
   - When uploading from Transition page, auto-tag with transition
   - Folder structure mirrors organizational hierarchy (Program > Operation > Contract > Transition)
   - Reduce manual categorization

3. **Lifecycle Management:**
   - Auto-archive when transition completes
   - Retention policies by document type
   - Compliance flagging for sensitive materials

### Alternative Recommendation: Don't Build Separately

**Instead:** Enhance Knowledge Platform with better document management
- Add "Artifacts" tab to Knowledge Platform
- Implement version control for uploaded documents
- Enhanced folder/organization capabilities
- Keep knowledge extraction workflow integrated

**Benefits:**
- Single source of truth for all knowledge and artifacts
- Reduced navigation (no separate Artifact Vault section)
- Unified search across structured and unstructured knowledge
- Simpler access control model

## UI Focus Areas (If Implemented)
- File browser interface (similar to Google Drive/Dropbox)
- Drag-and-drop upload
- Preview pane for documents
- Version comparison view
- Share and permission management
- Integration with transition and contract detail pages
- Mobile-friendly document viewing
- Offline access capability for critical documents

## Key Decision Needed
**Should Artifact Vault exist as separate section, or be integrated into Knowledge Platform?**

Recommend: Integration for simplicity and user experience
