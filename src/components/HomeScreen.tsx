import { BookOpen, MessageCircle, Settings, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const APPS = [
  { id: 'chat', name: 'AI聊天', icon: MessageCircle, color: 'bg-wechat-green' },
  { id: 'world', name: '世界书', icon: Users, color: 'bg-[#5856D6]' },
  { id: 'reader', name: '共读器', icon: BookOpen, color: 'bg-[#FF9500]' },
  { id: 'settings', name: '设置', icon: Settings, color: 'bg-text-secondary' },
];

export default function HomeScreen({ onAppLaunch }: { onAppLaunch: (id: any) => void }) {
  return (
    <div className="h-full bg-cover bg-center flex flex-col p-6 pt-12" style={{ backgroundImage: 'url(https://picsum.photos/seed/ioswall/800/1200)' }}>
      <div className="flex-1 grid grid-cols-4 content-start gap-x-5 gap-y-10 pt-10">
        {APPS.map((app) => (
          <motion.div
            key={app.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => onAppLaunch(app.id)}
          >
            <div className={cn(app.color, "w-[60px] h-[60px] rounded-[14px] flex items-center justify-center app-icon-shadow text-white")}>
              <app.icon size={30} />
            </div>
            <span className="text-white text-[12px] font-medium drop-shadow-md">{app.name}</span>
          </motion.div>
        ))}
      </div>
      
      {/* Dock Area */}
      <div className="h-[84px] bg-white/30 backdrop-blur-3xl rounded-[32px] flex items-center justify-around px-5 mb-6 border border-white/20 ios-shadow">
        {APPS.map((app) => (
          <motion.button
            key={`dock-${app.id}`}
            whileTap={{ scale: 0.8 }}
            onClick={() => onAppLaunch(app.id)}
            className="flex flex-col items-center gap-1"
          >
            <div className={cn(app.color, "w-[50px] h-[50px] rounded-xl flex items-center justify-center text-white shadow-sm")}>
              <app.icon size={24} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
