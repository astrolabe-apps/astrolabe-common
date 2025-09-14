# AgentView Integration into FormView Edit Mode Plan

## Overview
Integrate AgentView functionality directly into FormView's edit mode as a togglable option. Instead of directly applying changes to the ControlDefinition[], show a JSON diff of proposed changes that users can approve or modify before applying.

## Requirements
- Remove separate AgentView tab, integrate into FormView edit mode
- Add toggle option to enable/disable agent assistance
- Display JSON diff of proposed changes before applying
- Allow users to approve, reject, or modify proposed changes
- Maintain existing FormView edit functionality
- Provide clear visual indication of agent-proposed changes
- Follow established Astrolabe patterns: useControl instead of useState, function declarations

## Implementation Steps

### 1. FormView Component Updates
- **Location**: `astrolabe-schemas-editor/src/views/FormView.tsx`
- **Changes**:
  - Add agent mode toggle button/switch in edit mode using direct React (not RenderForm)
  - Use `useControl` for agent mode state management (not useState)
  - Use function declarations instead of const arrow functions
  - Integrate agent panel as collapsible/expandable section
  - Maintain existing edit mode functionality when agent disabled

### 2. Agent Integration Panel
- **Location**: New component within FormView
- **Changes**:
  - Create `AgentAssistPanel` component
  - Include agent chat interface
  - Add diff preview area
  - Include approve/reject/modify controls
  - Make panel togglable and resizable

### 3. JSON Diff Implementation
- **Location**: New diff utility and component
- **Changes**:
  - Implement JSON diff calculation between current and proposed ControlDefinition[]
  - Create visual diff display component (added/removed/modified)
  - Use color coding and highlighting for different change types
  - Support expanding/collapsing diff sections

### 4. Change Preview and Approval Flow
- **Location**: Agent integration logic
- **Changes**:
  - Capture agent-proposed ControlDefinition[] changes
  - Generate diff against current state
  - Present changes in approval interface
  - Implement approval/rejection workflow
  - Allow manual editing of proposed changes

### 5. State Management Updates
- **Location**: FormView state and context
- **Changes**:
  - Use `useControl` for all state management (not useState)
  - Use `useControlEffect` for reactive state changes
  - Track pending changes from agent using typed controls
  - Manage diff state and approval status with proper type safety
  - Follow established @react-typed-forms patterns

### 6. UI/UX Enhancements
- **Location**: FormView styling and layout
- **Changes**:
  - Design split-panel layout for edit + agent mode
  - Add visual indicators for agent-modified fields
  - Implement smooth transitions when toggling agent mode
  - Ensure responsive design works with new layout

## Technical Implementation

### Component Structure (Following BEST-PRACTICES.md)
```typescript
import { useControl, useControlEffect } from "@react-typed-forms/core";
import { cn } from "@astroapps/client";

interface AgentModeState {
  enabled: boolean;
  pendingChanges: ControlDefinition[] | null;
  diff: JsonDiff | null;
  approvalState: 'pending' | 'approved' | 'rejected' | null;
}

export default function FormView() {
  // Use useControl instead of useState
  const agentMode = useControl<AgentModeState>({
    enabled: false,
    pendingChanges: null,
    diff: null,
    approvalState: null
  });

  const currentControls = useControl<ControlDefinition[]>([]);

  // Use useControlEffect for reactive changes
  useControlEffect(
    () => agentMode.fields.pendingChanges.value,
    (changes) => {
      if (changes) {
        // Generate diff when changes are proposed
        const diff = calculateJsonDiff(currentControls.value, changes);
        agentMode.fields.diff.value = diff;
      }
    },
    true
  );

  return (
    <div className="form-view">
      {isEditMode && (
        <div className="edit-header mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Agent Assistance
          </label>
          <button
            onClick={() => toggleAgentMode()}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              agentMode.fields.enabled.value
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            )}
          >
            {agentMode.fields.enabled.value ? "Disable Agent" : "Enable Agent"}
          </button>
        </div>
      )}

      <div className={cn(
        "form-content",
        agentMode.fields.enabled.value && "grid grid-cols-1 lg:grid-cols-2 gap-6"
      )}>
        <div className="form-editor">
          <FormEditor controls={currentControls.value} />
        </div>

        {agentMode.fields.enabled.value && (
          <div className="agent-panel">
            <AgentAssistPanel
              onChangesProposed={handleAgentChanges}
              pendingChanges={agentMode.fields.pendingChanges.value}
              diff={agentMode.fields.diff.value}
              onApprove={handleApproveChanges}
              onReject={handleRejectChanges}
            />
          </div>
        )}
      </div>
    </div>
  );

  function toggleAgentMode() {
    agentMode.fields.enabled.value = !agentMode.fields.enabled.value;
  }

  function handleAgentChanges(proposedControls: ControlDefinition[]) {
    agentMode.value = {
      ...agentMode.value,
      pendingChanges: proposedControls,
      approvalState: 'pending'
    };
  }

  function handleApproveChanges() {
    if (agentMode.fields.pendingChanges.value) {
      currentControls.value = agentMode.fields.pendingChanges.value;
      agentMode.value = {
        ...agentMode.value,
        pendingChanges: null,
        diff: null,
        approvalState: 'approved'
      };
    }
  }

  function handleRejectChanges() {
    agentMode.value = {
      ...agentMode.value,
      pendingChanges: null,
      diff: null,
      approvalState: 'rejected'
    };
  }
}
```

