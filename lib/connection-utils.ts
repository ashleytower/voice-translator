/**
 * Connection utilities for handling Gemini Live WebSocket connections
 * with robust error handling and user-friendly error messages
 */

export type ErrorType = 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'CAMERA_ERROR' | 'UNKNOWN_ERROR';

export interface ConnectionError {
  type: ErrorType;
  message: string;
  userMessage: string;
  originalError?: Error;
}

export interface ValidationResult {
  isValid: boolean;
  error?: ConnectionError;
}

export interface CameraSetupResult {
  success: boolean;
  stream?: MediaStream;
  error?: ConnectionError;
}

/**
 * Validates the WebSocket proxy URL configuration
 * Returns validation result with user-friendly error messages
 */
export function validateProxyUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      error: {
        type: 'CONFIG_ERROR',
        message: 'Proxy URL is empty',
        userMessage: 'Configuration error. Proxy URL is not set.',
      },
    };
  }

  if (url.includes('YOUR_PROJECT') || url.includes('YOUR_SUPABASE_PROJECT')) {
    return {
      isValid: false,
      error: {
        type: 'CONFIG_ERROR',
        message: 'Proxy URL is not configured (still using placeholder)',
        userMessage: 'Configuration error. Please check your settings.',
      },
    };
  }

  if (!url.startsWith('wss://')) {
    return {
      isValid: false,
      error: {
        type: 'CONFIG_ERROR',
        message: 'Proxy URL must use wss:// protocol',
        userMessage: 'Configuration error. Invalid proxy URL format.',
      },
    };
  }

  return { isValid: true };
}

/**
 * Handles connection errors and returns standardized error object
 */
export function handleConnectionError(error: unknown): ConnectionError {
  if (isConnectionError(error)) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes('WebSocket') || error.message.includes('socket')) {
      return {
        type: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Unable to connect. Please check your internet connection.',
        originalError: error,
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      originalError: error,
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: String(error),
    userMessage: 'An unexpected error occurred. Please try again.',
  };
}

function isConnectionError(error: unknown): error is ConnectionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'userMessage' in error
  );
}

/**
 * Sets up camera with comprehensive error handling
 */
export async function setupCameraWithErrorHandling(
  constraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }
): Promise<CameraSetupResult> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        error: {
          type: 'CAMERA_ERROR',
          message: 'MediaDevices API not available',
          userMessage: 'Camera is not supported on this device.',
        },
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    return {
      success: true,
      stream,
    };
  } catch (err) {
    const error = err as Error;

    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          success: false,
          error: {
            type: 'CAMERA_ERROR',
            message: error.message,
            userMessage: 'Camera access denied. Please allow camera permissions.',
            originalError: error,
          },
        };

      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          success: false,
          error: {
            type: 'CAMERA_ERROR',
            message: error.message,
            userMessage: 'No camera found on this device.',
            originalError: error,
          },
        };

      case 'NotReadableError':
      case 'TrackStartError':
        return {
          success: false,
          error: {
            type: 'CAMERA_ERROR',
            message: error.message,
            userMessage: 'Camera is in use by another application.',
            originalError: error,
          },
        };

      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          success: false,
          error: {
            type: 'CAMERA_ERROR',
            message: error.message,
            userMessage: 'Camera settings are not supported.',
            originalError: error,
          },
        };

      default:
        return {
          success: false,
          error: {
            type: 'CAMERA_ERROR',
            message: error.message,
            userMessage: 'Failed to access camera. Please try again.',
            originalError: error,
          },
        };
    }
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}
