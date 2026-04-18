/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import ChatApp from './components/apps/ChatApp';
import ContactsApp from './components/apps/ContactsApp';
import ReaderApp from './components/apps/ReaderApp';
import SettingsApp from './components/apps/SettingsApp';
import HomeScreen from './components/HomeScreen';
import { initDb } from './lib/db';

type AppId = 'home' | 'chat' | 'reader' | 'contacts' | 'settings' | 'world';

export default function App() {
  const [activeApp, setActiveApp] = useState<AppId>('home');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDb().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-2xl font-light tracking-widest uppercase"
        >
          Loading Universe...
        </motion.div>
      </div>
    );
  }

  const renderApp = () => {
    switch (activeApp) {
      case 'home':
        return <HomeScreen onAppLaunch={setActiveApp} />;
      case 'chat':
        return <ChatApp onBack={() => setActiveApp('home')} />;
      case 'reader':
        return <ReaderApp onBack={() => setActiveApp('home')} />;
      case 'contacts':
        return <ContactsApp onBack={() => setActiveApp('home')} />;
      case 'settings':
        return <SettingsApp onBack={() => setActiveApp('home')} />;
      default:
        return <HomeScreen onAppLaunch={setActiveApp} />;
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#000] overflow-hidden font-sans">
      <div className="relative w-[375px] h-[720px] rounded-[40px] bg-ios-bg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[4px] border-[#333] flex flex-col">
        {/* Status Bar */}
        <div className="h-[44px] flex items-center justify-between px-6 text-[14px] font-semibold z-50 absolute top-0 left-0 right-0">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <div className="flex gap-1.5 items-center">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Dynamic App Content */}
        <div className="flex-1 relative overflow-hidden bg-ios-bg pt-[44px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeApp}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0"
            >
              {renderApp()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Home Indicator */}
        {activeApp !== 'home' && (
          <div className="h-10 flex items-center justify-center bg-transparent relative z-50">
            <button
              onClick={() => setActiveApp('home')}
              className="w-32 h-1 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
              aria-label="Back to Home"
            />
          </div>
        )}
      </div>
    </div>
  );
}
