import { Camera, ChevronLeft, Heart, MessageCircle, Send } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useState } from 'react';
import { db, type Character, type ChatMessage, type Moment } from '../../lib/db';
import { cn } from '../../lib/utils';

export default function ChatApp({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'chats' | 'moments'>('chats');
  const [activeChat, setActiveChat] = useState<Character | null>(null);

  return (
    <div className="h-full bg-gray-100 flex flex-col relative">
      <div className="h-14 bg-white border-b flex items-center px-4 justify-between sticky top-0 z-20">
        {!activeChat ? (
          <>
            <button onClick={onBack} className="text-gray-600"><ChevronLeft size={24} /></button>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setTab('chats')}
                className={cn("px-4 py-1 text-xs rounded-lg transition-all", tab === 'chats' ? "bg-white shadow-sm font-bold" : "text-gray-500")}
              >
                Chats
              </button>
              <button 
                onClick={() => setTab('moments')}
                className={cn("px-4 py-1 text-xs rounded-lg transition-all", tab === 'moments' ? "bg-white shadow-sm font-bold" : "text-gray-500")}
              >
                Moments
              </button>
            </div>
            <div className="w-6" />
          </>
        ) : (
          <>
            <button onClick={() => setActiveChat(null)} className="text-gray-600 flex items-center gap-1">
              <ChevronLeft size={24} />
              <span className="font-bold">{activeChat.name}</span>
            </button>
            <div className="w-6" />
          </>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeChat ? (
          <ChatMessageView character={activeChat} />
        ) : tab === 'chats' ? (
          <ChatListView onSelect={setActiveChat} />
        ) : (
          <MomentsView />
        )}
      </div>
    </div>
  );
}

function ChatListView({ onSelect }: { onSelect: (c: Character) => void }) {
  const characters = useLiveQuery(() => db.characters.toArray()) || [];
  
  return (
    <div className="h-full overflow-y-auto bg-white">
      {characters.map(char => (
        <button 
          key={char.id} 
          onClick={() => onSelect(char)}
          className="w-full p-4 flex gap-4 items-center border-b border-gray-50 active:bg-gray-50 text-left transition-colors"
        >
          <img src={char.avatar} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100" />
          <div className="flex-1">
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-gray-800">{char.name}</span>
              <span className="text-[10px] text-gray-400">12:30</span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-1">{char.personality}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ChatMessageView({ character }: { character: Character }) {
  const [input, setInput] = useState('');
  const messages = useLiveQuery(() => db.messages.where('chatId').equals(`p2p-${character.id}`).sortBy('timestamp')) || [];

  const handleSend = async () => {
    if (!input.trim() || !character.id) return;
    const msg = input;
    setInput('');
    await db.messages.add({
      chatId: `p2p-${character.id}`,
      senderId: -1,
      text: msg,
      timestamp: Date.now()
    });
    // AI reply logic could go here, but focusing on UI for now
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={m.id || i} className={cn("flex gap-3", m.senderId === -1 ? "flex-row-reverse" : "flex-row")}>
            <img 
              src={m.senderId === -1 ? "https://picsum.photos/seed/user/200/200" : character.avatar} 
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm"
            />
            <div className={cn(
              "max-w-[70%] p-3 rounded-2xl text-sm ios-shadow",
              m.senderId === -1 ? "bg-wechat-green text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
            )}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t flex gap-3 items-center">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button onClick={handleSend} className="bg-green-500 text-white p-2 rounded-full">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function MomentsView() {
  const moments = useLiveQuery(() => db.moments.orderBy('timestamp').reverse().toArray()) || [];
  const characters = useLiveQuery(() => db.characters.toArray()) || [];

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="h-40 bg-gray-200 relative mb-12">
        <img src="https://picsum.photos/seed/moment-cover/800/400" className="w-full h-full object-cover" />
        <div className="absolute -bottom-6 right-6 flex items-center gap-4">
          <span className="text-white font-bold drop-shadow-md pb-6 text-xl">User</span>
          <img src="https://picsum.photos/seed/user/200/200" className="w-16 h-16 rounded-2xl border-2 border-white shadow-xl object-cover" />
        </div>
      </div>

      <div className="px-4 pb-20 space-y-12">
        {moments.map(m => {
          const char = characters.find(c => c.id === m.characterId);
          if (!char) return null;
          return (
            <div key={m.id} className="flex gap-4">
              <img src={char.avatar} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-blue-900">{char.name}</h4>
                <p className="text-sm text-gray-800 leading-relaxed">{m.content}</p>
                {m.image && <img src={m.image} className="w-full max-h-64 object-cover rounded-xl" />}
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(m.timestamp).toLocaleDateString()}</span>
                  <div className="flex gap-4">
                    <Heart size={16} />
                    <MessageCircle size={16} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
