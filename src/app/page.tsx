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
  Shield,
  QrCode,
  X,
  ExternalLink,
  History,
  Trash2,
  Search
} from 'lucide-react';
import Image from 'next/image';
import hospitalsQRData from '@/lib/hospitals-qrcode.json';

// ============== 历史记录存储键名 ==============
const HISTORY_STORAGE_KEY = 'cancer-assistant-chat-history';
const HISTORY_EXPIRE_DAYS = 3;

// ============== 历史记录类型 ==============
interface ChatHistoryItem {
  id: string;
  content: string;
  timestamp: number;
  stage: Stage;
}

// ============== 历史记录工具函数 ==============
const getHistory = (): ChatHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!data) return [];
    const history: ChatHistoryItem[] = JSON.parse(data);
    // 过滤过期记录
    const now = Date.now();
    const expireTime = HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    return history.filter(item => now - item.timestamp < expireTime);
  } catch {
    return [];
  }
};

const saveHistory = (item: ChatHistoryItem): void => {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    // 去重：如果已有相同内容，删除旧的
    const filtered = history.filter(h => h.content !== item.content);
    // 添加到开头
    const newHistory = [item, ...filtered].slice(0, 50); // 最多保留50条
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  } catch {
    // 忽略存储错误
  }
};

const deleteHistoryItem = (id: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  } catch {
    // 忽略存储错误
  }
};

const clearAllHistory = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // 忽略存储错误
  }
};

// ============== 格式化时间 ==============
const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const day = 24 * 60 * 60 * 1000;
  
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < day) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  if (diff < 2 * day) return '昨天';
  return `${Math.floor(diff / day)}天前`;
};

// ============== 历史记录面板组件 ==============
interface HistoryPanelProps {
  onClose: () => void;
  onSelectHistory: (content: string) => void;
}

