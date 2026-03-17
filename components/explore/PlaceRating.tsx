'use client';

interface PlaceRatingProps {
  rating: number | null;
  onRate: (rating: number | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z';

const SIZE_MAP = {
  sm: { width: 16, height: 16, gap: 'gap-0.5' },
  md: { width: 20, height: 20, gap: 'gap-1' },
} as const;

export function PlaceRating({
  rating,
  onRate,
  disabled = false,
  size = 'sm',
}: PlaceRatingProps) {
  const { width, height, gap } = SIZE_MAP[size];

  function handleClick(star: number) {
    if (disabled) return;
    // Tap same star to clear
    if (rating === star) {
      onRate(null);
    } else {
      onRate(star);
    }
  }

  return (
    <div
      className={`flex items-center ${gap}`}
      role="group"
      aria-label="Place rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating !== null && star <= rating;

        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(star);
            }}
            aria-label={`Rate ${star} out of 5 stars`}
            className="p-0 bg-transparent border-none cursor-pointer disabled:cursor-default disabled:opacity-50"
          >
            <svg
              width={width}
              height={height}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={STAR_PATH}
                fill={filled ? '#f5c842' : 'none'}
                stroke={filled ? '#f5c842' : 'rgba(255,255,255,0.5)'}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default PlaceRating;
