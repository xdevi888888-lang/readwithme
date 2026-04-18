import { ChevronLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Character } from '../../lib/db';

export default function ContactsApp({ onBack }: { onBack: () => void }) {
  const characters = useLiveQuery(() => db.characters.toArray()) || [];
  const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);

  const handleSave = async () => {
    if (!editingChar?.name) return;
    if (editingChar.id) {
      await db.characters.update(editingChar.id, editingChar);
    } else {
      await db.characters.add({
        name: editingChar.name || "New Character",
        avatar: editingChar.avatar || `https://picsum.photos/seed/${Date.now()}/200/200`,
        personality: editingChar.personality || "",
        context: editingChar.context || "",
        readingNotes: {},
      });
    }
    setEditingChar(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this character?")) {
      await db.characters.delete(id);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="h-14 bg-white border-b flex items-center px-4 justify-between">
        <button onClick={onBack} className="text-blue-500"><ChevronLeft size={24} /></button>
        <h1 className="font-bold">Contacts</h1>
        <button onClick={() => setEditingChar({})} className="text-blue-500"><UserPlus size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {characters.map(char => (
            <div key={char.id} className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={char.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h3 className="font-bold text-gray-800">{char.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{char.personality}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingChar(char)} className="text-sm text-blue-500">Edit</button>
                <button onClick={() => char.id && handleDelete(char.id)} className="text-sm text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold">{editingChar.id ? 'Edit' : 'Create'} Character</h2>
            <div className="space-y-3">
              <input
                placeholder="Name"
                value={editingChar.name || ''}
                onChange={e => setEditingChar({ ...editingChar, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2"
              />
              <input
                placeholder="Avatar URL"
                value={editingChar.avatar || ''}
                onChange={e => setEditingChar({ ...editingChar, avatar: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2"
              />
              <textarea
                placeholder="Personality"
                value={editingChar.personality || ''}
                onChange={e => setEditingChar({ ...editingChar, personality: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 h-20"
              />
              <textarea
                placeholder="Context / Background"
                value={editingChar.context || ''}
                onChange={e => setEditingChar({ ...editingChar, context: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 h-20"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setEditingChar(null)}
                className="flex-1 py-3 bg-gray-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-ios-accent text-white rounded-xl font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
