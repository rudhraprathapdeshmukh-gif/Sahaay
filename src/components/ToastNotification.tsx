import React, { useState, useEffect, useCallback } from 'react';

// Use a shared AudioContext singleton to handle sound suspension
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

// Handle auto-unlock on user interaction
const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
};

window.addEventListener('click', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });

interface ToastNotificationProps {
  notification: {
    id: string;
    title: string;
    body: string;
    type: string;
  };
  onClose: (id: string) => void;
  duration?: number;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onClose,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const getIcon = () => {
    const type = notification.type;
    if (type?.includes('accepted') || type?.includes('confirmed') || type?.includes('success')) {
      return (
        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (type?.includes('cancelled') || type?.includes('failed')) {
      return (
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    return (
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    );
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999] max-w-sm w-full bg-white rounded-lg shadow-lg border border-gray-200
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="p-4 flex items-start gap-3">
        {getIcon()}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.body}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-[5000ms] ease-linear"
          style={{
            width: '100%',
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Toast container to manage multiple toasts
interface Toast {
  id: string;
  title: string;
  body: string;
  type: string;
}

let addToastCallback: ((toast: Toast) => void) | null = null;

export const showToast = (toast: Omit<Toast, 'id'>) => {
  if (addToastCallback) {
    addToastCallback({
      ...toast,
      id: Math.random().toString(36).substr(2, 9)
    });
  }
};

// Hook to play notification sound
export const useNotificationSound = (enabled: boolean = true) => {
  const playSound = useCallback(() => {
    if (!enabled) return;

    try {
      const audioContext = getAudioContext();

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Two-tone chime
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880.0, audioContext.currentTime + 0.1);

      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [enabled]);

  return playSound;
};

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastCallback = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
    };

    return () => {
      addToastCallback = null;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <>
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          notification={toast}
          onClose={removeToast}
        />
      ))}
    </>
  );
};

export default ToastContainer;
