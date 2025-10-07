# Korus Web UI Component Guide

This document explains how to use the standardized UI components and utilities in the Korus web app.

## Reusable Components

### Button Component

A fully-featured button component with multiple variants, sizes, and built-in loading states.

```tsx
import { Button } from '@/components/ui';

// Primary button (gradient)
<Button variant="primary" onClick={handleSubmit}>
  Submit
</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Danger button (for destructive actions)
<Button variant="danger" onClick={handleDelete}>
  Delete
</Button>

// Ghost button (transparent)
<Button variant="ghost" onClick={handleClose}>
  Close
</Button>

// With loading state
<Button variant="primary" isLoading={isSaving}>
  Save
</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button> {/* default */}
<Button size="lg">Large</Button>

// Full width
<Button fullWidth>Full Width Button</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `isLoading`: boolean - Shows spinner and disables button
- `fullWidth`: boolean - Makes button take full width
- All standard button HTML attributes

### Input Component

Standardized input with label, helper text, and error states.

```tsx
import { Input } from '@/components/ui';

// Basic input
<Input placeholder="Enter your email" />

// With label
<Input label="Email Address" placeholder="you@example.com" />

// Error state
<Input
  label="Email"
  variant="error"
  helperText="Please enter a valid email address"
/>

// Success state
<Input
  label="Username"
  variant="success"
  helperText="Username is available"
/>

// Full width
<Input label="Full Name" fullWidth />
```

**Props:**
- `variant`: 'default' | 'error' | 'success'
- `label`: string - Optional label above input
- `helperText`: string - Helper/error text below input
- `fullWidth`: boolean
- All standard input HTML attributes

### Textarea Component

Same API as Input but for multi-line text.

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Message"
  placeholder="Write your message..."
  rows={4}
  fullWidth
/>

<Textarea
  label="Bio"
  variant="error"
  helperText="Bio is too long (max 500 characters)"
  rows={6}
/>
```

## Utility Classes

### Typography

Use these standardized typography classes instead of manual sizing:

```tsx
// Headings
<h1 className="heading-1">Main Title</h1>
<h2 className="heading-2">Section Title</h2>
<h3 className="heading-3">Subsection</h3>

// Body text
<p className="body-lg">Large body text</p>
<p className="body">Regular body text</p>
<p className="body-sm">Small body text</p>

// UI text
<span className="caption">Caption text</span>
<label className="label">Form Label</label>

// Button text
<button className="button-text">Button Text</button>
```

### Form States

Apply these classes to inputs for consistent styling:

```tsx
// Error state
<input className="input-error" />

// Success state
<input className="input-success" />

// All inputs automatically get focus rings via CSS
```

### Loading Spinners

Use standardized spinner classes:

```tsx
// Dark spinner (for light/gradient buttons)
<div className="spinner-dark"></div>

// Light spinner (for dark/red buttons)
<div className="spinner-light"></div>
```

### Modal Classes

Apply these classes for polished modal animations:

```tsx
// Backdrop
<div className="modal-backdrop fixed inset-0 bg-black/80...">
  {/* Content */}
  <div className="modal-content bg-korus-surface...">
    Modal content here
  </div>
</div>
```

Animations automatically disabled for users with `prefers-reduced-motion` enabled.

## Hooks

### useFocusTrap

Traps keyboard focus within modals for accessibility:

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

function MyModal({ isOpen, onClose }) {
  const modalRef = useFocusTrap(isOpen);

  return (
    <div ref={modalRef} className="modal-content">
      <button>First focusable</button>
      <input type="text" />
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

Features:
- Automatically focuses first element when modal opens
- Tab cycles through focusable elements within modal
- Shift+Tab cycles backwards
- Escape key dispatches 'modal-escape' event

## Accessibility Features

### Screen Reader Support

Toast notifications are automatically announced to screen readers via `aria-live="polite"`.

### Keyboard Navigation

- All interactive elements have `:focus-visible` indicators
- Focus trap keeps keyboard users within modals
- Tab/Shift+Tab navigation works correctly
- Escape closes modals

### Reduced Motion

Users with `prefers-reduced-motion` enabled automatically get:
- No animations
- No transitions
- Instant state changes

## Best Practices

1. **Always use the component library** instead of creating custom buttons/inputs
2. **Use typography classes** instead of manual font sizing
3. **Apply modal-backdrop and modal-content classes** to all modals
4. **Use useFocusTrap** for all modal components
5. **Test with keyboard navigation** (Tab, Shift+Tab, Escape, Enter)
6. **Test with screen reader** to ensure announcements work

## Theme Colors

All components automatically adapt to the selected theme:
- Mint Fresh (free)
- Royal Purple (premium)
- Blue Sky (premium)
- Premium Gold (premium)
- Cherry Blossom (premium)
- Cyber Neon (premium)

Colors are defined as CSS custom properties and update globally when theme changes.
