// SuperPay Design System
// Consistent design tokens used across the application

export const theme = {
  colors: {
    // Backgrounds
    background: '#0a0a0f',
    backgroundSecondary: '#111118',
    card: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
    cardSolid: '#1a1a2e',
    
    // Primary accent (emerald)
    accent: '#10b981',
    accentDark: '#059669',
    accentLight: '#34d399',
    accentGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    
    // Secondary accents
    purple: '#8b5cf6',
    purpleGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // Text
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    textDisabled: '#4b5563',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    borderAccent: 'rgba(16, 185, 129, 0.3)',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.8)',
    glass: 'rgba(255, 255, 255, 0.05)',
  },
  
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },
  
  borderRadius: {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    full: '9999px',
  },
  
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 30px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.6)',
    glow: '0 0 30px rgba(16, 185, 129, 0.3)',
    glowStrong: '0 10px 40px -10px rgba(16, 185, 129, 0.5)',
  },
  
  typography: {
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, monospace',
    
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '2rem',    // 32px
      '4xl': '2.5rem',  // 40px
      '5xl': '3rem',    // 48px
    },
    
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
  },
  
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  zIndex: {
    dropdown: 50,
    modal: 100,
    toast: 200,
  },
} as const;

// Component style presets
export const presets = {
  // Card styles
  card: {
    background: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.lg,
  },
  
  cardSolid: {
    background: theme.colors.cardSolid,
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border}`,
  },
  
  // Button styles
  buttonPrimary: {
    background: theme.colors.accentGradient,
    color: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    fontWeight: theme.typography.weights.semibold,
    boxShadow: theme.shadows.glowStrong,
  },
  
  buttonSecondary: {
    background: theme.colors.glass,
    color: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
  },
  
  buttonDestructive: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  
  // Input styles
  input: {
    background: 'rgba(0, 0, 0, 0.3)',
    color: theme.colors.textPrimary,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
  },
  
  // Glass effect
  glass: {
    background: theme.colors.glass,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${theme.colors.border}`,
  },
} as const;

export default theme;

