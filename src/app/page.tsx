'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Brain,
  MessageCircle,
  Send,
  User,
  Bot,
  AlertCircle,
  Stethoscope,
  Hospital,
  Activity,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Shield
} from 'lucide-react';

type Stage = 'symptom' | 'department' | 'treatment' | 'guidance';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stage?: Stage;
}

const STAGES: Array<{
  id: Stage;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    id: 'symptom',
    title: '症状自查',
    description: '系统评估症状，识别危险信号',
    icon: Stethoscope,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'department',
    title: '科室推荐',
    description: '推荐科室和医院，提供就医准备',
    icon: Hospital,
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'treatment',
    title: '治疗相关',
    description: '治疗流程、检查要点、副作用应对',
    icon: Activity,
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 'guidance',
    title: '就医指导',
    description: '异地就诊、保险、临床试验等',
    icon: FileText,
    color: 'from-green-500 to-green-600'
  }
];

const WELCOME_MESSAGES: Record<Stage, string> = {
  symptom: `您好！我是您的肿瘤就医决策助手，全程陪伴您的就医过程。

## 📋 第一步：症状自查

请告诉我您的主要症状，我将帮助您：
• 🔍 系统性评估症状特征
• ⚠️ 识别紧急危险信号
• 📝 整理关键信息供就诊参考

请描述您的症状（部位、性质、持续时间等），例如："右侧乳房有一个不痛的肿块，发现约2周了..."`,

  department: `## 🏥 第二步：科室匹配

基于您刚才的症状描述，我将为您：
• 🎯 匹配合适的就诊科室
• 🏥 推荐权威医院（引用熊猫群专家信息库）
• 📋 列出就诊准备清单

⚠️ 提醒：仅提供决策辅助信息，不涉及具体诊疗方案。

您可以直接询问，或回复"推荐医院和科室"开始。`,

  treatment: `## 💊 第三步：治疗相关

根据指南提供以下信息供参考：
• 📝 术前检查清单和关键数据解读
• 🔄 标准治疗顺序（基于CSCO/NCCN指南）
• 💊 化疗副作用及应对措施
• 🎯 转移治疗重点

⚠️ 提醒：仅提供决策辅助信息，不涉及具体诊疗方案，具体治疗请咨询主治医生。

您想了解哪方面？例如："术前需要做哪些检查？"`,

  guidance: `## 📝 第四步：就医指导

为您的就医过程提供完整指导：
• 🗺️ 异地就医流程和医保报销
• 🛡️ 带病投保和保险相关
• 📄 转诊须知和材料准备
• 💰 经济压力应对
• 🔬 临床试验组信息
• 👥 陪诊服务介绍

⚠️ 提醒：以上信息仅供参考，不构成任何医疗或法律建议。

您想了解哪方面？例如："异地就医需要准备什么？"`
};
export default function Home() {
  const [currentStage, setCurrentStage] = useState<Stage>('symptom');
  const [completedStages, setCompletedStages] = useState<Stage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // 初始化欢迎消息
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGES[currentStage],
      timestamp: new Date(),
      stage: currentStage
    }]);
  }, [currentStage]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      stage: currentStage
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
          history: messages.map(m => ({ role: m.role, content: m.content })),
          stage: currentStage
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
        timestamp: new Date(),
        stage: currentStage
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
        timestamp: new Date(),
        stage: currentStage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleStageChange = (stage: Stage) => {
    if (stage === currentStage) return;
    
    // 标记当前环节为完成
    setCompletedStages(prev => {
      const newCompleted = [...prev];
      if (!newCompleted.includes(currentStage)) {
        newCompleted.push(currentStage);
      }
      return newCompleted;
    });
    
    setCurrentStage(stage);
    inputRef.current?.focus();
  };

  const handleNextStage = () => {
    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    if (currentIndex < STAGES.length - 1) {
      handleStageChange(STAGES[currentIndex + 1].id);
    }
  };

  const handlePrevStage = () => {
    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    if (currentIndex > 0) {
      handleStageChange(STAGES[currentIndex - 1].id);
    }
  };

  const currentStageInfo = STAGES.find(s => s.id === currentStage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-gray-800 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-lg">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  肿瘤就医决策助手
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  全程闭环 · 专业决策辅助
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              <Lock className="mr-1 h-3 w-3" />
              仅辅助决策，不替代诊疗
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-6xl">
        {/* Stage Navigation */}
        <div className="mb-4">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {STAGES.map((stage, index) => {
                  const isCompleted = completedStages.includes(stage.id);
                  const isCurrent = currentStage === stage.id;
                  const Icon = stage.icon;
                  
                  return (
                    <div key={stage.id} className="flex items-center flex-1">
                      <button
                        onClick={() => handleStageChange(stage.id)}
                        className={`flex items-center gap-3 flex-1 p-3 rounded-lg transition-all ${
                          isCurrent 
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-500 dark:border-blue-400'
                            : isCompleted
                            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400'
                            : 'bg-gray-50 dark:bg-slate-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isCurrent
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-xs font-semibold ${isCurrent ? 'text-blue-700 dark:text-blue-400' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {stage.title}
                          </div>
                          <div className={`text-[10px] ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {stage.description}
                          </div>
                        </div>
                      </button>
                      {index < STAGES.length - 1 && (
                        <div className="flex items-center justify-center px-1">
                          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg h-[calc(100vh-280px)] min-h-[500px]">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    <span>{currentStageInfo?.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {STAGES.findIndex(s => s.id === currentStage) + 1}/{STAGES.length}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handlePrevStage}
                      disabled={currentStage === 'symptom'}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      上一环节
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleNextStage}
                      disabled={currentStage === 'guidance'}
                      className="h-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      下一环节
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100%-70px)]">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
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
                        <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
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
                <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-slate-900">
                  <div className="flex gap-3">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`请描述${currentStageInfo?.title}相关内容...`}
                      className="flex-1 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      disabled={!input.trim() || isLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-sm font-semibold">环节说明</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {currentStageInfo && (
                      <>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${currentStageInfo.color} text-white`}>
                          <currentStageInfo.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {currentStageInfo.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {currentStageInfo.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                      📖 依据指南
                    </h4>
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[10px] w-full justify-start">
                        2024 CSCO指南
                      </Badge>
                      <Badge variant="outline" className="text-[10px] w-full justify-start">
                        2026 NCCN指南
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                      📌 完成进度
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                          style={{ width: `${((completedStages.length + (completedStages.includes(currentStage) ? 0 : 0.5)) / STAGES.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(((completedStages.length + (completedStages.includes(currentStage) ? 0 : 0.5)) / STAGES.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong className="block mb-1">重要声明：</strong>
                本助手仅提供就医决策辅助信息，所有内容仅供参考。具体诊疗方案请咨询专业医疗机构。
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
