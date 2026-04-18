import Dexie, { type Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  avatar: string; // Base64 or URL
  personality: string;
  context: string; // Background info
  readingNotes: Record<string, string[]>; // { bookId: ["Note 1", "Note 2"] }
  isSystem?: boolean;
}

export interface Book {
  id?: number;
  title: string;
  author: string;
  cover?: string;
  content: string | ArrayBuffer;
  type: 'txt' | 'epub';
  addedAt: number;
}

export interface Highlight {
  id?: number;
  bookId: number;
  cfi?: string; // For EPUB
  text: string;
  comment?: string;
  userComment?: string;
  context: string; // 500 chars before/after
  summary: string; // Chapter summary
  timestamp: number;
  replies: Array<{
    characterId: number;
    text: string;
    timestamp: number;
  }>;
}

export interface Moment {
  id?: number;
  characterId: number;
  content: string;
  image?: string;
  likes: number[]; // Array of characterIds
  comments: Array<{
    characterId: number;
    text: string;
    timestamp: number;
  }>;
  timestamp: number;
}

export interface ChatMessage {
  id?: number;
  chatId: string; // "p2p-1" or "group-1"
  senderId: number; // -1 for User
  text: string;
  timestamp: number;
}

export interface Settings {
  id?: number;
  geminiApiKey: string;
  worldInfo: string;
}

export class AppDatabase extends Dexie {
  characters!: Table<Character>;
  books!: Table<Book>;
  highlights!: Table<Highlight>;
  moments!: Table<Moment>;
  messages!: Table<ChatMessage>;
  settings!: Table<Settings>;

  constructor() {
    super('AppDatabase');
    this.version(1).stores({
      characters: '++id, name',
      books: '++id, title',
      highlights: '++id, bookId, text',
      moments: '++id, characterId, timestamp',
      messages: '++id, chatId, timestamp',
      settings: '++id',
    });
  }
}

export const db = new AppDatabase();

// Initial data if empty
export async function initDb() {
  const charCount = await db.characters.count();
  if (charCount === 0) {
    await db.characters.add({
      name: "林惜",
      avatar: "https://picsum.photos/seed/girl1/200/200",
      personality: "温柔体贴，学识渊博，偶尔有些小毒舌的文学系少女。",
      context: "自幼喜爱阅读，对文学有独特的见解，喜欢分享自己的读书感悟。",
      readingNotes: {},
    });
    await db.characters.add({
      name: "墨影",
      avatar: "https://picsum.photos/seed/boy1/200/200",
      personality: "冷静理智，少言寡语，观察力敏锐的黑衣少年。",
      context: "神秘的独行侠，对心理学和推理小说极感兴趣。",
      readingNotes: {},
    });
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      geminiApiKey: process.env.GEMINI_API_KEY || "",
      worldInfo: "这是一个充满AI伴读的奇妙世界，每个角色都有真实的灵魂和独立的思想。",
    });
  }

  const bookCount = await db.books.count();
  if (bookCount === 0) {
    await db.books.add({
      title: "《月亮与六便士》",
      author: "毛姆",
      content: "我总觉得，大多数人都是在梦幻中度过一生的。\n他们从来没有睁开过眼睛，去看看外面的真实世界。\n斯特里克兰德就是这样一个人，他直到四十岁才开始觉醒...\n（此处省略一万字，作为示例内容）",
      type: "txt",
      addedAt: Date.now(),
    });
  }
}