function HistoryPanel({ onClose, onSelectHistory }: HistoryPanelProps) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    setHistory(getHistory());
  }, []);
  
  const filteredHistory = searchTerm 
    ? history.filter(item => item.content.toLowerCase().includes(searchTerm.toLowerCase()))
    : history;
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    setHistory(getHistory());
  };
  
  const handleClearAll = () => {
    if (confirm('确定清空所有历史记录？')) {
      clearAllHistory();
      setHistory([]);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div 
        className="h-full w-full max-w-sm bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">历史记录</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索历史记录..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>
        
        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <History className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">{searchTerm ? '未找到相关记录' : '暂无历史记录'}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectHistory(item.content);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {item.content}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(item.timestamp)}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {history.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClearAll}
              className="w-full text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-colors"
            >
              清空所有记录
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              记录保留最近{HISTORY_EXPIRE_DAYS}天
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type Stage = 'symptom' | 'department' | 'treatment' | 'guidance';

// 医院二维码数据
const HOSPITALS_QR = hospitalsQRData;

// ============== 医院二维码弹窗组件 ==============
interface HospitalQRDialogProps {
  hospital: typeof HOSPITALS_QR.hospitals[0] | null;
  onClose: () => void;
}

function HospitalQRDialoDialog({ hospital, onClose }: HospitalQRDialogProps) {
  if (!hospital) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{hospital.name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative w-full aspect-square bg-gray-50 dark:bg-slate-700 rounded-xl overflow-hidden">
            <Image
              src={hospital.qrCode}
              alt={`${hospital.name}小程序/服务号二维码`}
              fill
              className="object-contain"
              sizes="(max-width: 448px) 100vw, 448px"
            />
          </div>
          <div className="text-center space-y-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
              {hospital.platform}
            </Badge>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              扫码获取官方服务
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {hospital.features.map((feature, idx) => (
                <span key={idx} className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-600 rounded-full text-gray-600 dark:text-gray-300">
                  {feature}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ExternalLink className="h-3 w-3" />
            <span>长按识别二维码，或截图保存后微信扫码</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== 医院推荐卡片组件 ==============
interface HospitalRecommendCardProps {
  hospitals: typeof HOSPITALS_QR.hospitals;
  onSelectHospital: (hospital: typeof HOSPITALS_QR.hospitals[0]) => void;
}

function HospitalRecommendCard({ hospitals, onSelectHospital }: HospitalRecommendCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (hospitals.length === 0) return null;
  
  return (
    <div className="mt-3 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
            可扫码获取官方服务（{hospitals.length}家医院）
          </span>
        </div>
        <ChevronRight className={`h-4 w-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      {isExpanded && (
        <div className="border-t border-blue-200 dark:border-blue-800 p-3 space-y-2">
          {hospitals.map((hospital, idx) => (
            <button
              key={idx}
              onClick={() => onSelectHospital(hospital)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-left"
            >
              <div className="relative w-12 h-12 bg-white rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                <Image
                  src={hospital.qrCode}
                  alt={hospital.name}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {hospital.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {hospital.platform} · {hospital.city}
                </p>
              </div>
              <div className="text-xs text-blue-500 flex-shrink-0">
                点击查看
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== 从消息中提取医院名称 ==============
function extractHospitalsFromMessage(message: string): typeof HOSPITALS_QR.hospitals {
  const matchedHospitals: typeof HOSPITALS_QR.hospitals = [];
  const normalizedMessage = message.replace(/\s/g, ''); // 移除空格
  
  for (const hospital of HOSPITALS_QR.hospitals) {
    // 匹配医院全称或简称
    if (normalizedMessage.includes(hospital.name.replace(/\s/g, '')) || 
        normalizedMessage.includes(hospital.shortName.replace(/\s/g, ''))) {
      // 避免重复添加
      if (!matchedHospitals.find(h => h.name === hospital.name)) {
        matchedHospitals.push(hospital);
      }
    }
    // 额外匹配变体名称
    const variants = [
      // 北京肿瘤医院相关
      { original: '北京大学肿瘤医院', variants: ['北大肿瘤', '北京肿瘤医院', '北肿', '肿瘤医院'] },
      // 协和相关
      { original: '北京协和医院', variants: ['协和医院', '协和'] },
      // 上海肿瘤相关
      { original: '上海复旦大学附属肿瘤医院', variants: ['上海肿瘤', '复旦肿瘤', '中肿'] },
      // 广州肿瘤相关
      { original: '广州中山大学附属肿瘤医院', variants: ['中山肿瘤', '中肿', '广州肿瘤'] },
      // 浙江肿瘤相关
      { original: '浙江省肿瘤医院', variants: ['浙江肿瘤', '省肿瘤'] },
      // 天津肿瘤相关
      { original: '天津医科大学肿瘤医院', variants: ['天津肿瘤', '天肿'] },
      // 湖南肿瘤相关
      { original: '湖南省肿瘤医院', variants: ['湖南肿瘤', '湘雅肿瘤'] },
      // 四川肿瘤相关
      { original: '四川省肿瘤医院', variants: ['四川肿瘤', '川肿'] },
      // 湖北肿瘤相关
      { original: '湖北省肿瘤医院', variants: ['湖北肿瘤', '鄂肿'] },
      // 江苏肿瘤相关
      { original: '江苏省肿瘤医院', variants: ['江苏肿瘤'] },
      // 辽宁肿瘤相关
      { original: '辽宁省肿瘤医院', variants: ['辽宁肿瘤', '辽肿'] },
      // 福建肿瘤相关
      { original: '福建省肿瘤医院', variants: ['福建肿瘤', '闽肿'] },
      // 江西肿瘤相关
      { original: '江西省肿瘤医院', variants: ['江西肿瘤', '赣肿'] },
      // 河南肿瘤相关
      { original: '河南省肿瘤医院', variants: ['河南肿瘤', '豫肿'] },
      // 云南肿瘤相关
      { original: '云南省肿瘤医院', variants: ['云南肿瘤', '滇肿'] },
      // 贵州肿瘤相关
      { original: '贵州省肿瘤医院', variants: ['贵州肿瘤', '黔肿'] },
      // 陕西肿瘤相关
      { original: '陕西省肿瘤医院', variants: ['陕西肿瘤', '陕肿'] },
      // 甘肃肿瘤相关
      { original: '甘肃省肿瘤医院', variants: ['甘肃肿瘤', '甘肿'] },
      // 吉林肿瘤相关
      { original: '吉林省肿瘤医院', variants: ['吉林肿瘤', '吉肿'] },
      // 山西肿瘤相关
      { original: '山西省肿瘤医院', variants: ['山西肿瘤', '晋肿'] },
      // 河北肿瘤相关
      { original: '河北省肿瘤医院', variants: ['河北肿瘤', '冀肿'] },
      // 重庆肿瘤相关
      { original: '重庆大学附属肿瘤医院', variants: ['重庆肿瘤', '渝肿'] },
      // 哈医大肿瘤相关
      { original: '哈尔滨医科大学附属肿瘤医院', variants: ['哈医大肿瘤', '哈肿'] },
      // 山东肿瘤相关
      { original: '山东省肿瘤医院', variants: ['山东肿瘤', '齐鲁肿瘤'] },
      // 301医院相关
      { original: '解放军总医院（301医院）', variants: ['301医院', '301', '解放军总医院'] },
    ];
    
    for (const group of variants) {
      if (hospital.name.includes(group.original) || hospital.shortName.includes(group.original)) {
        for (const variant of group.variants) {
          if (normalizedMessage.includes(variant.replace(/\s/g, ''))) {
            if (!matchedHospitals.find(h => h.name === hospital.name)) {
              matchedHospitals.push(hospital);
            }
            break;
          }
        }
        break;
      }
    }
  }
  
  return matchedHospitals;
}

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
  features: string[];
}> = [
  {
    id: 'symptom',
    title: '症状自查',
    description: '系统评估症状，识别危险信号',
    icon: Stethoscope,
    color: 'from-blue-500 to-blue-600',
    features: ['系统性评估症状特征', '识别紧急危险信号', '整理关键信息供就诊参考', '生成医患沟通提问清单']
  },
  {
    id: 'department',
    title: '科室推荐',
    description: '推荐科室和医院，提供就医准备',
    icon: Hospital,
    color: 'from-purple-500 to-purple-600',
    features: ['匹配合适的就诊科室', '推荐权威医院', '列出就诊准备清单', '生成医患沟通提问清单']
  },
  {
    id: 'treatment',
    title: '治疗相关',
    description: '治疗流程、检查要点、副作用应对',
    icon: Activity,
    color: 'from-orange-500 to-orange-600',
    features: ['术前检查清单和数据解读', '标准治疗顺序', '化疗副作用应对', '生成医患沟通提问清单']
  },
  {
    id: 'guidance',
    title: '就医指导',
    description: '异地就医、医保报销、转诊指导',
    icon: FileText,
    color: 'from-green-500 to-green-600',
    features: ['异地就医流程指导', '医保报销政策', '转诊须知和材料准备', '生成综合就医提问清单']
  }
];

const WELCOME_MESSAGES: Record<Stage, string> = {
  symptom: `您好！我是您的肿瘤就医决策助手，全程陪伴您的就医过程。

## 📋 第一步：症状自查

请告诉我您的主要症状，我将帮助您：
• 🔍 系统性评估症状特征
• ⚠️ 识别紧急危险信号
• 📝 整理关键信息供就诊参考
• 📋 **生成医患沟通提问清单**（帮您整理见医生时要问的问题）

请描述您的症状（部位、性质、持续时间等），例如："右侧乳房有一个不痛的肿块，发现约2周了..."`,

  department: `## 🏥 第二步：科室匹配

基于您刚才的症状描述，我将为您：
• 🎯 匹配合适的就诊科室
• 🏥 推荐权威医院（引用熊猫群专家信息库）
• 📋 列出就诊准备清单
• 📝 **生成医患沟通提问清单**（帮您问清楚诊断和检查安排）

⚠️ 提醒：仅提供决策辅助信息，不涉及具体诊疗方案。

您可以直接询问，或回复"推荐医院和科室"开始。`,

  treatment: `## 💊 第三步：治疗相关

请告诉我您想了解的治疗相关问题，我将帮助您：
• 📝 术前检查清单和关键数据解读
• 🔄 标准治疗顺序（基于2025 CSCO结直肠癌诊疗指南）
• 💊 化疗副作用及应对措施
• 📋 **生成医患沟通提问清单**

⚠️ 仅提供决策辅助信息，不涉及具体诊疗方案。

请描述您想了解的内容，例如："术前需要做哪些检查？"`,

  guidance: `## 📝 第四步：就医指导

请告诉我您想了解的就医相关问题，我将帮助您：
• 🗺️ 异地就医流程和医保报销
• 🛡️ 带病投保和保险相关
• 📄 转诊须知和材料准备
• 💰 经济压力应对
• 📋 **生成医患沟通提问清单**

⚠️ 以上信息仅供参考，不构成任何医疗或法律建议。

请描述您想了解的内容，例如："异地就医需要准备什么？"`,
};

// ============== 上下文类型定义 ==============
interface ConversationContext {
  // 症状自查环节收集的信息
  symptoms?: string;
  symptomAnalysis?: string;
  urgencyLevel?: string;
  
  // 科室匹配环节收集的信息
  suspectedCondition?: string;
  recommendedDepartments?: string[];
  recommendedHospitals?: string[];
  
  // 治疗相关环节收集的信息
  treatmentStage?: string;
  keyExaminations?: string[];
  
  // 就医指导环节收集的信息
  insuranceInfo?: string;
  guidanceNotes?: string[];
  
  // 对话摘要（跨环节传递的关键信息）
  summary?: string;
  previousStages: Record<Stage, string>; // 每个环节的关键结论
}

// ============== 提取上下文的函数 ==============
function extractContextFromMessages(
  messages: Message[], 
  fromStage: Stage,
  allPreviousContexts: Record<Stage, string>
): Partial<ConversationContext> {
  // 收集所有已完成环节的上下文
  const previousSummary = Object.entries(allPreviousContexts)
    .filter(([stage]) => {
      const stageOrder = ['symptom', 'department', 'treatment', 'guidance'];
      return stageOrder.indexOf(stage) < stageOrder.indexOf(fromStage);
    })
    .map(([stage, summary]) => `[${stage}] ${summary}`)
    .join('\n\n');
  
  // 收集当前环节的对话
  const currentStageMessages = messages.filter(m => m.stage === fromStage);
  
  if (currentStageMessages.length > 1) {
    // 提取用户问题
    const userMessages = currentStageMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);
    
    // 提取助手回答（排除欢迎消息）
    const assistantResponses = currentStageMessages
      .filter(m => m.role === 'assistant' && !m.content.includes('您好！我是您的'))
      .map(m => m.content);
    
    const currentSummary = userMessages.length > 0 
      ? `患者问题：${userMessages.join('；')}\n关键结论：${assistantResponses.slice(-1)[0]?.substring(0, 300) || '无'}`
      : '';
    
    return {
      summary: previousSummary 
        ? `${previousSummary}\n\n【当前环节】${currentSummary}`
        : currentSummary,
      previousStages: allPreviousContexts
    };
  }
  
  // 如果当前环节没有对话，返回之前的上下文
  return {
    summary: previousSummary,
    previousStages: allPreviousContexts
  };
}

// ============== 提取回答中的关键结论 ==============
function extractConclusion(answer: string): string {
  if (!answer) return '';
  
  // 如果内容是欢迎消息（包含模块标题），跳过
  if (answer.includes('第一步') || answer.includes('第二步') || 
      answer.includes('第三步') || answer.includes('第四步') ||
      answer.includes('## ')) {
    return '';
  }
  
  // 尝试提取【结论】或【结论】部分
  const conclusionMatch = answer.match(/【?结论】?\s*([^\n【]+)/);
  if (conclusionMatch) {
    return conclusionMatch[1].trim().substring(0, 80);
  }
  
  // 如果没有明确结论，提取前80字符作为摘要
  const firstPart = answer.substring(0, 80);
  return firstPart.replace(/\n/g, ' ').trim();
}

// ============== 生成环节欢迎消息 ==============
function generateWelcomeMessage(targetStage: Stage): string {
  return WELCOME_MESSAGES[targetStage];
}

export default function Home() {
  const [currentStage, setCurrentStage] = useState<Stage>('symptom');
  const [completedStages, setCompletedStages] = useState<Stage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stageConclusions, setStageConclusions] = useState<Record<Stage, string>>({
    symptom: '',
    department: '',
    treatment: '',
    guidance: ''
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 二维码弹窗状态
  const [selectedHospital, setSelectedHospital] = useState<typeof HOSPITALS_QR.hospitals[0] | null>(null);
  
  // 历史记录面板状态
  const [showHistory, setShowHistory] = useState(false);
  
  // 当前消息中的医院列表（用于显示推荐卡片）
  const [messageHospitals, setMessageHospitals] = useState<typeof HOSPITALS_QR.hospitals>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [stageMessages, setStageMessages] = useState<Record<Stage, Message[]>>({
    symptom: [],
    department: [],
    treatment: [],
    guidance: []
  });

  // 使用 ref 跟踪初始化状态
  const initializedRef = useRef<Record<Stage, boolean>>({
    symptom: false,
    department: false,
    treatment: false,
    guidance: false
  });

  // 初始化当前环节的消息
  useEffect(() => {
    // 避免重复初始化
    if (initializedRef.current[currentStage]) {
      return;
    }
    initializedRef.current[currentStage] = true;
    
    const history = stageMessages[currentStage];
    
    if (history.length > 0) {
      // 有历史消息，加载历史
      setMessages(history);
    } else {
      // 无历史消息，显示空界面（让用户直接输入）
      setMessages([]);
    }
  }, [currentStage]); // 只依赖 currentStage

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      stage: currentStage
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // 构建历史消息（包含所有之前环节的消息）
    const historyMessages = messages.map(m => ({ role: m.role, content: m.content }));

    // 构建完整上下文（包含所有已完成环节的结论）
    const fullContext = {
      previousStages: stageConclusions,
      summary: Object.entries(stageConclusions)
        .filter(([_, v]) => v)
        .map(([stage, conclusion]) => `[${stage}] ${conclusion}`)
        .join('\n\n')
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content.trim(),
          history: historyMessages,
          stage: currentStage,
          context: fullContext
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
      
      // 注意：关键结论会在环节切换时自动携带到下一个环节
      // 不再在此处自动保存，避免覆盖对话内容
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
      // 保存当前环节的消息到历史
      if (messages.length > 0) {
        setStageMessages(prev => ({
          ...prev,
          [currentStage]: messages
        }));
      }
      // 保存用户提问到历史记录
      const historyItem: ChatHistoryItem = {
        id: userMessage.id,
        content: userMessage.content,
        timestamp: Date.now(),
        stage: currentStage
      };
      saveHistory(historyItem);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleStageChange = (stage: Stage) => {
    if (stage === currentStage) return;
    
    // 先保存当前环节的消息和结论
    setStageMessages(prev => ({
      ...prev,
      [currentStage]: messages
    }));
    
    // 从当前环节的对话中提取结论保存
    const assistantResponses = messages
      .filter(m => m.role === 'assistant' && !m.content.includes('您好！我是您的'))
      .map(m => m.content);
    
    if (assistantResponses.length > 0) {
      const conclusion = extractConclusion(assistantResponses[assistantResponses.length - 1]);
      if (conclusion) {
        setStageConclusions(prev => ({
          ...prev,
          [currentStage]: conclusion
        }));
      }
    }
    
    // 标记当前环节为完成
    setCompletedStages(prev => {
      const newCompleted = [...prev];
      if (!newCompleted.includes(currentStage)) {
        newCompleted.push(currentStage);
      }
      return newCompleted;
    });
    
    // 切换到新环节
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
                  知识库检索 · 医患沟通 · 全程决策辅助
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                <Shield className="mr-1 h-3 w-3" />
                仅辅助决策，不替代诊疗
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                onClick={() => setShowHistory(true)}
                title="历史记录"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 md:px-4 py-2 md:py-4 max-w-6xl">
        {/* Stage Navigation - Mobile Optimized */}
        <div className="mb-2 md:mb-4">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
            <CardContent className="p-2 md:p-4">
              {/* Desktop: horizontal layout */}
              <div className="hidden md:flex items-center justify-between">
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
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
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
              
              {/* Mobile: vertical stacked layout with description */}
              <div className="md:hidden">
                {/* Stage grid - 2x2 layout with icon+title+description */}
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((stage, index) => {
                    const isCompleted = completedStages.includes(stage.id);
                    const isCurrent = currentStage === stage.id;
                    const Icon = stage.icon;
                    
                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                          isCurrent 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg'
                            : isCompleted
                            ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
                            : 'bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600'
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                          isCurrent
                            ? 'bg-white/20'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className={`text-sm font-semibold text-center ${isCurrent ? 'text-white' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {stage.title}
                        </div>
                        <div className={`text-[10px] text-center mt-1 line-clamp-2 ${isCurrent ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                          {stage.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area - Mobile Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 md:gap-4">
          <div className="lg:col-span-3">
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-80px)]">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 py-2 md:py-3 px-3 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-sm md:text-base">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                    <span className="text-sm md:text-base">{currentStageInfo?.title}</span>
                    <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                      {STAGES.findIndex(s => s.id === currentStage) + 1}/{STAGES.length}
                    </Badge>
                  </div>
                  <div className="flex gap-1 md:gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handlePrevStage}
                      disabled={currentStage === 'symptom'}
                      className="h-7 md:h-8 px-1 md:px-2 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                      <span className="hidden md:inline">上一环节</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleNextStage}
                      disabled={currentStage === 'guidance'}
                      className="h-7 md:h-8 px-1 md:px-2 text-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      <span className="hidden md:inline">下一环节</span>
                      <ChevronRight className="h-3 w-3 md:h-4 md:w-4 md:ml-1" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-2 md:p-4" ref={scrollRef}>
                    <div className="space-y-3 md:space-y-4">
                    {messages.map((message) => {
                      const hospitals = message.role === 'assistant' ? extractHospitalsFromMessage(message.content) : [];
                      return (
                        <div key={message.id}>
                          <div
                            className={`flex gap-2 md:gap-3 ${
                              message.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full ${
                                message.role === 'user'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gradient-to-br from-teal-500 to-blue-500 text-white'
                              }`}
                            >
                              {message.role === 'user' ? (
                                <User className="h-4 w-4 md:h-5 md:w-5" />
                              ) : (
                                <Bot className="h-4 w-4 md:h-5 md:w-5" />
                              )}
                            </div>
                            <div
                              className={`max-w-[88%] md:max-w-[85%] rounded-xl px-3 py-2 md:px-4 md:py-3 ${
                                message.role === 'user'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed prose prose-xs dark:prose-invert max-w-none">
                                {message.content}
                              </div>
                            </div>
                          </div>
                          {/* 医院推荐卡片 - 仅在Bot回复且包含医院时显示 */}
                          {hospitals.length > 0 && (
                            <HospitalRecommendCard 
                              hospitals={hospitals} 
                              onSelectHospital={setSelectedHospital} 
                            />
                          )}
                        </div>
                      );
                    })}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex gap-2 md:gap-3">
                        <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-500 text-white">
                          <Bot className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-3 py-2 md:px-4 md:py-3">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
	
                {/* Input Area - Mobile optimized */}
                <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-2 md:p-3 bg-gray-50 dark:bg-slate-900 flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="输入您的问题..."
                      disabled={isLoading}
                      className="flex-1 text-sm md:text-base"
                    />
                    <Button 
                      type="submit" 
                      disabled={!input.trim() || isLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Help info below chat */}
          <div className="lg:hidden space-y-3">
            {/* 本环节可帮助您 */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {currentStageInfo && (
                    <>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${currentStageInfo.color} text-white`}>
                        <currentStageInfo.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {currentStageInfo.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {currentStageInfo.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <ul className="space-y-1">
                    {currentStageInfo?.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 免责声明 */}
            <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <strong className="block mb-0.5 text-gray-700 dark:text-gray-300">就医决策辅助声明</strong>
                    本助手不提供疾病诊断、治疗方案制定、药品处方或医疗决策替代，所有回答仅供参考，不能替代专业医生的面诊判断。
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1 space-y-3">
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 py-3">
                <CardTitle className="text-sm font-semibold">本环节可帮助您</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* 模块图标和描述 */}
                <div className="flex items-center gap-3">
                  {currentStageInfo && (
                    <>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${currentStageInfo.color} text-white`}>
                        <currentStageInfo.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {currentStageInfo.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {currentStageInfo.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* 功能列表 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <ul className="space-y-1.5">
                    {currentStageInfo?.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* 依据指南 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      📖 2025 CSCO结直肠癌诊疗指南
                    </Badge>
                  </div>
                </div>

                {/* 完成进度 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">完成进度</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {completedStages.length}/{STAGES.length}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${(completedStages.length / STAGES.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 免责声明 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-start gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5">就医决策辅助声明</strong>
                      本助手不提供疾病诊断、治疗方案制定、药品处方或医疗决策替代，所有回答仅供参考，不能替代专业医生的面诊判断。
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 医院二维码弹窗 */}
      <HospitalQRDialoDialog 
        hospital={selectedHospital} 
        onClose={() => setSelectedHospital(null)} 
      />

      {/* 历史记录面板 */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onSelectHistory={(content) => {
            setInput(content);
            setShowHistory(false);
          }}
        />
      )}
    </div>
  );
}
