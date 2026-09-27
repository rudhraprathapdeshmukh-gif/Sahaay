import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface LanguageOption {
  code: string
  label: string
  nativeLabel: string
  flag?: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' }
]

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'dropdown'
  className?: string
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className = ''
}) => {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Current selected language or default to 'en'
  const currentLangCode = i18n.resolvedLanguage || i18n.language || 'en'
  const currentLang = LANGUAGES.find(l => currentLangCode.startsWith(l.code)) || LANGUAGES[0]

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    try {
      localStorage.setItem('i18nextLng', code)
    } catch {
      // ignore storage errors
    }
    setIsOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center rounded-lg border border-stone-200 bg-white p-0.5 text-xs ${className}`}>
        {LANGUAGES.map(lang => {
          const isActive = currentLang.code === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {lang.nativeLabel}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg
          className="w-3.5 h-3.5 text-stone-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{currentLang.nativeLabel}</span>
        <svg
          className={`w-3 h-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-white shadow-lg border border-stone-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
            Select Language
          </div>
          {LANGUAGES.map(lang => {
            const isActive = currentLang.code === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <span>{lang.nativeLabel}</span>
                <span className="text-[10px] text-stone-400 font-normal">({lang.label})</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector