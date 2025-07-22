/**
 * Global modal state management utility
 * Use this to notify the app when modals/dialogs are opened/closed
 * to enable automatic scroll locking
 */

import React from 'react';

export interface ModalState {
  isOpen: boolean;
  id?: string;
  type?: 'modal' | 'dialog' | 'drawer' | 'popup' | 'fullscreen';
}

class ModalManager {
  private openModals = new Set<string>();
  
  /**
   * Register a modal as open
   * @param id - Unique identifier for the modal
   * @param type - Type of modal component
   */
  openModal(id: string, type: ModalState['type'] = 'modal') {
    this.openModals.add(id);
    this.dispatchStateChange(true, id, type);
  }
  
  /**
   * Register a modal as closed
   * @param id - Unique identifier for the modal
   */
  closeModal(id: string) {
    this.openModals.delete(id);
    this.dispatchStateChange(this.hasOpenModals(), id);
  }
  
  /**
   * Close all modals
   */
  closeAllModals() {
    this.openModals.clear();
    this.dispatchStateChange(false);
  }
  
  /**
   * Check if any modals are currently open
   */
  hasOpenModals(): boolean {
    return this.openModals.size > 0;
  }
  
  /**
   * Get all open modal IDs
   */
  getOpenModals(): string[] {
    return Array.from(this.openModals);
  }
  
  /**
   * Dispatch modal state change event
   */
  private dispatchStateChange(isOpen: boolean, id?: string, type?: ModalState['type']) {
    const event = new CustomEvent('modalStateChange', {
      detail: { isOpen, id, type }
    });
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const modalManager = new ModalManager();

/**
 * Hook for easily managing modal state in React components
 */
export const useModalManager = (id: string, type: ModalState['type'] = 'modal') => {
  const openModal = () => modalManager.openModal(id, type);
  const closeModal = () => modalManager.closeModal(id);
  
  return { openModal, closeModal };
};

/**
 * Higher-order component to automatically manage modal state
 */
export const withModalScrollLock = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  modalId: string,
  type: ModalState['type'] = 'modal'
) => {
  return React.forwardRef<any, P & { isOpen?: boolean }>((props, ref) => {
    const { isOpen, ...otherProps } = props;
    
    React.useEffect(() => {
      if (isOpen) {
        modalManager.openModal(modalId, type);
      } else {
        modalManager.closeModal(modalId);
      }
      
      // Cleanup on unmount
      return () => {
        modalManager.closeModal(modalId);
      };
    }, [isOpen]);
    
    return <WrappedComponent ref={ref} {...(otherProps as P)} />;
  });
};

/**
 * Utility function to prevent event bubbling and default behavior
 * Use this in modal backgrounds to prevent clicks from closing unexpectedly
 */
export const preventEventBubbling = (event: React.MouseEvent | React.TouchEvent) => {
  event.stopPropagation();
  event.preventDefault();
};

/**
 * Utility function to handle escape key for closing modals
 */
export const useEscapeKey = (callback: () => void, isActive: boolean = true) => {
  React.useEffect(() => {
    if (!isActive) return;
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [callback, isActive]);
};

export default modalManager;