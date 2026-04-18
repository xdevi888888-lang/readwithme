import { GoogleGenAI } from "@google/genai";
import { db, type Character, type Highlight } from "../lib/db";

export class AIService {
  private static instance: AIService;
  private ai: GoogleGenAI | null = null;

  private constructor() {}

  static async getInstance(): Promise<AIService> {
    if (!this.instance) {
      this.instance = new AIService();
    }
    const settings = await db.settings.toCollection().first();
    const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY || "";
    if (apiKey) {
      this.instance.ai = new GoogleGenAI({ apiKey });
    }
    return this.instance;
  }

  private async generate(prompt: string, systemInstruction: string): Promise<string> {
    if (!this.ai) return "API Key not configured.";
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.8,
        },
      });
      return response.text || "";
    } catch (e) {
      console.error(e);
      return "AI Error occurred.";
    }
  }

  /**
   * Decide if a character should reply to a highlight.
   */
  async decideReply(
    character: Character,
    highlight: { text: string; userComment?: string; context: string; summary: string },
    previousHighlights: Highlight[]
  ): Promise<string | null> {
    const memory = previousHighlights
      .map(h => `原文：${h.text}\n我的看法：${h.comment || h.userComment}`)
      .join("\n---\n");

    const systemPrompt = `
你现在扮演 ${character.name}。
人设：${character.personality}
背景：${character.context}

全局约束：
1. 绝对不能出戏（OOC）。
2. 保持角色性格。
3. 你的回复应该是自然、真诚的，就像两个朋友在共读一本书。
4. 可以引用之前的讨论内容（见补充记忆）。

补充记忆（历史讨论）：
${memory}

当前场景：
用户在阅读时产生了一处划线，并给出了评价。
本章摘要：${highlight.summary}
划线内容前后文（各500字左右）：${highlight.context}
划线原文：${highlight.text}
用户评价：${highlight.userComment || "（无）"}

请决定是否参与讨论。
如果你决定参与，请直接返回你的评论内容（字数控制在100字以内）。
如果你决定保持沉默，请返回 [SILENCE]。
`;

    const result = await this.generate("请进行判断并发言。", systemPrompt);
    if (result.trim() === "[SILENCE]" || result.length < 5) return null;
    return result.trim();
  }

  /**
   * Scan current page for active highlighting.
   */
  async activeHighlightScan(
    character: Character,
    content: string,
    summary: string,
    existingHighlightsCount: number
  ): Promise<{ text: string; comment: string }[] | null> {
    if (existingHighlightsCount >= 3) return null;

    const systemPrompt = `
你现在扮演 ${character.name}，正在阅读以下内容。
人设：${character.personality}
背景：${character.context}

任务：
作为读者，模拟真人的阅读习惯。从下方给出的文字中随机挑选 0-3 处你感兴趣的内容进行划线，并留下你的评论。
如果觉得没什么可说的，请返回空数组 []。

当前页文字：
${content}

本章摘要：${summary}

输出格式：JSON 数组，如 [{"text": "原文片段", "comment": "你的评论"}]。
不要超出 3 处。
`;

    const result = await this.generate("扫描全文并给出你的反馈。", systemPrompt);
    try {
      // Basic JSON extraction
      const jsonStart = result.indexOf("[");
      const jsonEnd = result.lastIndexOf("]") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(result.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.error("Failed to parse active highlights", e);
    }
    return null;
  }

  /**
   * Interact with another character's comment.
   */
  async replyToAgent(
    character: Character,
    targetCharacter: Character,
    targetComment: string,
    highlight: { text: string; context: string },
    summary: string
  ): Promise<string | null> {
    const systemPrompt = `
你现在扮演 ${character.name}。
人设：${character.personality}
背景：${character.context}

场景：
你和朋友 ${targetCharacter.name} 正在一起共读。
${targetCharacter.name} 对以下原文发表了评论：
原文：${highlight.text}
${targetCharacter.name} 的评论：${targetComment}

本章摘要：${summary}
片段上下文：${highlight.context}

请决定是否要针对 ${targetCharacter.name} 的评论进行互动。
如果要互动，请直接返回你的评论内容。
如果要保持沉默，请返回 [SILENCE]。
`;
    const result = await this.generate("互动决策。", systemPrompt);
    if (result.trim() === "[SILENCE]" || result.length < 5) return null;
    return result.trim();
  }
}
