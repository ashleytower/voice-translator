import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraTranslateView } from './CameraTranslateView';
import type { Language } from '@/types';

// Mock the camera translate service
vi.mock('@/lib/gemini-camera-translate', () => ({
  translateCameraImage: vi.fn(),
}));

vi.mock('@/lib/gemini-dish-analyze', () => ({
  analyzeDish: vi.fn(),
}));

vi.mock('@/lib/gemini-price-analyze', () => ({
  analyzePrice: vi.fn(),
}));

vi.mock('@/hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({ convert: vi.fn().mockReturnValue(68), rates: {}, isLoading: false, lastUpdated: null }),
}));

vi.mock('@/lib/currency-constants', () => ({
  HOME_CURRENCIES: [{ code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }],
  LANG_TO_CURRENCY: {},
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ user: null }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ tier: 'free', isPaid: false, isLoading: false }),
}));

vi.mock('@/lib/memory', () => ({
  saveMemory: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/photo-upload', () => ({
  uploadMemoryPhoto: vi.fn().mockResolvedValue(null),
}));

import { translateCameraImage } from '@/lib/gemini-camera-translate';
import { analyzeDish } from '@/lib/gemini-dish-analyze';

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
const mockStop = vi.fn();

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock HTMLVideoElement.play
HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

// Mock canvas operations
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
});
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockbase64data');

const mockTrack = { stop: mockStop };
const mockStream = {
  getTracks: vi.fn().mockReturnValue([mockTrack]),
};

const toLang: Language = { code: 'en', name: 'English', flag: '🇺🇸' };

describe('CameraTranslateView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockStream);
  });

  it('renders the viewfinder and shutter button', async () => {
    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('requests rear camera on mount', async () => {
    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: { ideal: 'environment' } },
      });
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={onClose}
        onSaveTranslation={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('stops camera tracks when unmounted', async () => {
    const { unmount } = render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
      />
    );
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
    unmount();
    expect(mockStop).toHaveBeenCalled();
  });

  it('shows loading state while translating', async () => {
    (translateCameraImage as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
      />
    );

    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /capture/i }));
    await waitFor(() => {
      expect(screen.getByText(/translating/i)).toBeInTheDocument();
    });
  });

  it('shows translation result after capture', async () => {
    (translateCameraImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      extractedText: 'ラーメン ¥800',
      translatedText: 'Ramen ¥800',
      detectedLanguage: 'Japanese',
      confidence: 0.95,
      segments: [],
    });

    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
      />
    );

    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /capture/i }));

    await waitFor(() => {
      expect(screen.getByText('Ramen ¥800')).toBeInTheDocument();
    });
    expect(screen.getByText('Japanese')).toBeInTheDocument();
  });

  it('calls onSaveTranslation when Save is clicked', async () => {
    const mockResult = {
      extractedText: 'ラーメン',
      translatedText: 'Ramen',
      detectedLanguage: 'Japanese',
      confidence: 0.95,
      segments: [],
    };
    (translateCameraImage as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const onSave = vi.fn();
    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={onSave}
      />
    );

    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /capture/i }));
    await waitFor(() => screen.getByText('Ramen'));

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(mockResult);
  });

  it('shows error message when camera is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/camera access denied/i)).toBeInTheDocument();
    });
  });

  it('renders mode toggle with Translate and Dish options', () => {
    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
        onSaveDish={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /translate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dish/i })).toBeInTheDocument();
  });

  it('calls analyzeDish (not translateCameraImage) when mode is dish', async () => {
    (analyzeDish as ReturnType<typeof vi.fn>).mockResolvedValue({
      dishName: 'Ramen', localName: 'ラーメン', description: 'noodle soup',
      ingredients: ['noodles'], dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: false, dairyFree: false },
      cuisineType: 'Japanese', spiceLevel: 'mild', confidence: 0.9,
    });

    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
        onSaveDish={vi.fn()}
      />
    );

    // Switch to dish mode
    fireEvent.click(screen.getByRole('button', { name: /dish/i }));

    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /capture/i }));

    await waitFor(() => {
      expect(analyzeDish).toHaveBeenCalled();
      expect(translateCameraImage).not.toHaveBeenCalled();
    });
  });

  it('calls onSaveDish when save is clicked in dish mode', async () => {
    const mockDish = {
      dishName: 'Ramen', localName: 'ラーメン', description: 'soup',
      ingredients: ['noodles'],
      dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: false, dairyFree: false },
      cuisineType: 'Japanese', spiceLevel: 'mild' as const, confidence: 0.9,
    };
    (analyzeDish as ReturnType<typeof vi.fn>).mockResolvedValue(mockDish);

    const onSaveDish = vi.fn();
    render(
      <CameraTranslateView
        toLang={toLang}
        homeCurrency="CAD"
        onClose={vi.fn()}
        onSaveTranslation={vi.fn()}
        onSaveDish={onSaveDish}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dish/i }));
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /capture/i }));
    await waitFor(() => screen.getByText('Ramen'));
    fireEvent.click(screen.getByText('Chat about this'));
    expect(onSaveDish).toHaveBeenCalledWith(mockDish);
  });
});
