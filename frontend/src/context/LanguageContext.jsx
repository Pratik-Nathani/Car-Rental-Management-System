import { createContext, useContext, useState, useEffect } from 'react'
import { translate } from '../utils/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem('rmr_language') || 'en')

  useEffect(() => {
    localStorage.setItem('rmr_language', language)
  }, [language])

  const setLanguage = (lang) => setLanguageState(lang)
  const toggleLanguage = () => setLanguageState(prev => (prev === 'en' ? 'hi' : 'en'))
  const t = (key) => translate(key, language)

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
