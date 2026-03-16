export interface TravelerProfile {
  user_id: string
  languages: string[]
  travel_style: 'budget' | 'balanced' | 'luxury'
  dietary: string[]
  home_currency: string
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
  created_at: string
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
        Insert: Omit<MemoryNode, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MemoryNode, 'id' | 'user_id'>>
      }
    }
  }
}
