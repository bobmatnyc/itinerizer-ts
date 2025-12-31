# Toast and Modal Examples

## Toast Notification Examples

### Success Toast
```typescript
// After successfully deleting an itinerary
toast.success('Itinerary deleted');

// After saving a segment
toast.success('Segment saved');

// After importing a PDF
toast.success('Import successful!');
```

**Visual:**
```
┌────────────────────────────────────┐
│ ✓ │ Itinerary deleted            │ ✕ │
└────────────────────────────────────┘
```
- Green left border
- Green checkmark icon
- Auto-dismisses in 3 seconds

### Error Toast
```typescript
// After failed API call
toast.error('Failed to save segment. Please try again.');

// After import failure
toast.error('Import failed. Check console for details.');

// After create failure
toast.error('Failed to create new itinerary. Please try again.');
```

**Visual:**
```
┌────────────────────────────────────────────────┐
│ ✕ │ Failed to save. Please try again.     │ ✕ │
└────────────────────────────────────────────────┘
```
- Red left border
- Red X icon
- Auto-dismisses in 5 seconds (longer for errors)

### Warning Toast
```typescript
toast.warning('Connection lost. Retrying...');
```

**Visual:**
```
┌────────────────────────────────────┐
│ ⚠ │ Connection lost. Retrying... │ ✕ │
└────────────────────────────────────┘
```
- Orange left border
- Warning icon
- Auto-dismisses in 3 seconds

### Info Toast
```typescript
toast.info('Tip: You can drag segments to reorder');
```

**Visual:**
```
┌─────────────────────────────────────────────┐
│ ℹ │ Tip: You can drag segments to reorder │ ✕ │
└─────────────────────────────────────────────┘
```
- Blue left border
- Info icon
- Auto-dismisses in 3 seconds

### Multiple Toasts Stacking
```typescript
toast.success('First action completed');
toast.success('Second action completed');
toast.error('Third action failed');
```

**Visual:**
```
                              ┌─────────────────────────┐
                              │ ✓ │ First action...  │ ✕ │
                              └─────────────────────────┘
                              ┌─────────────────────────┐
                              │ ✓ │ Second action... │ ✕ │
                              └─────────────────────────┘
                              ┌─────────────────────────┐
                              │ ✕ │ Third action...  │ ✕ │
                              └─────────────────────────┘
```
- Stacks vertically
- Top-right positioning
- Each dismisses independently

## Confirmation Modal Examples

### Delete Itinerary (Destructive)
```typescript
const confirmed = await modal.confirm({
  title: 'Delete Itinerary',
  message: 'Delete "My Trip to Paris"? This cannot be undone.',
  confirmText: 'Delete',
  destructive: true
});

if (confirmed) {
  await deleteItinerary(id);
  toast.success('Itinerary deleted');
}
```

**Visual:**
```
                    Backdrop (50% black overlay)
┌─────────────────────────────────────────────────┐
│  Delete Itinerary                               │
│                                                 │
│  Delete "My Trip to Paris"?                     │
│  This cannot be undone.                         │
│                                                 │
│         [ Cancel ]   [ Delete (red) ]           │
└─────────────────────────────────────────────────┘
```
- Centered modal
- White card with shadow
- Red "Delete" button (destructive)
- Gray "Cancel" button

### Delete Segment (Destructive)
```typescript
const confirmed = await modal.confirm({
  title: 'Delete Segment',
  message: 'Are you sure you want to delete this segment?',
  confirmText: 'Delete',
  destructive: true
});

if (confirmed) {
  onDelete();
}
```

### Clear Conversation (Destructive)
```typescript
const confirmed = await modal.confirm({
  title: 'Clear Conversation',
  message: 'Clear this conversation? This cannot be undone.',
  confirmText: 'Clear',
  destructive: true
});

if (confirmed) {
  resetChat();
}
```

### Non-Destructive Confirmation
```typescript
const confirmed = await modal.confirm({
  title: 'Continue Without Saving',
  message: 'You have unsaved changes. Continue without saving?',
  confirmText: 'Continue',
  cancelText: 'Go Back'
});
```

