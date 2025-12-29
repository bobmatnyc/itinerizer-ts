/**
 * Modal Store
 *
 * Provides a reactive store for confirmation dialogs.
 */

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmDialog extends ConfirmOptions {
  id: string;
  resolve: (value: boolean) => void;
}

class ModalStore {
  private dialog = $state<ConfirmDialog | null>(null);
  private idCounter = 0;

  get current(): ConfirmDialog | null {
    return this.dialog;
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const id = `confirm-${++this.idCounter}`;
      this.dialog = {
        id,
        ...options,
        resolve,
      };
    });
  }

  resolve(value: boolean) {
    if (this.dialog) {
      this.dialog.resolve(value);
      this.dialog = null;
    }
  }

  cancel() {
    this.resolve(false);
  }
}

export const modal = new ModalStore();
