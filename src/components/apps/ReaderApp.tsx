import { ChevronLeft, MessageCircle, MoreVertical, Plus, Sidebar, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { db, type Book, type Highlight, type Character } from '../../lib/db';
import { AIService } from '../../services/aiService';
import { cn } from '../../lib/utils';

export default function ReaderApp({ onBack }: { onBack: () => void }) {
  const books = useLiveQuery(() => db.books.toArray()) || [];
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain') {
      const text = await file.text();
      await db.books.add({
        title: file.name.replace('.txt', ''),
        author: 'Unknown',
        content: text,
        type: 'txt',
        addedAt: Date.now(),
      });
      alert('Imported TXT!');
    } else {
      alert('Only TXT supported currently in this demo for simplicity.');
    }
    setIsImporting(false);
  };

  return (
    <div className="h-full bg-white flex flex-col relative overflow-hidden">
      {!selectedBook ? (
        <>
          <div className="h-14 border-b flex items-center px-4 justify-between bg-white sticky top-0 z-10">
            <button onClick={onBack} className="text-gray-600"><ChevronLeft size={24} /></button>
            <h1 className="font-bold">Bookstack</h1>
            <button onClick={() => setIsImporting(true)} className="text-blue-500"><Plus size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-6">
            {books.map(book => (
              <div key={book.id} onClick={() => setSelectedBook(book)} className="flex flex-col gap-2">
                <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden shadow-md flex items-center justify-center border border-gray-50">
                  {book.cover ? <img src={book.cover} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-center px-2 text-[10px] break-all">{book.title}</span>}
                </div>
                <h3 className="text-xs font-bold line-clamp-2 text-gray-800">{book.title}</h3>
              </div>
            ))}
          </div>

          {isImporting && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 space-y-6 shadow-2xl">
                <h2 className="text-xl font-bold">Import Book</h2>
                <div className="border-2 border-dashed border-gray-200 rounded-[1.5rem] p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors relative cursor-pointer">
                  <input type="file" accept=".txt" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Plus className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-sm text-gray-400">Select .txt file</p>
                </div>
                <button onClick={() => setIsImporting(false)} className="w-full py-3 bg-gray-100 rounded-xl font-medium">Cancel</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <ReaderView book={selectedBook} onBack={() => setSelectedBook(null)} />
      )}
    </div>
  );
}

function ReaderView({ book, onBack }: { book: Book; onBack: () => void }) {
  const [activeSidePanel, setActiveSidePanel] = useState<'replies' | 'notes' | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlights = useLiveQuery(() => db.highlights.where('bookId').equals(book.id!).toArray()) || [];
  const characters = useLiveQuery(() => db.characters.toArray()) || [];
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Selection logic
  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;
    
    const range = selection.getRangeAt(0);
    const text = selection.toString();
    
    // Check if it's within our content
    if (!contentRef.current.contains(range.commonAncestorContainer)) return;

    // Show action bar
    const rect = range.getBoundingClientRect();
    const comment = prompt("Add your comment:");
    if (!comment) return;

    createHighlight(text, comment);
    selection.removeAllRanges();
  };

  const createHighlight = async (text: string, comment: string) => {
    setIsProcessing(true);
    const ai = await AIService.getInstance();
    
    // Context capture (simplified)
    const bookContent = book.content as string;
    const startIndex = Math.max(0, bookContent.indexOf(text) - 500);
    const context = bookContent.substring(startIndex, startIndex + 1000 + text.length);
    const summary = "Reading this chapter together."; // In real app, we might ask AI to summarize first

    const highlightId = await db.highlights.add({
      bookId: book.id!,
      text,
      userComment: comment,
      context,
      summary,
      timestamp: Date.now(),
      replies: []
    });

    const highlight = await db.highlights.get(highlightId);
    if (highlight) {
      // Trigger AI Decision for all characters
      for (const char of characters) {
        const reply = await ai.decideReply(char, { text, userComment: comment, context, summary }, []);
        if (reply) {
          await db.highlights.update(highlightId, {
            replies: [...highlight.replies, { characterId: char.id!, text: reply, timestamp: Date.now() }]
          });
          // Secondary interaction logic
          for (const other of characters) {
             if (other.id !== char.id) {
               const nested = await ai.replyToAgent(other, char, reply, { text, context }, summary);
               if (nested) {
                 const current = (await db.highlights.get(highlightId))?.replies || [];
                 await db.highlights.update(highlightId, {
                   replies: [...current, { characterId: other.id!, text: nested, timestamp: Date.now() }]
                 });
               }
             }
          }
        }
      }
    }
    setIsProcessing(false);
  };

  // Active Highlight logic (mock for demo, would run on scroll/page turn)
  const activeScan = async () => {
    const ai = await AIService.getInstance();
    for (const char of characters) {
      const results = await ai.activeHighlightScan(char, (book.content as string).substring(0, 2000), "Beginning of book", highlights.length);
      if (results) {
        for (const res of results) {
          await db.highlights.add({
            bookId: book.id!,
            text: res.text,
            comment: res.comment,
            context: "",
            summary: "",
            timestamp: Date.now(),
            replies: [{ characterId: char.id!, text: res.comment, timestamp: Date.now() }]
          });
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-paper">
      <div className="h-20 pt-8 border-b flex items-center px-4 justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="text-ios-accent flex items-center gap-1">
          <ChevronLeft size={24} />
          <span className="font-medium">书架</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-text-primary truncate max-w-[150px]">{book.title}</span>
          <button 
            onClick={activeScan} 
            className="text-[10px] font-bold text-ios-accent uppercase tracking-wider h-4 flex items-center"
          >
            {isProcessing ? 'Thinking...' : 'AI Scan'}
          </button>
        </div>
        <button onClick={() => setActiveSidePanel('notes')} className="text-ios-accent"><MoreVertical size={22} /></button>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        <div 
          ref={contentRef}
          onMouseUp={handleSelection}
          className="flex-1 overflow-y-auto px-8 py-10 text-[18px] text-[#2C2C2C] leading-[1.8] font-serif select-text"
        >
          <div className="absolute top-4 right-4 text-[10px] text-text-secondary bg-black/5 px-2 py-1 rounded">
            上下文提取：1000字 + 摘要已同步
          </div>
          {/* Highlight markers logic */}
          {(book.content as string).split('\n').map((para, i) => {
            if (!para.trim()) return <br key={i} />;
            let element: any = [para];
            
            highlights.forEach((h, hIdx) => {
              const newElement: any[] = [];
              element.forEach((part: any) => {
                if (typeof part === 'string' && part.includes(h.text)) {
                  const subParts = part.split(h.text);
                  subParts.forEach((sp, spIdx) => {
                    newElement.push(sp);
                    if (spIdx < subParts.length - 1) {
                      const colors = ['rgba(0, 122, 255, 0.2)', 'rgba(255, 149, 0, 0.2)'];
                      const borders = ['#007AFF', '#FF9500'];
                      const cIdx = hIdx % 2;
                      newElement.push(
                        <span 
                          key={`${h.id}-${spIdx}`}
                          onClick={() => setSelectedHighlight(h)}
                          style={{ backgroundColor: colors[cIdx], borderBottom: `2px solid ${borders[cIdx]}` }}
                          className="cursor-pointer group relative transition-colors hover:brightness-95"
                        >
                          {h.text}
                          {h.replies.length > 0 && (
                            <span className="absolute -top-3 -right-2 bg-ios-accent text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm font-bold">{h.replies.length}</span>
                          )}
                        </span>
                      );
                    }
                  });
                } else {
                  newElement.push(part);
                }
              });
              element = newElement;
            });

            return <p key={i} className="mb-8">{element}</p>;
          })}
        </div>
        
        <AnimatePresence>
          {selectedHighlight && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-x-0 bottom-0 h-[400px] bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.15)] z-30 flex flex-col rounded-t-[20px] border-t overflow-hidden"
            >
              <div className="h-1 bg-gray-200 w-10 mx-auto mt-3 rounded-full" />
              <div className="h-12 border-b flex items-center px-4 justify-between bg-white">
                <h3 className="font-semibold text-sm text-text-primary">划线讨论区</h3>
                <button onClick={() => setSelectedHighlight(null)} className="text-ios-accent font-medium">完成</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {/* User Comment */}
                 <div className="flex flex-col items-end gap-1">
                   <div className="text-[10px] text-text-secondary font-medium mr-2">我</div>
                   <div className="p-3 bg-wechat-green text-white rounded-2xl rounded-tr-none text-sm max-w-[85%] ios-shadow">
                     {selectedHighlight.userComment}
                   </div>
                 </div>
                 
                 {/* Character Replies */}
                 {selectedHighlight.replies.map((reply, i) => {
                   const char = characters.find(c => c.id === reply.characterId);
                   const isA = (char?.id || 0) % 2 === 0;
                   return (
                     <div key={i} className="flex flex-col items-start gap-1">
                       <span className="text-[10px] font-medium text-text-secondary ml-2">AI 角色：{char?.name}</span>
                       <div className={cn(
                         "p-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] border",
                         isA ? "bg-[#E9E9EB] border-gray-100" : "bg-[#FFEDD5] border-orange-100"
                       )}>
                          <div className="prose prose-sm font-sans leading-relaxed">
                            <ReactMarkdown>{reply.text}</ReactMarkdown>
                          </div>
                          <span className="text-[9px] text-gray-400 mt-2 block text-right">{new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                     </div>
                   );
                 })}
              </div>
              <div className="p-4 bg-gray-50 border-t flex gap-3">
                <input className="flex-1 h-9 bg-white border border-gray-200 rounded-full px-4 text-sm outline-none" placeholder="参与讨论..." />
                <button className="w-9 h-9 bg-ios-accent rounded-full flex items-center justify-center text-white">+</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-[80px] border-t bg-white/80 backdrop-blur-md flex items-center justify-around px-4 pb-4">
        <div className="flex flex-col items-center gap-1 text-text-secondary">
          <div className="w-5 h-5 bg-text-secondary rounded-sm" />
          <span className="text-[10px]">首页</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-ios-accent">
          <div className="w-5 h-5 bg-ios-accent rounded-sm" />
          <span className="text-[10px] font-medium">书架</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-text-secondary">
          <div className="w-5 h-5 bg-text-secondary rounded-sm" />
          <span className="text-[10px]">设置</span>
        </div>
      </div>
    </div>
  );
}
