'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarkdownContent } from '@/components/ai/MarkdownContent';
import { InteractiveQuiz } from '@/components/ai/InteractiveQuiz';
import {
  Brain,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  ImagePlus,
  X,
  Sparkles,
  Loader2,
  MessageSquare,
  Bot,
} from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType?: string;
  feedback?: string | null;
  imageData?: string | null;
  createdAt: string;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType: string;
  imageData?: string | null;
  feedback?: string | null;
  quiz?: { title: string; questions: { question: string; options: string[]; answer: number; explanation: string }[] };
  pending?: boolean;
  error?: boolean;
}

const shortcuts = [
  { icon: '📐', label: 'حل مسألة', prompt: 'افضل حل لي هذه المسألة خطوة بخطوة:' },
  { icon: '📚', label: 'اشرحلي درس', prompt: 'اشرح لي هذا الدرس بالتفصيل خطوة بخطوة:' },
  { icon: '📝', label: 'اختبرني', mode: 'quiz' as const },
  { icon: '🎯', label: 'راجع أخطائي', prompt: 'ساعدني أراجع أخطائي في حل المسائل ووضح لي طريقة التفكير الصحيحة:' },
  { icon: '📖', label: 'ساعدني في الواجب', prompt: 'ساعدني في حل واجب الرياضيات وأنا أفهم كله:' },
];

const assistantTitle = 'مساعد مستر عبدالرحمن ناصر';
const assistantSubtitle = 'المساعد التعليمي الذكي لمنصة الرائد في الرياضيات';

