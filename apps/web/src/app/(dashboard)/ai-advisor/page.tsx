'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Trash2, Loader2, Bot, User, Sparkles, MessageSquare } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import { useConversations, useConversation, useCreateConversation, useDeleteConversation, streamMessage, type AIMessage, type Conversation } from '@/hooks/useAiChat';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { formatRelative } from '@/lib/formatters';

// ── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'How is my spending this month compared to my budget?',
  'Where am I overspending and how can I cut back?',
  'How long will it take to reach my savings goals at this rate?',
  'What subscriptions am I paying for regularly?',
  'Give me a 3-step plan to increase my savings rate.',
  'Analyze my top spending categories and give advice.',
];

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, isStreaming }: { message: AIMessage & { isStreaming?: boolean }; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isUser ? 'bg-primary' : 'bg-gradient-to-br from-primary to-teal-600'}`}>
        {isUser ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border text-foreground rounded-tl-sm'}`}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                code: ({ children, className }) =>
                  className ? (
                    <code className="block bg-muted rounded-lg px-3 py-2 text-xs font-mono my-2 overflow-x-auto">{children}</code>
                  ) : (
                    <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                  ),
                blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground my-2">{children}</blockquote>,
              } as Components}
            >
              {message.content || ''}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-foreground animate-pulse ml-0.5 align-middle rounded-sm opacity-70" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConvItem({ conv, active, onSelect, onDelete }: { conv: Conversation; active: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}
    >
      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conv.title}</p>
        <p className="text-xs text-muted-foreground">{formatRelative(conv.updatedAt)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main chat page ────────────────────────────────────────────────────────────

export default function AiAdvisorPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [localMessages, setLocalMessages] = useState<(AIMessage & { isStreaming?: boolean })[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useConversations();
  const { data: convData } = useConversation(activeConvId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  // Sync messages from DB when conversation changes
  useEffect(() => {
    if (convData?.messages) {
      setLocalMessages(convData.messages);
    }
  }, [convData?.messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const sendMessage = useCallback(async (content: string) => {
    // Note: accessToken may be null right after a page refresh (memory-only) —
    // streamMessage refreshes it via the cookie, so we don't block on it here.
    if (!content.trim() || isSending) return;
    setError(null);

    let convId = activeConvId;

    // Create conversation if needed
    if (!convId) {
      try {
        const conv = await createConversation.mutateAsync(content);
        convId = conv.id;
        setActiveConvId(conv.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create conversation');
        return;
      }
    }

    // Optimistically add user message
    const userMsg: AIMessage & { isStreaming?: boolean } = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    const streamingMsg: AIMessage & { isStreaming?: boolean } = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setLocalMessages((prev) => [...prev, userMsg, streamingMsg]);
    setInputValue('');
    setIsSending(true);

    try {
      for await (const event of streamMessage(convId, content, accessToken)) {
        if (event.type === 'chunk' && event.content) {
          setLocalMessages((prev) =>
            prev.map((m) => m.id === streamingMsg.id ? { ...m, content: m.content + event.content } : m)
          );
        } else if (event.type === 'done') {
          setLocalMessages((prev) =>
            prev.map((m) => m.id === streamingMsg.id ? { ...m, id: event.messageId ?? m.id, isStreaming: false } : m)
          );
          // Refresh conversation list
          qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
        } else if (event.type === 'error') {
          throw new Error(event.message ?? 'AI error');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setLocalMessages((prev) => prev.filter((m) => m.id !== streamingMsg.id));
    } finally {
      setIsSending(false);
    }
  }, [activeConvId, isSending, accessToken, createConversation, qc]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }

  function startNewChat() {
    setActiveConvId(null);
    setLocalMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  const isEmpty = localMessages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 overflow-hidden">
      {/* ── Sidebar (hidden on mobile to maximize chat space) ── */}
      <div className="hidden sm:flex w-64 shrink-0 border-r border-border flex-col bg-card/50 overflow-hidden">
        <div className="p-3 border-b border-border">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {!(conversations as Conversation[]).length ? (
            <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
          ) : (
            (conversations as Conversation[]).map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                onSelect={() => { setActiveConvId(conv.id); setLocalMessages([]); }}
                onDelete={() => deleteConversation.mutate(conv.id, {
                  onSuccess: () => { if (activeConvId === conv.id) startNewChat(); }
                })}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">FinSight AI Advisor</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Ask me anything about your finances. I can see your spending, budgets, and goals.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm bg-card border border-border hover:border-primary/40 hover:bg-muted rounded-xl px-4 py-3 text-foreground transition-all leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            localMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isStreaming={msg.isStreaming} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-500 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-500/70 hover:text-red-500">✕</button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your spending, budgets, or goals… (Enter to send)"
              rows={1}
              disabled={isSending}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[24px] max-h-32 disabled:opacity-50"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isSending}
              className="shrink-0 w-8 h-8 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground flex items-center justify-center transition-colors"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are for informational purposes only — not financial advice
          </p>
        </div>
      </div>
    </div>
  );
}
