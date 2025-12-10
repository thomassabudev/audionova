# CSS/Tailwind Styling Guide for Sidebar Quick Actions

## Component Styling

### QuickActionButton
```html
<!-- Base button styling -->
<button class="h-12 flex flex-col items-center justify-center gap-1 py-1 px-2 
              border border-border rounded-md bg-background hover:bg-accent 
              text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
  <!-- Icon -->
  <svg class="w-4 h-4"></svg>
  <!-- Label (hidden when collapsed) -->
  <span class="text-xs">Action Label</span>
</button>
```

### SidebarQuickActions Container
```html
<div class="p-3 border-t border-border bg-card">
  <!-- Grid layout for buttons -->
  <div class="grid grid-cols-3 gap-2">
    <!-- Quick action buttons -->
  </div>
  
  <!-- Drag overlay -->
  <div class="absolute inset-0 flex items-center justify-center 
              bg-accent/80 rounded-lg">
    <p class="text-sm font-medium text-foreground">Drop to add to quick actions</p>
  </div>
</div>
```

### Multi-Select Toolbar
```html
<div class="p-3 border-t border-border bg-card">
  <!-- Selection header -->
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm font-medium text-foreground">3 selected</span>
    <button class="h-8 px-2 text-sm">Done</button>
  </div>
  
  <!-- Bulk action buttons -->
  <div class="grid grid-cols-3 gap-2">
    <!-- Bulk action buttons -->
  </div>
</div>
```

## Animation Classes

### Micro-interactions
```css
/* Heart pop animation for like button */
@keyframes heartPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.heart-pop {
  animation: heartPop 0.3s ease-in-out;
}

/* Button hover effects */
.button-hover {
  transition: all 0.2s ease-in-out;
}

.button-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Focus ring */
.focus-ring {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus-ring:focus-visible {
  outline-color: hsl(var(--primary));
  outline-width: 2px;
  outline-style: solid;
}
```

### Toast Animations
```css
/* Toast entrance */
@keyframes toastEnter {
  0% { 
    opacity: 0; 
    transform: translateX(100%); 
  }
  100% { 
    opacity: 1; 
    transform: translateX(0); 
  }
}

.toast-enter {
  animation: toastEnter 0.3s ease-out;
}

/* Toast exit */
@keyframes toastExit {
  0% { 
    opacity: 1; 
    transform: translateX(0); 
  }
  100% { 
    opacity: 0; 
    transform: translateX(100%); 
  }
}

.toast-exit {
  animation: toastExit 0.2s ease-in;
}
```

### Drag and Drop Animations
```css
/* Drag overlay fade in */
@keyframes dragOverlayIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.drag-overlay-in {
  animation: dragOverlayIn 0.2s ease-out;
}

/* Drag overlay fade out */
@keyframes dragOverlayOut {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.drag-overlay-out {
  animation: dragOverlayOut 0.2s ease-in;
}
```

## Responsive Design

### Collapsed Sidebar (Icons Only)
```html
<!-- When sidebar is collapsed, hide labels -->
<button class="h-12 flex flex-col items-center justify-center gap-1 py-1 px-2">
  <svg class="w-4 h-4"></svg>
  <!-- Label hidden when collapsed -->
  <span class="text-xs hidden">Label</span>
</button>
```

### Expanded Sidebar (With Labels)
```html
<!-- When sidebar is expanded, show labels -->
<button class="h-12 flex flex-col items-center justify-center gap-1 py-1 px-2">
  <svg class="w-4 h-4"></svg>
  <!-- Label visible when expanded -->
  <span class="text-xs">Label</span>
</button>
```

### Mobile Layout
```html
<!-- Mobile quick actions in bottom sheet -->
<div class="fixed bottom-0 left-0 right-0 bg-card border-t border-border 
            p-4 shadow-lg md:hidden">
  <div class="grid grid-cols-4 gap-2">
    <!-- Quick action buttons -->
  </div>
</div>
```

## Color Palette

### Primary Colors
```css
:root {
  --quick-actions-primary: 220 70% 50%; /* Blue */
  --quick-actions-secondary: 220 60% 90%; /* Light blue */
  --quick-actions-accent: 220 50% 95%; /* Very light blue */
  --quick-actions-foreground: 220 10% 10%; /* Dark gray */
  --quick-actions-background: 0 0% 100%; /* White */
  --quick-actions-border: 220 20% 90%; /* Light gray */
}
```

### Semantic Colors
```css
:root {
  --quick-actions-success: 120 60% 40%; /* Green */
  --quick-actions-warning: 40 90% 50%; /* Orange */
  --quick-actions-error: 0 90% 60%; /* Red */
  --quick-actions-info: 220 80% 60%; /* Blue */
}
```

## Dark Mode Support

### Dark Mode Variables
```css
.dark {
  --quick-actions-primary: 220 70% 60%; /* Lighter blue */
  --quick-actions-secondary: 220 60% 20%; /* Dark blue */
  --quick-actions-accent: 220 50% 15%; /* Very dark blue */
  --quick-actions-foreground: 0 0% 95%; /* Light gray */
  --quick-actions-background: 0 0% 10%; /* Dark gray */
  --quick-actions-border: 220 20% 20%; /* Darker gray */
}
```

### Dark Mode Classes
```html
<!-- Apply dark mode classes conditionally -->
<div class="bg-card dark:bg-card-dark border-border dark:border-border-dark">
  <!-- Content -->
</div>
```

## Utility Classes

### Spacing
```css
/* Consistent padding and margins */
.quick-actions-padding { padding: 0.75rem; }
.quick-actions-margin { margin: 0.75rem; }
.quick-actions-gap { gap: 0.5rem; }
```

### Borders
```css
/* Consistent border styling */
.quick-actions-border {
  border-width: 1px;
  border-style: solid;
  border-color: hsl(var(--border));
}

.quick-actions-border-radius {
  border-radius: 0.375rem; /* 6px */
}
```

### Shadows
```css
/* Subtle shadows for depth */
.quick-actions-shadow {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

.quick-actions-shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
}
```

## Accessibility Classes

### Focus Styles
```css
/* Visible focus indicators */
.quick-actions-focus {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .quick-actions-animate {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode
```css
/* High contrast support */
@media (prefers-contrast: high) {
  .quick-actions-border {
    border-width: 2px;
  }
  
  .quick-actions-focus {
    outline-width: 3px;
  }
}
```