export default function AssistantPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const [selection, setSelection] = useState({ title: '', topic: '' });
  const [showQuizTopic, setShowQuizTopic] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      const json = await res.json();
      if (json.success) setConversations(json.data);
    } catch {
      // ignore
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      const json = await res.json();
      if (json.success) {
        const list = (json.data as StoredMessage[]).map<DisplayMessage>((m) => {
          let quiz: DisplayMessage['quiz'];
          if (m.contentType === 'quiz') {
            try {
              quiz = JSON.parse(m.content);
            } catch {
              quiz = undefined;
            }
          }
          return {
            id: m.id,
            role: m.role,
            content: m.contentType === 'quiz' ? '' : m.content,
            contentType: m.contentType || 'text',
            imageData: m.imageData,
            feedback: m.feedback,
            quiz,
          };
        });
        setMessages(list);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const newChat = useCallback(async () => {
    setError('');
    setMessages([]);
    setActiveId(null);
    setInput('');
    setImagePreview(null);
    setShowQuizTopic(false);
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'math' }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveId(json.data.id);
        loadConversations();
      }
    } catch {
      // ignore
    }
  }, [loadConversations]);

  const selectConversation = (id: string) => {
    setActiveId(id);
    setInput('');
    setImagePreview(null);
    setError('');
    setShowQuizTopic(false);
    loadMessages(id);
    setConversationsOpen(false);
  };

  const deleteConversation = async (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirm('هل تريد حذف هذه المحادثة؟')) return;
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    if (activeId === id) {
      setMessages([]);
      setActiveId(null);
    }
    loadConversations();
  };

  const sendMessage = async (
    text?: string,
    opts: { mode?: 'chat' | 'quiz'; topic?: string; regenerate?: boolean } = {}
  ) => {
    const mode = opts.mode || 'chat';
    const content = (text ?? input).trim();
    if (mode === 'chat' && !opts.regenerate && !content && !imagePreview) return;

    setError('');

    if (mode === 'chat') {
      // Add optimistic user + assistant placeholder (unless regenerating).
      const tempUser: DisplayMessage = {
        id: `tmp-${Date.now()}`,
        role: 'user',
        content: content || '[رفع صورة لمسألة]',
        contentType: imagePreview ? 'image' : 'text',
        imageData: imagePreview,
      };
      const tempAssistant: DisplayMessage = {
        id: `tmp-a-${Date.now()}`,
        role: 'assistant',
        content: '',
        contentType: 'text',
        pending: true,
      };
      setMessages((prev) => (opts.regenerate ? [...prev.slice(0, -1), tempAssistant] : [...prev, tempUser, tempAssistant]));
    } else {
      setMessages((prev) => [...prev, {
        id: `tmp-${Date.now()}`,
        role: 'user',
        content: `🔎 اختبار في: ${content || selection.topic || 'عام'}`,
        contentType: 'text',
      }]);
      setMessages((prev) => [...prev, {
        id: `tmp-a-${Date.now()}`,
        role: 'assistant',
        content: '',
        contentType: 'quiz',
        pending: true,
      }]);
    }

    setSending(true);
    setInput('');
    setImagePreview(null);
    setShowQuizTopic(false);

    // Gather context from prior messages for regenerate.
    // Drop the assistant answer being regenerated so the model re-answers.
    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    if (opts.regenerate) {
      let base = messages.filter((m) => !m.pending);
      while (base.length > 0 && base[base.length - 1].role === 'assistant') base = base.slice(0, -1);
      history = base.map((m) => ({
        role: m.role,
        content: m.contentType === 'quiz' ? (JSON.stringify(m.quiz) || m.content) : (m.content || ''),
      }));
    }

    try {
      if (mode === 'quiz') {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'quiz',
            topic: content || selection.topic || undefined,
            subject: 'math',
            conversationId: activeId || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setActiveId(json.data.conversationId);
          let quiz;
          try {
            quiz = JSON.parse(json.data.reply);
          } catch {
            quiz = undefined;
          }
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.pending) {
              last.contentType = 'quiz';
              last.content = '';
              last.quiz = quiz;
              last.pending = false;
            }
            return next;
          });
          loadConversations();
          loadMessages(json.data.conversationId);
        } else {
          setError(json.error || 'فشل إنشاء الاختبار');
        }
      } else {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeId || undefined,
            message: content,
            image: imagePreview || undefined,
            subject: 'math',
            cloneMessages: history.length ? history : undefined,
            regenerate: opts.regenerate || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setActiveId(json.data.conversationId);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.pending) {
              last.content = json.data.reply;
              last.pending = false;
              last.id = json.data.assistantMessageId;
            }
            return next;
          });
          loadConversations();
        } else {
          setError(json.error || 'فشل إرسال الرسالة');
          setMessages((prev) => [...prev.slice(0, -1)]);
        }
      }
    } catch {
      setError('حدث خطأ في الاتصال، حاول مرة أخرى');
    } finally {
      setSending(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const saveFeedback = async (messageId: string, feedback: string) => {
    if (!activeId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
    try {
      await fetch(`/api/ai/conversations/${activeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, feedback }),
      });
    } catch {
      // ignore
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > 6 * 1024 * 1024 * 1.4) {
        setError('حجم الصورة كبير جداً (الحد 6 ميجا)');
        return;
      }
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendShortcut = (s: (typeof shortcuts)[number]) => {
    if (s.mode === 'quiz') {
      setShowQuizTopic(true);
      return;
    }
    if (s.prompt) {
      sendMessage(s.prompt);
    }
  };

  // Initial welcome screen (when no active conversation yet).
  const showWelcome = messages.length === 0;

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-4rem)]">
        {/* Conversation list */}
        <aside
          className={cn(
            'lg:w-72 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3',
            'absolute lg:static inset-0 z-20',
            conversationsOpen ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-text-primary">محادثاتك</h2>
            <button onClick={newChat} className="p-1.5 rounded-lg hover:bg-muted text-text-secondary">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {conversationsOpen && (
            <button
              onClick={() => setConversationsOpen(false)}
              className="lg:hidden flex items-center gap-1 text-sm text-text-secondary mb-2"
            >
              <X className="w-4 h-4" /> إغلاق
            </button>
          )}
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 && (
              <p className="text-sm text-text-secondary p-3">ابدأ محادثة جديدة 🌟</p>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                  activeId === c.id ? 'bg-primary/10' : 'hover:bg-muted'
                )}
              >
                <MessageSquare className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <span className="flex-1 text-sm text-text-primary truncate">{c.title}</span>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-text-secondary hover:text-destructive"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {conversationsOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-10"
            onClick={() => setConversationsOpen(false)}
          />
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <button
              onClick={() => setConversationsOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-text-secondary"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white flex-shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-text-primary truncate">{assistantTitle}</h1>
              <p className="text-xs text-text-secondary truncate">{assistantSubtitle}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={newChat}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">محادثة جديدة</span>
            </Button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm">
              <span>{error}</span>
              <button onClick={() => setError('')} className="p-1 hover:bg-destructive/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {showWelcome && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">{assistantTitle}</h2>
                  <p className="text-text-secondary mt-1 max-w-md">
                    أساعدك تفهم الرياضيات خطوة بخطوة، أحل معاك تمارين، أشرح دروس، وأعمل اختبارات في المنهج المصري.
                  </p>
                </div>

                {/* Shortcuts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg mt-2">
                  {shortcuts.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendShortcut(s)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted transition-all text-sm text-text-primary"
                    >
                      <span className="text-base">{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'justify-start flex-row' : 'justify-start')}>
                <div className={cn('max-w-[85%]', m.role === 'user' ? 'self-start' : 'w-full')}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                        <Brain className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-medium text-text-secondary">{assistantTitle}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl p-3',
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-muted/50 text-text-primary'
                    )}
                  >
                    {m.role === 'user' ? (
                      <div className="space-y-2">
                        {m.imageData && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.imageData}
                            alt="سؤال"
                            className="max-h-44 rounded-xl object-contain"
                          />
                        )}
                        {m.contentType !== 'image' && <p className="whitespace-pre-wrap">{m.content}</p>}
                      </div>
                    ) : m.contentType === 'quiz' ? (
                      m.quiz ? (
                        <InteractiveQuiz quiz={m.quiz} />
                      ) : (
                        <p className="text-sm text-text-secondary">في انتظار توليد الاختبار...</p>
                      )
                    ) : m.pending ? (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">مستر عبدالرحمن بيفكر...</span>
                      </div>
                    ) : (
                      <MarkdownContent content={m.content} />
                    )}
                  </div>

                  {m.role === 'assistant' && !m.pending && m.contentType !== 'quiz' && (
                    <div className="flex items-center gap-1 mt-1.5 text-text-secondary">
                      <button
                        onClick={() => copyMessage(m.id, m.content)}
                        className="p-1.5 rounded-lg hover:bg-muted"
                        title="انسخ"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => sendMessage('', { regenerate: true })}
                        className="p-1.5 rounded-lg hover:bg-muted"
                        title="إعادة التوليد"
                        disabled={sending}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => saveFeedback(m.id, 'up')}
                        className={cn('p-1.5 rounded-lg hover:bg-muted', m.feedback === '👍' && 'text-primary')}
                        title="مفيد"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => saveFeedback(m.id, 'down')}
                        className={cn('p-1.5 rounded-lg hover:bg-muted', m.feedback === '👎' && 'text-destructive')}
                        title="غير مفيد"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {showQuizTopic && (
              <div className="rounded-2xl border border-border bg-muted/50 p-4 space-y-2">
                <p className="font-medium text-text-primary text-sm">اكتب اسم الدرس اللي عايز تختبر فيه:</p>
                <div className="flex gap-2">
                  <input
                    value={selection.title}
                    onChange={(e) => setSelection({ ...selection, title: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-text-primary text-sm"
                    placeholder="مثال: التفاضل، الجبر، الهندسة الفراغية..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendMessage(selection.title, { mode: 'quiz', topic: selection.title });
                    }}
                  />
                  <Button size="sm" onClick={() => sendMessage(selection.title, { mode: 'quiz', topic: selection.title })} disabled={sending}>
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">ابدأ</span>
                  </Button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            {imagePreview && (
              <div className="flex items-center gap-2 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="مرفق" className="h-16 rounded-lg object-contain border border-border" />
                <button onClick={() => setImagePreview(null)} className="p-1.5 rounded-lg hover:bg-muted text-text-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onFileSelect}
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="p-2.5 rounded-xl hover:bg-muted text-text-secondary flex-shrink-0"
                title="ارفع صورة لمسألة"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                className="flex-1 max-h-32 resize-none px-3 py-2.5 rounded-xl border border-border bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={imagePreview ? 'اكتب تفاصيل المسألة (اختياري) أو أرسل الصورة...' : 'اسأل سؤالك في الرياضيات...'}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={sending || (!input.trim() && !imagePreview)}
                className="gap-1 flex-shrink-0"
                size="icon"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-[11px] text-text-secondary mt-2 text-center">
              المساعد يساعدك على الفهم والتعلم. راجع دائماً مع مدرسك في المنصة.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