### Component Structure
```typescript
interface AgentModeState {
  enabled: boolean;
  pendingChanges: ControlDefinition[] | null;
  diff: JsonDiff | null;
  approvalState: 'pending' | 'approved' | 'rejected' | null;
}

function FormView() {
  const [agentMode, setAgentMode] = useState<AgentModeState>({
    enabled: false,
    pendingChanges: null,
    diff: null,
    approvalState: null
  });

  const [currentControls, setCurrentControls] = useState<ControlDefinition[]>([]);

  return (
    <div className="form-view">
      {isEditMode && (
        <div className="edit-header">
          <AgentModeToggle
            enabled={agentMode.enabled}
            onToggle={(enabled) => setAgentMode(prev => ({ ...prev, enabled }))}
          />
        </div>
      )}

      <div className="form-content">
        <FormEditor controls={currentControls} />

        {agentMode.enabled && (
          <AgentAssistPanel
            onChangesProposed={handleAgentChanges}
            pendingChanges={agentMode.pendingChanges}
            diff={agentMode.diff}
            onApprove={handleApproveChanges}
            onReject={handleRejectChanges}
          />
        )}
      </div>
    </div>
  );
};
```

### JSON Diff Component
```typescript
interface JsonDiff {
  added: any[];
  removed: any[];
  modified: Array<{
    path: string;
    oldValue: any;
    newValue: any;
  }>;
}

function DiffViewer({ diff, onApprove, onReject }: DiffViewerProps) {
  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <h3>Proposed Changes</h3>
        <div className="diff-actions">
          <button onClick={onApprove} className="approve-btn">Apply Changes</button>
          <button onClick={onReject} className="reject-btn">Reject Changes</button>
        </div>
      </div>

      <div className="diff-content">
        {diff.added.length > 0 && (
          <DiffSection type="added" items={diff.added} />
        )}
        {diff.removed.length > 0 && (
          <DiffSection type="removed" items={diff.removed} />
        )}
        {diff.modified.length > 0 && (
          <DiffSection type="modified" items={diff.modified} />
        )}
      </div>
    </div>
  );
};
```

### Agent Integration Logic
```typescript
function handleAgentChanges(proposedControls: ControlDefinition[]) {
  const diff = calculateJsonDiff(currentControls, proposedControls);

  setAgentMode(prev => ({
    ...prev,
    pendingChanges: proposedControls,
    diff,
    approvalState: 'pending'
  }));
};

function handleApproveChanges() {
  if (agentMode.pendingChanges) {
    setCurrentControls(agentMode.pendingChanges);
    setAgentMode(prev => ({
      ...prev,
      pendingChanges: null,
      diff: null,
      approvalState: 'approved'
    }));
  }
};
```

## UI/UX Design Considerations

### Layout Options
- **Split Panel**: Form editor on left, agent panel on right
- **Collapsible Panel**: Agent panel slides in from side when enabled
- **Modal Dialog**: Agent interaction in modal with diff preview
- **Bottom Panel**: Agent panel as expandable bottom section

### Visual Indicators
- Highlight fields that agent wants to modify
- Use color coding for different change types (green=added, red=removed, yellow=modified)
- Show pending change indicators in form editor
- Display approval status clearly

### User Flow
1. User enables agent mode toggle
2. Agent panel appears with chat interface
3. User interacts with agent to request changes
4. Agent proposes changes, showing JSON diff
5. User reviews diff and approves/rejects/modifies
6. Changes are applied to form editor

## Technical Considerations

### Diff Algorithm
- Use existing libraries (like `jsondiffpatch`) for diff calculation
- Handle deep object comparison for ControlDefinition[]
- Provide meaningful change descriptions
- Support undo/redo functionality

### Performance
- Debounce diff calculations
- Lazy load agent functionality
- Optimize rendering of large diffs
- Cache diff results when possible

