'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/constants'

interface ProfileOnboardingProps {
  userId: string
  userEmail: string
  onComplete: () => void
}

const TRAVEL_STYLES = [
  { value: 'budget' as const, label: 'Budget', description: 'Hostels, street food, public transit' },
  { value: 'balanced' as const, label: 'Balanced', description: 'Mid-range hotels, local restaurants' },
  { value: 'luxury' as const, label: 'Luxury', description: 'Fine dining, premium experiences' },
]

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-free',
  'No shellfish',
  'No nuts',
  'None',
]

const COUNTRY_CODES = [
  { name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', iso: 'US', dial: '+1' },
  { name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', iso: 'CA', dial: '+1' },
  { name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', iso: 'GB', dial: '+44' },
  { name: 'France', flag: '\u{1F1EB}\u{1F1F7}', iso: 'FR', dial: '+33' },
  { name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', iso: 'DE', dial: '+49' },
  { name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', iso: 'JP', dial: '+81' },
  { name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}', iso: 'AU', dial: '+61' },
  { name: 'India', flag: '\u{1F1EE}\u{1F1F3}', iso: 'IN', dial: '+91' },
  { name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', iso: 'BR', dial: '+55' },
  { name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', iso: 'MX', dial: '+52' },
  { name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', iso: 'ES', dial: '+34' },
  { name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', iso: 'IT', dial: '+39' },
  { name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', iso: 'KR', dial: '+82' },
  { name: 'China', flag: '\u{1F1E8}\u{1F1F3}', iso: 'CN', dial: '+86' },
  { name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', iso: 'NL', dial: '+31' },
  { name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}', iso: 'CH', dial: '+41' },
  { name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}', iso: 'SE', dial: '+46' },
  { name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}', iso: 'NO', dial: '+47' },
  { name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', iso: 'DK', dial: '+45' },
  { name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', iso: 'PT', dial: '+351' },
  { name: 'New Zealand', flag: '\u{1F1F3}\u{1F1FF}', iso: 'NZ', dial: '+64' },
  { name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}', iso: 'IE', dial: '+353' },
  { name: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}', iso: 'SG', dial: '+65' },
  { name: 'Thailand', flag: '\u{1F1F9}\u{1F1ED}', iso: 'TH', dial: '+66' },
]

function getDefaultCountry() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    const region = locale.split('-').pop()?.toUpperCase()
    if (region) {
      const match = COUNTRY_CODES.find((c) => c.iso === region)
      if (match) return match
    }
  } catch {
    // ignore
  }
  return COUNTRY_CODES[0] // US fallback
}

function validateE164(phone: string): boolean {
  return /^\+\d{7,15}$/.test(phone)
}

interface CitySuggestion {
  place_id: string
  description: string
}

export default function ProfileOnboarding({ userId, userEmail, onComplete }: ProfileOnboardingProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en'])
  const [travelStyle, setTravelStyle] = useState<'budget' | 'balanced' | 'luxury' | null>(null)
  const [dietary, setDietary] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [homeCity, setHomeCity] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(getDefaultCountry)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [showCountryPicker, setShowCountryPicker] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCitySuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setCitySuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`)
      if (res.ok) {
        const data = await res.json()
        setCitySuggestions(data.predictions ?? [])
        setShowSuggestions(true)
      }
    } catch {
      // silently fail
    }
  }, [])

  const handleCityChange = (value: string) => {
    setHomeCity(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCitySuggestions(value)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const selectCity = (description: string) => {
    setHomeCity(description)
    setCitySuggestions([])
    setShowSuggestions(false)
  }

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const toggleDietary = (item: string) => {
    if (item === 'None') {
      setDietary(['None'])
      return
    }
    setDietary((prev) => {
      const without = prev.filter((d) => d !== 'None')
      return without.includes(item)
        ? without.filter((d) => d !== item)
        : [...without, item]
    })
  }

  const fullPhone = `${selectedCountry.dial}${phoneDigits}`
  const isPhoneValid = phoneDigits.length > 0 && validateE164(fullPhone)
  const isCityValid = homeCity.trim().length > 0

  const canSubmit =
    selectedLanguages.length > 0 &&
    travelStyle !== null &&
    dietary.length > 0 &&
    isCityValid &&
    isPhoneValid

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.from('traveler_profiles').insert({
      user_id: userId,
      languages: selectedLanguages,
      travel_style: travelStyle,
      dietary: dietary.filter((d) => d !== 'None'),
      onboarded_at: new Date().toISOString(),
      home_city: homeCity.trim(),
      phone_number: fullPhone,
      email: userEmail,
    })

    if (!error) {
      onComplete()
    }

    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1b1e] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Set up your profile</h1>
            <p className="mt-2 text-[#a0a2aa]">
              Help us personalize your travel experience
            </p>
          </div>

          {/* Step 1: Languages */}
          <section className="bg-[#25262b] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              What languages do you need?
            </h2>
            <p className="text-sm text-[#a0a2aa] mb-4">
              Select all that apply
            </p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const selected = selectedLanguages.includes(lang.code)
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                      transition-colors
                      ${
                        selected
                          ? 'bg-[#e84a67] text-white'
                          : 'bg-[#1a1b1e] text-[#a0a2aa] hover:bg-[#2c2d32]'
                      }
                    `}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Step 2: Travel Style */}
          <section className="bg-[#25262b] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              How do you travel?
            </h2>
            <p className="text-sm text-[#a0a2aa] mb-4">
              Pick one
            </p>
            <div className="grid gap-3">
              {TRAVEL_STYLES.map((style) => {
                const selected = travelStyle === style.value
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setTravelStyle(style.value)}
                    className={`
                      text-left p-4 rounded-xl transition-all
                      ${
                        selected
                          ? 'bg-[#1a1b1e] ring-2 ring-[#e84a67]'
                          : 'bg-[#1a1b1e] ring-1 ring-transparent hover:ring-white/10'
                      }
                    `}
                  >
                    <span className="block font-medium text-white">
                      {style.label}
                    </span>
                    <span className="block text-sm text-[#a0a2aa] mt-0.5">
                      {style.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Step 3: Dietary */}
          <section className="bg-[#25262b] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Any dietary needs?
            </h2>
            <p className="text-sm text-[#a0a2aa] mb-4">
              Select all that apply
            </p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((item) => {
                const selected = dietary.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleDietary(item)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${
                        selected
                          ? 'bg-[#e84a67] text-white'
                          : 'bg-[#1a1b1e] text-[#a0a2aa] hover:bg-[#2c2d32]'
                      }
                    `}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Step 4: Email (read-only) */}
          <section className="bg-[#25262b] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Email
            </h2>
            <p className="text-sm text-[#a0a2aa] mb-4">
              From your sign-in account
            </p>
            <div className="flex items-center gap-3 bg-[#1a1b1e] rounded-xl px-4 py-3">
              <svg
                className="w-4 h-4 text-[#a0a2aa] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-white text-sm truncate">{userEmail}</span>
            </div>
          </section>

          {/* Step 5: Home City */}
          <section className="bg-[#25262b] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Home city
            </h2>
            <p className="text-sm text-[#a0a2aa] mb-4">
              Where are you based?
            </p>
            <div className="relative">
              <input
                type="text"
                value={homeCity}
                onChange={(e) => handleCityChange(e.target.value)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
                onFocus={() => {
                  if (citySuggestions.length > 0) setShowSuggestions(true)
                }}
                placeholder="Start typing a city..."
                className="w-full bg-[#1a1b1e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#e84a67] placeholder:text-[#a0a2aa]"
              />
              {showSuggestions && citySuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-[#25262b] border border-white/10 rounded-xl overflow-hidden shadow-lg">
                  {citySuggestions.map((s) => (
                    <li key={s.place_id}>
                      <button
                        type="button"
                        onMouseDown={() => selectCity(s.description)}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#1a1b1e] transition-colors"
                      >
                        {s.description}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Step 6: Phone Number */}
          <section className="bg-[#25262b] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Phone number
            </h2>
            <p className="text-sm text-[#a0a2aa] mb-4">
              For trip notifications
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCountryPicker((prev) => !prev)}
                className="flex items-center gap-1.5 bg-[#1a1b1e] rounded-xl px-3 py-3 text-sm text-white shrink-0 hover:ring-1 hover:ring-white/10 transition-all"
              >
                <span>{selectedCountry.flag}</span>
                <span className="text-[#a0a2aa]">{selectedCountry.dial}</span>
                <svg
                  className={`w-3.5 h-3.5 text-[#a0a2aa] transition-transform ${showCountryPicker ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <input
                type="tel"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="Phone number"
                className="flex-1 bg-[#1a1b1e] text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#e84a67] placeholder:text-[#a0a2aa]"
              />
            </div>
            {showCountryPicker && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-[#1a1b1e] rounded-xl border border-white/10">
                {COUNTRY_CODES.map((country) => (
                  <button
                    key={country.iso + country.dial}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country)
                      setShowCountryPicker(false)
                    }}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                      ${
                        selectedCountry.iso === country.iso && selectedCountry.dial === country.dial
                          ? 'bg-[#e84a67]/10 text-white'
                          : 'text-[#a0a2aa] hover:bg-[#25262b]'
                      }
                    `}
                  >
                    <span>{country.flag}</span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="text-[#a0a2aa]">{country.dial}</span>
                  </button>
                ))}
              </div>
            )}
            {phoneDigits.length > 0 && !isPhoneValid && (
              <p className="mt-2 text-xs text-red-400">
                Enter a valid phone number (7-15 digits)
              </p>
            )}
          </section>

          {/* Submit */}
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className={`
              w-full py-4 rounded-xl text-base font-medium transition-colors
              ${
                canSubmit && !submitting
                  ? 'bg-[#e84a67] hover:bg-[#d63d5a] text-white cursor-pointer'
                  : 'bg-[#25262b] text-[#a0a2aa] cursor-not-allowed'
              }
            `}
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
