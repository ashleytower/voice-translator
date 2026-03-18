export interface TravelerProfile {
  user_id: string
  languages: string[]
  travel_style: 'budget' | 'balanced' | 'luxury'
  dietary: string[]
  home_currency: string
  home_city: string | null
  phone_number: string | null
  email: string | null
  onboarded_at: string | null
  updated_at: string
}

export type MemoryNodeType = 'place' | 'preference' | 'expense' | 'dish' | 'phrase' | 'event'

export interface MemoryNode {
  id: string
  user_id: string
  type: MemoryNodeType
  content: string
  metadata: Record<string, unknown>
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  photo_path: string | null
  created_at: string
}

export type SubscriptionTier = 'free' | 'paid'

export interface UserSubscription {
  user_id: string
  tier: SubscriptionTier
  started_at: string | null
  expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  updated_at: string
}

export interface UserPreference {
  id: string
  user_id: string
  category: string
  score: number
  sample_count: number
  last_updated: string
}

export interface Database {
  public: {
    Tables: {
      traveler_profiles: {
        Row: TravelerProfile
        Insert: Partial<TravelerProfile> & { user_id: string }
        Update: Partial<Omit<TravelerProfile, 'user_id'>>
      }
      memory_nodes: {
        Row: MemoryNode
        Insert: Omit<MemoryNode, 'id' | 'created_at' | 'city' | 'country' | 'lat' | 'lng' | 'photo_path'> & {
          id?: string
          created_at?: string
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          photo_path?: string | null
        }
        Update: Partial<Omit<MemoryNode, 'id' | 'user_id'>>
      }
      user_subscriptions: {
        Row: UserSubscription
        Insert: Partial<UserSubscription> & { user_id: string }
        Update: Partial<Omit<UserSubscription, 'user_id'>>
      }
      user_preferences: {
        Row: UserPreference
        Insert: Omit<UserPreference, 'id' | 'last_updated'> & { id?: string; last_updated?: string }
        Update: Partial<Omit<UserPreference, 'id' | 'user_id'>>
      }
    }
  }
}
