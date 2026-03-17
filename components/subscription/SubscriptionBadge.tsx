import { Star } from 'lucide-react'

interface SubscriptionBadgeProps {
  tier: 'free' | 'paid'
  size?: 'sm' | 'md'
}

const sizeStyles = {
  sm: {
    wrapper: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    icon: 'h-2.5 w-2.5',
  },
  md: {
    wrapper: 'px-2.5 py-1 text-xs gap-1',
    icon: 'h-3 w-3',
  },
}

export function SubscriptionBadge({ tier, size = 'sm' }: SubscriptionBadgeProps) {
  const s = sizeStyles[size]

  if (tier === 'paid') {
    return (
      <span
        data-testid="subscription-badge"
        className={`inline-flex items-center font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ${s.wrapper}`}
      >
        <Star className={`${s.icon} fill-current`} />
        Pro
      </span>
    )
  }

  return (
    <span
      data-testid="subscription-badge"
      className={`inline-flex items-center font-medium rounded-full bg-muted text-muted-foreground ${s.wrapper}`}
    >
      Free
    </span>
  )
}
