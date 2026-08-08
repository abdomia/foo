'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, MessageCircle, Send, Bot, ArrowDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

const faqData: Record<string, string> = {
  'ما هي منصة الرائد': 'منصة الرائد هي منصة تعليمية مصرية متخصصة في تعليم مادة الاحصاء لطلاب الصف الثالث الثانوي.',
  'كيف اشترك': 'يمكنك الاشتراك عبر صفحة الاشتراك باستخدام بطاقتك الائتمانية.',
  'سعر الاشتراك': 'تفضل بزيارة صفحة الاشتراك لمشاهدة الاسعار والعروض المتاحة.',
  'طرق الدفع': 'نقبل الدفع عبر بطاقات الائتمان والخصم Mastercard وVisa.',
  'مشاهدة مجانا': 'نعم! يمكنك создать حساب مجاناً ومشاهدة بعض الدروس المجانية.',
  'محتوى المنصة': 'نوفر فيديوهات تعليمية، تمارين تطبيقية، واختبارات شهرية.',
  'متابعة التقدم': 'لديك صفحة تقدم توضح نسبة اتمام الدروس والتمارين.',
  'المنصة للصف': 'نعم، المنصة مخصصة لطلاب الصف الثالث الثانوية العامة.',
  'حل تمارين': 'نعم، في قسم التمارين يمكنك حل تمارين متنوعة.',
  'شهادة': 'تحصل على شهادة عند اتمام كل وحدة تعليمية.',
};

const defaultResponses = [
  'عذراً، اسألني عن: سعر الاشتراك، كيفية الاشتراك، او محتوى المنصة!',
  'سلني عن: الاشتراك، الاسعار، او المحتوي!',
  'مرحباً! اسألني: "ما سعر الاشترك؟" او "كيف اشترك؟"',
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'مرحباً! 👋 اسمي الرائد وانا هنا لمساعدتك. اسألني!' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (userMessage: string): string => {
    const normalized = userMessage.toLowerCase();
    
    for (const [key, value] of Object.entries(faqData)) {
      if (normalized.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    if (normalized.includes('سعر') || normalized.includes('price')) {
      return 'زُر صفحة الاشتراك للمعلومات.';
    }
    
    if (normalized.includes('اشترك') || normalized.includes('subscribe')) {
      return 'زُر /subscribe للتسجيل!';
    }
    
    if (normalized.includes('محتوى') || normalized.includes('فيديو')) {
      return 'نوفر فيديوهات، تمارين، واختبارات.';
    }
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: getBotResponse(userMessage.content),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 800 + Math.random() * 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'ما سعر الاشتراك',
    'كيف اشترك',
    'محتوى المنصة',
  ];

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 left-4 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary shadow-lg hover:bg-primary/90"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 left-4 z-50 w-[350px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="shadow-2xl border-primary/20">
              <div className="flex items-center justify-between p-3 border-b bg-primary/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">مساعد الرائد</p>
                    <p className="text-xs text-muted-foreground">متاح</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="h-[300px] overflow-y-auto p-3 space-y-3">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-2.5 rounded-xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'bot' && <Bot className="w-4 h-4 inline-block ml-1 mb-0.5" />}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-muted p-3 rounded-xl flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-2 border-t space-y-2">
                <div className="flex gap-1 overflow-x-auto">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); setTimeout(handleSend, 100); }}
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-full whitespace-nowrap"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="سئل..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    disabled={isTyping}
                  />
                  <Button size="icon" onClick={handleSend} disabled={!input.trim() || isTyping}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}