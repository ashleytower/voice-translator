import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

describe('useGeolocation', () => {
  let watchPositionMock: ReturnType<typeof vi.fn>;
  let clearWatchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchPositionMock = vi.fn();
    clearWatchMock = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns loading=true initially', () => {
    watchPositionMock.mockReturnValue(1);

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.loading).toBe(true);
    expect(result.current.latitude).toBeNull();
    expect(result.current.longitude).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns coordinates on success', async () => {
    watchPositionMock.mockImplementation((success) => {
      success({
        coords: { latitude: 48.8566, longitude: 2.3522 },
      });
      return 1;
    });

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.latitude).toBe(48.8566);
    expect(result.current.longitude).toBe(2.3522);
    expect(result.current.error).toBeNull();

    // Verify watchPosition was called with enableHighAccuracy
    expect(watchPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true }),
    );
  });

  it('returns null coordinates on permission denied', async () => {
    watchPositionMock.mockImplementation((_success, error) => {
      error({
        code: 1,
        message: 'User denied Geolocation',
        PERMISSION_DENIED: 1,
      });
      return 1;
    });

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.latitude).toBeNull();
    expect(result.current.longitude).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('denied');
  });

  it('returns null coordinates when geolocation API unavailable', async () => {
    // Remove geolocation API entirely
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.latitude).toBeNull();
    expect(result.current.longitude).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('not supported');
  });

  it('cleans up watcher on unmount', () => {
    const watchId = 42;
    watchPositionMock.mockReturnValue(watchId);

    const { unmount } = renderHook(() => useGeolocation());

    unmount();

    expect(clearWatchMock).toHaveBeenCalledWith(watchId);
  });
});