**Visual:**
```
┌─────────────────────────────────────────────────┐
│  Continue Without Saving                        │
│                                                 │
│  You have unsaved changes.                      │
│  Continue without saving?                       │
│                                                 │
│      [ Go Back ]   [ Continue (blue) ]          │
└─────────────────────────────────────────────────┘
```
- Blue "Continue" button (not destructive)
- Gray "Go Back" button

## Usage Patterns

### Pattern 1: Optimistic UI with Toast
```typescript
async function handleDelete(id: string) {
  const confirmed = await modal.confirm({
    title: 'Delete Item',
    message: 'Delete this item?',
    confirmText: 'Delete',
    destructive: true
  });

  if (!confirmed) return;

  try {
    await deleteItem(id);
    toast.success('Item deleted');
  } catch (error) {
    console.error('Delete failed:', error);
    toast.error('Failed to delete item. Please try again.');
  }
}
```

### Pattern 2: Multi-Step Operation
```typescript
async function handleImport(file: File) {
  try {
    // Show progress (could add loading toast)
    await importFile(file);
    toast.success('Import successful!');

    // Redirect or update UI
    navigateToNewItem();
  } catch (error) {
    console.error('Import failed:', error);
    toast.error('Import failed. Check console for details.');
  }
}
```

### Pattern 3: Conditional Confirmation
```typescript
async function handleSave(hasChanges: boolean) {
  if (hasChanges) {
    const confirmed = await modal.confirm({
      title: 'Save Changes',
      message: 'Save your changes before continuing?',
      confirmText: 'Save',
      cancelText: 'Discard'
    });

    if (confirmed) {
      await saveChanges();
      toast.success('Changes saved');
    }
  }
}
```

## Accessibility Features

### Toast
- **Non-blocking**: Doesn't interrupt user flow
- **Auto-dismiss**: Automatically cleans up after timeout
- **Manual dismiss**: X button for immediate dismissal
- **Color contrast**: All text meets WCAG AA standards
- **Icon + Text**: Visual and textual indicators

### Modal
- **Focus trap**: Tab stays within modal
- **Keyboard support**:
  - Escape to cancel
  - Enter to confirm (when focused)
  - Tab to move between buttons
- **ARIA labels**:
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-labelledby` and `aria-describedby`
- **Backdrop click**: Click outside to cancel
- **Autofocus**: Confirm button auto-focused (with warning suppressed)

## Mobile Responsive Design

### Toast (Mobile)
```
Full width on small screens:
┌──────────────────────────────┐
│ ✓ │ Itinerary deleted    │ ✕ │
└──────────────────────────────┘
```

### Modal (Mobile)
```
Stacked buttons:
┌─────────────────────────┐
│  Delete Itinerary       │
│                         │
│  Delete "My Trip"?      │
│  This cannot be undone. │
│                         │
│  ┌───────────────────┐  │
│  │  Continue         │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │  Go Back          │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Custom Duration Example
```typescript
// Short toast (2 seconds)
toast.success('Copied!', { duration: 2000 });

// Long toast (10 seconds)
toast.warning('Server maintenance in 10 minutes', { duration: 10000 });
```

## Design Tokens Used

### Toast
- **Border-left colors**:
  - Success: `#10b981` (green-500)
  - Error: `#ef4444` (red-500)
  - Warning: `#f59e0b` (amber-500)
  - Info: `#3b82f6` (blue-500)
- **Background**: `white`
- **Text**: `#1f2937` (gray-800)
- **Shadow**: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`

### Modal
- **Backdrop**: `rgba(0, 0, 0, 0.5)`
- **Background**: `white`
- **Border-radius**: `0.75rem`
- **Shadow**: `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)`
- **Button colors**:
  - Cancel: `#f3f4f6` (gray-100)
  - Confirm: `#3b82f6` (blue-500)
  - Destructive: `#ef4444` (red-500)