### Error Handling
- Handle agent API failures gracefully
- Validate proposed changes before showing diff
- Provide fallback when diff calculation fails
- Show clear error messages to user

### Accessibility
- Ensure diff viewer is screen reader accessible
- Proper keyboard navigation for approval controls
- ARIA labels for change types and statuses
- Focus management when toggling modes

## Testing Strategy

### Unit Tests
- Test diff calculation accuracy
- Test approval/rejection workflow
- Test agent mode toggle functionality
- Test integration with existing form state

### Integration Tests
- Test agent API integration
- Test full user workflow
- Test error scenarios
- Test with various ControlDefinition structures

### User Experience Tests
- Test usability of diff interface
- Verify clear understanding of proposed changes
- Test responsive design with agent panel
- Gather feedback on approval workflow

## Migration from Existing AgentView and ClaudeService

### Current Implementation Analysis
The existing implementation has these key components that need to be migrated:

**AgentView.tsx (372 lines):**
- Standalone tab view with command interface
- Uses RenderForm with complex control definitions
- Command history tracking with AgentCommand interface
- Integration with ClaudeService for form modifications
- Success/failure status tracking

**ClaudeService.ts (551 lines):**
- Anthropic API client with tool-based form manipulation
- Comprehensive system prompts with control definition documentation
- Form schema extraction and processing
- Direct form definition updates via setValue()

### Migration Strategy

#### 1. Extract and Refactor Core Services
- **Location**: Keep `ClaudeService.ts` but adapt for new workflow
- **Changes**:
  - Keep existing `processCommand()` method for chat functionality
  - Modify to return proposed changes instead of applying directly
  - Add new `generateDiff()` method for change comparison
  - Keep system prompts and tool definitions (they're comprehensive)

#### 2. Migrate Chat Interface Components
- **Location**: Create new `ChatInterface.tsx` component
- **Changes**:
  - Extract chat UI from AgentView (command input, history display)
  - Convert from RenderForm to direct React implementation
  - Use function declarations and useControl patterns
  - Integrate with FormView's agent panel

#### 3. Integrate Command History
- **Location**: FormView agent state
- **Changes**:
  - Move AgentCommand interface to FormView types
  - Migrate command history tracking to useControl
  - Keep existing success/failure status patterns

#### 4. Update Service Integration
- **Location**: Modify ClaudeService integration
- **Changes**:
  ```typescript
  // Instead of direct application:
  // await context.claudeService.applyUpdatedFormDefinition(...)

  // Return proposed changes:
  const result = await context.claudeService.processCommand(command, currentForm, context);
  if (result.updatedFormDefinition) {
    // Show diff instead of applying directly
    agentMode.value = {
      ...agentMode.value,
      pendingChanges: result.updatedFormDefinition,
      approvalState: 'pending'
    };
  }
  ```

#### 5. Remove Old Components
- **Location**: Clean up after migration
- **Changes**:
  - Remove `AgentView.tsx` (after extracting reusable parts)
  - Remove agent tab from navigation/routing
  - Update any references to AgentView in parent components

### Implementation Order
1. **Phase 1**: Create new components without removing old ones
   - ChatInterface component with direct React
   - DiffViewer component
   - AgentAssistPanel integration in FormView

2. **Phase 2**: Modify ClaudeService for new workflow
   - Add diff generation methods
   - Modify response handling for approval workflow
   - Keep existing comprehensive system prompts

3. **Phase 3**: Integration and cleanup
   - Wire up new components in FormView
   - Test agent functionality works identically
   - Remove old AgentView tab and components

### Code Reuse Opportunities
**From AgentView.tsx:**
- Command history interface and logic (`AgentCommand` interface, `addToHistory` function)
- Agent command processing patterns
- Error handling and status management
- Help documentation (convert to tooltips/help text in new UI)

**From ClaudeService.ts:**
- Comprehensive system prompts (excellent quality, keep intact)
- Tool-based API integration (`processCommand`, tool definitions)
- Form schema extraction logic (`extractFormInfo`, `extractFieldNames`)
- Control definition documentation (already comprehensive)

### Breaking Changes to Avoid
- Keep ClaudeService API compatible for any other consumers
- Maintain command syntax and functionality
- Preserve existing error handling patterns
- Don't lose command history or help functionality

## Success Criteria
- [x] Agent functionality is integrated into FormView edit mode
- [x] Users can toggle agent assistance on/off
- [x] JSON diff clearly shows proposed changes
- [x] Users can approve, reject, or modify proposed changes
- [x] Existing FormView functionality remains intact
- [x] UI is intuitive and responsive
- [x] Performance is acceptable with diff calculations
- [x] No separate AgentView tab needed