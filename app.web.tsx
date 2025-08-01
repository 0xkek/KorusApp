import React, { useEffect } from 'react';
import { Platform } from 'react-native';

// This component wraps the app in a phone frame for web only
export function WebPhoneFrame({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Check if we're in demo mode (not inside an iframe)
      if (window.self === window.top) {
        // Add phone frame styles to the document
        const style = document.createElement('style');
        style.innerHTML = `
          body {
            margin: 0;
            padding: 0;
            background: #0a0a0a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
          }

          #root {
            width: 390px;
            height: 844px;
            background: #000;
            border-radius: 47px;
            box-shadow: 
              inset 0 0 0 2px #333,
              inset 0 0 0 6px #1a1a1a,
              0 0 0 12px #0a0a0a,
              0 20px 40px rgba(0, 0, 0, 0.4),
              0 40px 80px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            position: relative;
          }

          #root::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 126px;
            height: 37px;
            background: #000;
            border-radius: 20px;
            z-index: 10;
            pointer-events: none;
          }

          /* Power button */
          #root::after {
            content: '';
            position: absolute;
            right: -3px;
            top: 200px;
            width: 3px;
            height: 100px;
            background: #333;
            border-radius: 0 2px 2px 0;
          }

          /* Info panel on larger screens */
          @media (min-width: 1000px) {
            body {
              padding: 40px;
            }

            body::before {
              content: 'Korus - Bot-Free Social on Solana';
              position: fixed;
              left: 40px;
              top: 50%;
              transform: translateY(-50%);
              color: #43e97b;
              font-size: 48px;
              font-weight: 900;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              max-width: 300px;
              line-height: 1.2;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return <>{children}</>;
}