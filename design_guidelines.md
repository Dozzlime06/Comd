# Terminal-Style NFT Website Design Guidelines

## Design Approach
**Retro Terminal Aesthetic** - Inspired by classic command-line interfaces and hacker terminals, creating an immersive, minimalist experience focused purely on functionality and nostalgia.

## Core Visual Identity

### Color Palette
- **Background**: #0f0f0f (near-black)
- **Primary Text**: Monospace green (#00ff00 or similar terminal green)
- **Highlights/Active Elements**: Neon cyan
- **No gradients, shadows, or additional colors** - maintain strict terminal authenticity

### Typography
- **Single Font Family**: Monospace only (use 'Courier New', 'Consolas', or 'Monaco')
- **Text Sizes**: Uniform 14-16px for terminal text, slightly larger for ASCII art header
- **Line Height**: 1.5 for readability in terminal context

### Layout System
- **Full-screen terminal window** taking entire viewport
- **Spacing**: Minimal padding (p-4 to p-6), terminal-authentic spacing
- **No cards, no sections** - everything within one continuous terminal interface

## Component Structure

### ASCII Art Header
- 'CMD402' rendered in ASCII art at top of terminal
- Fixed position or scrolls with content
- Monospace green text matching terminal aesthetic

### Terminal Window
- **Scrolling container** with command history
- **Pre-loaded commands** visible on load: `connect`, `mint`, `balance`, `nfts`, `help`
- **Inline typing**: User types directly after pre-loaded text, no separate input field
- **Blinking cursor** (`|` character) at current typing position
- **Command prompt symbol**: Use `>` or `$` before each line

### Command Output Display
- Results appear inline in terminal flow
- Transaction statuses in neon cyan
- Error messages in red (acceptable exception to color rule)
- Success confirmations in green

### Interactive Elements
- **No traditional buttons** - all interactions via typed commands
- **Cyan highlights** for active/clickable elements if needed
- **Flat design** - zero depth, shadows, or 3D effects

## Layout Specifications
- Single-column, full-viewport terminal
- No multi-column layouts
- Natural scrolling behavior (no fixed heights except viewport)
- Content flows chronologically from top to bottom

## Animations
- **Blinking cursor animation** only (0.5s on/off cycle)
- **Text typing effect** optional for command execution
- **No other animations** - maintain terminal simplicity

## Images
**No images** - This is a pure terminal interface. ASCII art only.

## Accessibility
- Ensure sufficient contrast (green on #0f0f0f meets WCAG standards)
- Keyboard navigation essential (this IS a keyboard-driven interface)
- Screen reader announcements for command results