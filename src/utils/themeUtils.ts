// Helper functions for theme management

/**
 * Apply theme to document
 */
export function applyThemeToDocument(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)

  // Also add/remove 'dark' class for Tailwind dark mode
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/**
 * Get theme from storage or system preference
 */
export function getInitialTheme(): 'light' | 'dark' {
  const THEME_STORAGE_KEY = 'sahaay-theme'

  // Check localStorage first
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }

  // Fall back to system preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

/**
 * Persist theme to storage
 */
export function persistTheme(theme: 'light' | 'dark') {
  localStorage.setItem('sahaay-theme', theme)
}