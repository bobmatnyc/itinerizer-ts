/**
 * Toast Notification Store
 *
 * Provides a reactive store for displaying toast notifications.
 * Supports success, error, warning, and info types with auto-dismiss.
 */

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

interface ToastOptions {
  duration?: number;
}

class ToastStore {
  private toasts = $state<Toast[]>([]);
  private idCounter = 0;

  get items(): Toast[] {
    return this.toasts;
  }

  private add(type: Toast['type'], message: string, options: ToastOptions = {}) {
    const duration = options.duration ?? (type === 'error' ? 5000 : 3000);
    const id = `toast-${++this.idCounter}`;

    const toast: Toast = { id, type, message, duration };
    this.toasts = [...this.toasts, toast];

    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismiss(id);
    }, duration);

    return id;
  }

  success(message: string, options?: ToastOptions) {
    return this.add('success', message, options);
  }

  error(message: string, options?: ToastOptions) {
    return this.add('error', message, options);
  }

  warning(message: string, options?: ToastOptions) {
    return this.add('warning', message, options);
  }

  info(message: string, options?: ToastOptions) {
    return this.add('info', message, options);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  clear() {
    this.toasts = [];
  }
}

export const toast = new ToastStore();
