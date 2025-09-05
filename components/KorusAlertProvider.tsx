import React, { createContext, ReactNode, useContext, useState, useRef, useEffect } from 'react';
import KorusAlert from './KorusAlert';

interface AlertData {
  title: string;
  message: string;
  type?: 'success' | 'info';
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

interface KorusAlertContextType {
  showAlert: (data: AlertData) => void;
}

const KorusAlertContext = createContext<KorusAlertContextType | undefined>(undefined);

export const useKorusAlert = () => {
  const context = useContext(KorusAlertContext);
  if (!context) {
    throw new Error('useKorusAlert must be used within a KorusAlertProvider');
  }
  return context;
};

interface KorusAlertProviderProps {
  children: ReactNode;
}

export const KorusAlertProvider: React.FC<KorusAlertProviderProps> = ({ children }) => {
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showAlert = (data: AlertData) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setAlertData(data);
    setIsVisible(true);
  };

  const hideAlert = () => {
    setIsVisible(false);
    // Clear alert data after animation completes
    timeoutRef.current = setTimeout(() => {
      setAlertData(null);
      timeoutRef.current = null;
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <KorusAlertContext.Provider value={{ showAlert }}>
      {children}
      {alertData && (
        <KorusAlert
          visible={isVisible}
          title={alertData.title}
          message={alertData.message}
          type={alertData.type}
          onClose={hideAlert}
          autoDismiss={alertData.autoDismiss}
          autoDismissDelay={alertData.autoDismissDelay}
        />
      )}
    </KorusAlertContext.Provider>
  );
};