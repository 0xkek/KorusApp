import React, { createContext, ReactNode, useContext, useState } from 'react';
import KorusAlert from './KorusAlert';

interface AlertData {
  title: string;
  message: string;
  type?: 'success' | 'bump' | 'info';
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

  const showAlert = (data: AlertData) => {
    setAlertData(data);
    setIsVisible(true);
  };

  const hideAlert = () => {
    setIsVisible(false);
    // Clear alert data after animation completes
    setTimeout(() => {
      setAlertData(null);
    }, 300);
  };

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
        />
      )}
    </KorusAlertContext.Provider>
  );
};