import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateProxyUrl,
  handleConnectionError,
  setupCameraWithErrorHandling,
  ConnectionError,
  ErrorType,
} from './connection-utils';

describe('connection-utils', () => {
  describe('validateProxyUrl', () => {
    it('should return valid status for proper wss URL', () => {
      const result = validateProxyUrl('wss://example.supabase.co/functions/v1/gemini-live-proxy');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for placeholder URL', () => {
      const result = validateProxyUrl('wss://YOUR_PROJECT.supabase.co/functions/v1/gemini-live-proxy');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('CONFIG_ERROR');
    });

    it('should return error for empty URL', () => {
      const result = validateProxyUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('CONFIG_ERROR');
    });

    it('should return error for non-wss URL', () => {
      const result = validateProxyUrl('http://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('CONFIG_ERROR');
    });
  });

  describe('handleConnectionError', () => {
    it('should return user-friendly message for config error', () => {
      const error: ConnectionError = {
        type: 'CONFIG_ERROR',
        message: 'Proxy URL not configured',
        userMessage: 'Configuration error. Please check your settings.',
      };
      const result = handleConnectionError(error);
      expect(result.userMessage).toBe('Configuration error. Please check your settings.');
    });

    it('should return user-friendly message for network error', () => {
      const error: ConnectionError = {
        type: 'NETWORK_ERROR',
        message: 'Failed to connect to proxy',
        userMessage: 'Unable to connect. Please check your internet connection.',
      };
      const result = handleConnectionError(error);
      expect(result.userMessage).toBe('Unable to connect. Please check your internet connection.');
    });

    it('should return user-friendly message for camera error', () => {
      const error: ConnectionError = {
        type: 'CAMERA_ERROR',
        message: 'NotAllowedError: Permission denied',
        userMessage: 'Camera access denied. Please allow camera permissions.',
      };
      const result = handleConnectionError(error);
      expect(result.userMessage).toBe('Camera access denied. Please allow camera permissions.');
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('Unknown error');
      const result = handleConnectionError(error);
      expect(result.userMessage).toContain('unexpected error');
    });
  });

  describe('setupCameraWithErrorHandling', () => {
    let mockGetUserMedia: any;

    beforeEach(() => {
      mockGetUserMedia = vi.fn();
      global.navigator = {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      } as any;
    });

    it('should successfully start camera with valid permissions', async () => {
      const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const result = await setupCameraWithErrorHandling();

      expect(result.success).toBe(true);
      expect(result.stream).toBe(mockStream);
      expect(result.error).toBeUndefined();
    });

    it('should handle permission denied error', async () => {
      const notAllowedError = new Error('NotAllowedError');
      notAllowedError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(notAllowedError);

      const result = await setupCameraWithErrorHandling();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('CAMERA_ERROR');
      expect(result.error?.userMessage).toContain('Camera access denied');
    });

    it('should handle camera not found error', async () => {
      const notFoundError = new Error('NotFoundError');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const result = await setupCameraWithErrorHandling();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('CAMERA_ERROR');
      expect(result.error?.userMessage).toContain('No camera found');
    });

    it('should handle camera in use error', async () => {
      const inUseError = new Error('NotReadableError');
      inUseError.name = 'NotReadableError';
      mockGetUserMedia.mockRejectedValue(inUseError);

      const result = await setupCameraWithErrorHandling();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('CAMERA_ERROR');
      expect(result.error?.userMessage).toContain('Camera is in use');
    });
  });
});
