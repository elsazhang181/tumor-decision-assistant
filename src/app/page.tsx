'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  MessageCircle, 
  Hospital, 
  BookOpen, 
  Send, 
  User, 
  Bot,
  Activity,
  Heart,
  Brain,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickActions = [
  {
    icon: Activity,
    title: '症状自查',
    description: '描述您的症状，获取初步评估',
    prompt: '我想进行症状自查，我的主要不适是：'
  },
  {
    icon: Hospital,
    title: '科室推荐',
    description: '根据症状推荐合适的就诊科室',
    prompt: '请根据我的情况推荐就诊科室：'
  },
  {
    icon: BookOpen,
    title: '肿瘤科普',
    description: '了解肿瘤相关医学知识',
    prompt: '请给我讲解一下关于肿瘤的基础知识'
  },
  {
    icon: Heart,
    title: '就医指导',
    description: '了解就医流程和注意事项',
    prompt: '请告诉我肿瘤患者就医的流程和注意事项'
  }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是肿瘤就医决策助手。\n\n我可以帮助您：\n• 🩺 症状评估与分诊建议\n• 🏥 科室和医院类型推荐\n• 📚 肿瘤知识科普\n• 📋 就医流程指导\n\n请描述您的情况，或点击下方快捷功能开始咨询。',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessage.id 
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，服务暂时不可用，请稍后再试。',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-lg">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  肿瘤就医决策助手
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  智能分诊 · 专业指导
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              在线
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              onClick={() => handleQuickAction(action.prompt)}
            >
              <CardContent className="p-4 text-center">
                <action.icon className="h-8 w-8 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{action.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Area */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              智能咨询对话
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gradient-to-br from-teal-500 to-blue-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-500 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="请描述您的症状或问题..."
                  className="flex-1 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>温馨提示：</strong>本助手提供的信息仅供参考，不能替代医生的诊断和治疗建议。如有紧急情况，请立即就医或拨打急救电话。
          </div>
        </div>
      </main>
    </div>
  );
}
