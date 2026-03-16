import type { NearbyPlace } from '@/types';

export const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours',
  'places.nationalPhoneNumber',
  'places.photos',
  'places.primaryType',
  'places.priceLevel',
].join(',');

export interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  nationalPhoneNumber?: string;
  photos?: Array<{ name: string }>;
  primaryType?: string;
  priceLevel?: string;
}

export function buildPhotoUrl(photoName: string): string {
  return `/api/places/photo?ref=${encodeURIComponent(photoName)}&maxWidth=400`;
}

export function mapPlace(place: GooglePlace): NearbyPlace {
  const firstPhoto = place.photos?.[0]?.name ?? null;

  return {
    id: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    isOpen: place.currentOpeningHours?.openNow ?? null,
    phone: place.nationalPhoneNumber ?? null,
    photoUrl: firstPhoto ? buildPhotoUrl(firstPhoto) : null,
    type: place.primaryType ?? '',
    priceLevel: place.priceLevel ?? null,
  };
}
