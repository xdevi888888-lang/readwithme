import { ChevronLeft, Info, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db, type Settings } from '../../lib/db';

export default function SettingsApp({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [key, setKey] = useState('');
  const [world, setWorld] = useState('');

  useEffect(() => {
    db.settings.toCollection().first().then(s => {
      if (s) {
        setSettings(s);
        setKey(s.geminiApiKey);
        setWorld(s.worldInfo);
      }
    });
  }, []);

  const handleSave = async () => {
    if (settings?.id) {
      await db.settings.update(settings.id, { geminiApiKey: key, worldInfo: world });
      alert("Settings saved!");
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="h-14 bg-white border-b flex items-center px-4 justify-between sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center text-ios-accent font-medium">
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
        <h1 className="font-bold text-gray-800">Settings</h1>
        <button onClick={handleSave} className="text-ios-accent">
          <Save size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 space-y-4">
            <div>
              <label className="text-xs uppercase text-gray-400 font-bold mb-1 block">Gemini API Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your API Key"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ios-accent"
              />
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <Info size={10} />
                Your key is stored locally in your browser.
              </p>
            </div>
            
            <div>
              <label className="text-xs uppercase text-gray-400 font-bold mb-1 block">World Info / Global Context</label>
              <textarea
                value={world}
                onChange={(e) => setWorld(e.target.value)}
                placeholder="Define your world rules..."
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-ios-accent"
              />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase">About</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              AI Companion Reader & Social is a experimental playground combining AI agents with reading and social dynamics.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
