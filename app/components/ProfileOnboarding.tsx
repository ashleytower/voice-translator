'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/constants'

interface ProfileOnboardingProps {
  userId: string
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

export default function ProfileOnboarding({ userId, onComplete }: ProfileOnboardingProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en'])
  const [travelStyle, setTravelStyle] = useState<'budget' | 'balanced' | 'luxury' | null>(null)
  const [dietary, setDietary] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

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

  const canSubmit =
    selectedLanguages.length > 0 && travelStyle !== null && dietary.length > 0

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
