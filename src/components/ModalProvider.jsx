import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert', // 'alert', 'confirm', 'prompt'
    message: '',
    resolve: null,
    defaultValue: '',
  });
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const showAlert = (message) => {
    return new Promise((resolve) => {
      setModalState({ isOpen: true, type: 'alert', message, resolve, defaultValue: '' });
    });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setModalState({ isOpen: true, type: 'confirm', message, resolve, defaultValue: '' });
    });
  };

  const showPrompt = (message, defaultValue = '') => {
    return new Promise((resolve) => {
      setInputValue(defaultValue);
      setModalState({ isOpen: true, type: 'prompt', message, resolve, defaultValue });
    });
  };

  const handleClose = (result) => {
    setModalState((prev) => {
      if (prev.resolve) prev.resolve(result);
      return { ...prev, isOpen: false };
    });
  };

  const handleSubmitPrompt = () => {
    handleClose(inputValue);
  };

  useEffect(() => {
    if (modalState.isOpen && modalState.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modalState.isOpen, modalState.type]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (modalState.type === 'prompt') {
        handleSubmitPrompt();
      } else {
        handleClose(true);
      }
    } else if (e.key === 'Escape') {
      handleClose(modalState.type === 'prompt' ? null : false);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {modalState.isOpen && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => handleClose(modalState.type === 'prompt' ? null : false)}
        >
          <div 
            className="modal-content animate-fade-in" 
            style={{
              background: 'white', padding: '1.75rem', borderRadius: '16px',
              maxWidth: '420px', width: '90%', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ 
                background: modalState.type === 'alert' ? '#eff6ff' : (modalState.type === 'confirm' ? '#fef2f2' : '#f0fdf4'), 
                color: modalState.type === 'alert' ? '#3b82f6' : (modalState.type === 'confirm' ? '#ef4444' : '#22c55e'),
                padding: '0.75rem', borderRadius: '50%', display: 'flex' 
              }}>
                {modalState.type === 'alert' ? <Info size={24} /> : (modalState.type === 'confirm' ? <AlertCircle size={24} /> : <CheckCircle size={24} />)}
              </div>
              <div style={{ flex: 1, paddingTop: '0.2rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
                  {modalState.type === 'alert' ? 'Informasi' : (modalState.type === 'confirm' ? 'Konfirmasi' : 'Input Dibutuhkan')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: 1.5 }}>
                  {modalState.message}
                </p>
              </div>
            </div>

            {modalState.type === 'prompt' && (
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                className="input-premium"
                style={{ marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}
                placeholder="Ketik di sini..."
              />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              {modalState.type !== 'alert' && (
                <button 
                  className="btn-secondary" 
                  onClick={() => handleClose(modalState.type === 'prompt' ? null : false)}
                  style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
                >
                  Batal
                </button>
              )}
              {modalState.type === 'prompt' ? (
                <button 
                  className="btn-primary" 
                  onClick={handleSubmitPrompt}
                  style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
                >
                  OK
                </button>
              ) : (
                <button 
                  className="btn-primary" 
                  onClick={() => handleClose(true)}
                  style={{ 
                    padding: '0.6rem 1.25rem', fontWeight: 600,
                    background: modalState.type === 'confirm' ? '#ef4444' : '',
                    borderColor: modalState.type === 'confirm' ? '#ef4444' : ''
                  }}
                >
                  {modalState.type === 'confirm' ? 'Ya, Lanjutkan' : 'Mengerti'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
