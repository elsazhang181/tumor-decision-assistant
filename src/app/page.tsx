'use client';

import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { toast, Toaster } from 'sonner';
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
  Users,
  UserPlus,
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
  Search,
  Paperclip,
  File,
  FileSpreadsheet,
  Image as ImageIcon,
  Copy,
  Download
} from 'lucide-react';
import Image from 'next/image';
import hospitalsQRData from '@/lib/hospitals-qrcode.json';

// ============== 对话模式类型 ==============
type ChatMode = 'instant' | 'patient' | 'multi-patient';

// 患者会话数据
interface PatientSession {
  id: string;                    // 患者唯一标识
  name: string;                  // 患者姓名
  stage: string;                 // 疾病阶段（如 T1N1cM0）
  conversationId: string | null; // Coze 会话ID
  lastActive: number;            // 最后活跃时间
  messageCount: number;          // 消息数量
}

// 患者会话存储键名
const PATIENT_SESSIONS_KEY = 'health-assistant-patient-sessions';
const CURRENT_MODE_KEY = 'health-assistant-current-mode';
const CURRENT_PATIENT_KEY = 'health-assistant-current-patient';

// 获取所有患者会话
const getPatientSessions = (): PatientSession[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PATIENT_SESSIONS_KEY);
    if (!data) return [];
    return JSON.parse(data) as PatientSession[];
  } catch {
    return [];
  }
};

// 保存患者会话列表
const savePatientSessions = (sessions: PatientSession[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PATIENT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // 忽略存储错误
  }
};

// 创建新患者会话
const createPatientSession = (name: string, stage: string): PatientSession => {
  const session: PatientSession = {
    id: `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    stage,
    conversationId: null,
    lastActive: Date.now(),
    messageCount: 0,
  };
  const sessions = getPatientSessions();
  sessions.unshift(session);
  savePatientSessions(sessions);
  return session;
};

// 更新患者会话的 conversation_id
const updatePatientConversationId = (patientId: string, conversationId: string): void => {
  const sessions = getPatientSessions();
  const index = sessions.findIndex(s => s.id === patientId);
  if (index !== -1) {
    sessions[index].conversationId = conversationId;
    sessions[index].lastActive = Date.now();
    savePatientSessions(sessions);
  }
};

// 更新患者会话的消息计数
const updatePatientMessageCount = (patientId: string): void => {
  const sessions = getPatientSessions();
  const index = sessions.findIndex(s => s.id === patientId);
  if (index !== -1) {
    sessions[index].messageCount += 1;
    sessions[index].lastActive = Date.now();
    savePatientSessions(sessions);
  }
};

// 删除患者会话
const deletePatientSession = (patientId: string): void => {
  const sessions = getPatientSessions().filter(s => s.id !== patientId);
  savePatientSessions(sessions);
};

// 获取当前模式
const getCurrentMode = (): ChatMode => {
  if (typeof window === 'undefined') return 'instant';
  try {
    const mode = localStorage.getItem(CURRENT_MODE_KEY);
    if (mode === 'instant' || mode === 'patient' || mode === 'multi-patient') {
      return mode;
    }
    return 'instant';
  } catch {
    return 'instant';
  }
};

// 保存当前模式
const saveCurrentMode = (mode: ChatMode): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_MODE_KEY, mode);
  } catch {
    // 忽略存储错误
  }
};

// 获取当前选中的患者ID
const getCurrentPatientId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CURRENT_PATIENT_KEY);
  } catch {
    return null;
  }
};

// 保存当前选中的患者ID
const saveCurrentPatientId = (patientId: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (patientId) {
      localStorage.setItem(CURRENT_PATIENT_KEY, patientId);
    } else {
      localStorage.removeItem(CURRENT_PATIENT_KEY);
    }
  } catch {
    // 忽略存储错误
  }
};

// ============== 历史记录存储键名 ==============
const HISTORY_STORAGE_KEY = 'cancer-assistant-chat-history';
const HISTORY_EXPIRE_DAYS = 3;

// ============== 历史记录类型 ==============
interface ChatHistoryItem {
  id: string;
  content: string;  // 完整的消息内容（包含文件信息）
  userQuestion: string;  // 用户输入框中的问题
  fileNames: string[];  // 关联的文件名列表
  timestamp: number;
  stage: Stage;
}

// ============== 历史记录工具函数 ==============
const STAGE_MESSAGES_KEY = 'cancer-assistant-stage-messages';

const getStageMessages = (): Record<Stage, Message[]> => {
  if (typeof window === 'undefined') return { symptom: [], department: [], treatment: [], guidance: [] };
  try {
    const data = localStorage.getItem(STAGE_MESSAGES_KEY);
    if (!data) return { symptom: [], department: [], treatment: [], guidance: [] };
    const messages = JSON.parse(data) as Record<Stage, Message[]>;
    // 恢复 timestamp
    Object.keys(messages).forEach(stage => {
      messages[stage as Stage] = messages[stage as Stage].map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    });
    return messages;
  } catch {
    return { symptom: [], department: [], treatment: [], guidance: [] };
  }
};

const saveStageMessages = (messages: Record<Stage, Message[]>): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STAGE_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // 忽略存储错误
  }
};

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
    // 去重：如果已有相同问题，删除旧的
    const filtered = history.filter(h => h.userQuestion !== item.userQuestion);
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
  history: ChatHistoryItem[];
  onClose: () => void;
  onSelectHistory: (userQuestion: string, fileNames: string[]) => void;
  onRefresh: () => void;
}

function HistoryPanel({ history, onClose, onSelectHistory, onRefresh }: HistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredHistory = searchTerm 
    ? history.filter(item => 
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fileNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.userQuestion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : history;
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    onRefresh(); // 刷新历史记录列表
  };
  
  const handleClearAll = () => {
    if (confirm('确定清空所有历史记录？')) {
      clearAllHistory();
      onRefresh(); // 刷新历史记录列表
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
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectHistory(item.userQuestion, item.fileNames);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {/* 显示文件信息 */}
                      {item.fileNames && item.fileNames.length > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                          <Paperclip className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-blue-600 dark:text-blue-400 truncate">
                            {item.fileNames.join(', ')}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {item.userQuestion || '请根据上传的文件内容回答相关问题'}
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
                </div>
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
// 二维码图片组件 - 带有加载失败回退
function QRImageWithFallback({ src, alt }: {
  src: string;
  alt: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
        <QrCode className="h-5 w-5 mb-0.5" />
        <span className="text-[8px] leading-tight">点击查看</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain"
      onError={() => setImgError(true)}
    />
  );
}

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
            <QRImageWithFallback
              src={hospital.qrCode}
              alt={`${hospital.name}小程序/服务号二维码`}
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
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开，让用户第一时间看到
  
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
            {hospitals.length === 1 
              ? `${hospitals[0].name} - 扫码预约挂号` 
              : `可扫码预约挂号（${hospitals.length}家医院）`
            }
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
              <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden shadow-sm flex-shrink-0 border border-gray-100 flex items-center justify-center">
                <QRImageWithFallback
                  src={hospital.qrCode}
                  alt={hospital.name}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {hospital.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {hospital.platform} · {hospital.city}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  点击查看大图，长按扫码
                </p>
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
  const matchedKeys = new Set<string>();
  
  // 遍历所有医院，匹配全称、简称和常见别名
  for (const hospital of HOSPITALS_QR.hospitals) {
    // 同一医院可有多个二维码（如预约挂号+线上问诊），按 name+qrCode 去重
    const dedupKey = hospital.name + '|' + hospital.qrCode;
    if (matchedKeys.has(dedupKey)) continue;
    
    // 生成匹配关键词：全称、简称、去"省/市/大学"等简称
    const patterns = [
      hospital.name,
      hospital.shortName,
    ];
    
    // 为肿瘤医院自动生成省名简称（如"江苏肿瘤"）
    if (hospital.name.includes('肿瘤医院')) {
      const provinceShort = hospital.name.replace(/省|市|自治区|维吾尔|壮族|回族|特别行政区/g, '').replace('医科大学附属', '').replace('大学附属', '').replace('医科大学', '').replace('医学院附属', '');
      patterns.push(provinceShort);
    }
    
    // 检查是否匹配
    for (const pattern of patterns) {
      const normalizedPattern = pattern.replace(/\s/g, '');
      if (normalizedPattern && normalizedMessage.includes(normalizedPattern)) {
        matchedHospitals.push(hospital);
        matchedKeys.add(dedupKey);
        break;
      }
    }
  }
  
  return matchedHospitals;
}

interface SourceItem {
  index: number;
  title: string;
  url: string;
  snippet?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stage?: Stage;
  sources?: SourceItem[];
  isThinking?: boolean; // 是否正在深度思考
}

// ============== 渲染带链接的内容 ==============
const renderContentWithSources = (content: string, sources: SourceItem[] = []) => {
  // 创建编号到URL的映射
  const sourceMap = new Map<number, SourceItem>();
  if (sources && sources.length > 0) {
    sources.forEach(s => sourceMap.set(s.index, s));
  }
  
  if (!content) return content;

  // === 步骤0: 从回复文本中提取 [N]URL 格式的引用，构建本地sourceMap并删除原始URL行 ===
  let extractedContent = content;
  
  // 0a. 处理 [N](url) Markdown链接格式 → 提取到sourceMap，替换为 [N]
  extractedContent = extractedContent.replace(
    /\[(\d+)\]\((https?:\/\/[^\s\)]+)\)/g,
    (match, numStr, url) => {
      const idx = parseInt(numStr, 10);
      if (!sourceMap.has(idx)) {
        sourceMap.set(idx, { index: idx, url, title: `来源${idx}`, snippet: '' });
      }
      return `[${numStr}]`;
    }
  );
  
  // 0b. 处理 [N]https://... 格式 → 提取URL到sourceMap，删除整行
  // 匹配行首的 [N]https://... （URL可能跟其他文字在同一行，只删除URL部分）
  extractedContent = extractedContent.replace(
    /\[(\d+)\]\s*(https?:\/\/[^\s\n\]]+)/g,
    (match, numStr, url) => {
      const idx = parseInt(numStr, 10);
      if (!sourceMap.has(idx)) {
        sourceMap.set(idx, { index: idx, url, title: `来源${idx}`, snippet: '' });
      }
      return `[${numStr}]`;
    }
  );
  
  // 0c. 删除仅含 [N]URL 的空行（底部参考文献列表）
  extractedContent = extractedContent.replace(
    /\n\s*\[\d+\]\s*https?:\/\/[^\n]*/g,
    ''
  );
  // 也处理行首的情况
  extractedContent = extractedContent.replace(
    /^\s*\[\d+\]\s*https?:\/\/[^\n]*\n?/gm,
    ''
  );
  
  // 0d. 清理多余空行
  extractedContent = extractedContent.replace(/\n{3,}/g, '\n\n').trim();
  
  // 过滤掉回复内容中的【信息来源】和【重要提示】段落（保留底部声明列表）
  // 逐条过滤，避免误删重要内容
  let filteredContent = extractedContent;

  // 1. 过滤 【信息来源声明】 段落标题及后续列表（保留标题后的单个链接行，删除多行列表）
  // 负向前瞻包含所有合法段落标题，避免误删其他段落内容
  const sectionTitlePattern = '【结论】|【通俗解释】|【关键决策点】|【依据】|【医患沟通建议清单】|【医患沟通提问清单】|【重点关注事项】|【记录要点】|【重要提示】|【信息来源声明】|---';
  filteredContent = filteredContent
    // 删除独立的 [信息来源声明] 整行及后续连续的非标题行
    .replace(new RegExp(`(?:^|\\n)\\[信息来源声明\\][^\\n]*(?:\\n(?!\\s*(?:${sectionTitlePattern}]))[^\\n]*)*`, 'gi'), '');

  // 2. 过滤 【信息来源】 段落
  filteredContent = filteredContent
    .replace(new RegExp(`(?:^|\\n)(?:●【信息来源】|【信息来源】|●【来源】|【来源】)[^\\n]*(?:\\n(?!\\s*(?:${sectionTitlePattern}]))[^\\n]*)*`, 'gi'), '');

  // 3. 过滤 【来源：xxx】 格式（单行）
  filteredContent = filteredContent
    .replace(/(?:^|\n)\s*【来源[：:][^\n】]*】?\s*/gi, '');

  // 4. 过滤 **⚠️ 重要提示** 或 【重要提示】 段落（整段删除）
  filteredContent = filteredContent
    .replace(new RegExp(`(?:^|\\n)(?:\\*\\*)?[⚠️]*\\s*重要提示[^\\n]*(?:\\n(?!\\s*(?:${sectionTitlePattern}]))[^\\n]*)*`, 'gi'), '');

  // 5. 清理多余的空行和分隔符
  filteredContent = filteredContent
    // 删除连续的多余分隔符
    .replace(/\n-{3,}\n*/g, '\n')
    // 删除孤立的单行分隔符（前后没有内容的）
    .replace(/(?:^|\n)-{3,}(?:\n|$)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 6. 医患沟通建议清单/提问清单和记录要点中的数字标注不转链接
  // 将这些区域中的 [1][2][3] 等格式替换为纯文本（不带链接）
  filteredContent = filteredContent.replace(
    /(\[医患沟通(?:建议清单|提问清单)\][\s\S]*?)(\[1\]\s|\[2\]\s|\[3\]\s|\[4\]\s|\[5\]\s|\[6\]\s|\[7\]\s|\[8\]\s|\[9\]\s|\[10\]\s)/g,
    (match, prefix, numItem) => {
      // 保留纯文本数字标注，不转链接
      return prefix + numItem;
    }
  );
  // 额外处理：确保医患沟通建议清单/提问清单和记录要点中的方括号数字不转链接
  filteredContent = filteredContent.replace(
    /(\[记录要点\][\s\S]*?)(?<!\]\s)(\[1\]\s|\[2\]\s|\[3\]\s|\[4\]\s|\[5\]\s|\[6\]\s|\[7\]\s|\[8\]\s|\[9\]\s|\[10\]\s)/g,
    (match, prefix, numItem) => {
      return prefix + numItem;
    }
  );
  
  // 定义解析数字索引的函数
  const getIndexFromNum = (num: string): number => {
    const indexMap: { [key: string]: number } = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };
    
    // Unicode带圈数字 ①-⑳ (U+2460 起)
    if (num.length === 1) {
      const charCode = num.charCodeAt(0);
      // ①-⑩ (U+2460-U+2469)
      if (charCode >= 0x2460 && charCode <= 0x2469) {
        return charCode - 0x2460 + 1;
      }
      // ⑪-⑳ (U+2470-U+2473)
      if (charCode >= 0x2470 && charCode <= 0x2473) {
        return charCode - 0x2470 + 11;
      }
    }
    // 阿拉伯数字
    if (/^\d+$/.test(num)) {
      return parseInt(num);
    }
    // 中文数字
    return indexMap[num] || 0;
  };
  
  // 转换为链接的函数 - 确保链接可以直接点击打开原文
  const makeLink = (num: string, index: number): string => {
    if (index && sourceMap.has(index)) {
      const source = sourceMap.get(index)!;
      const linkUrl = source.url;
      // 直接使用超链接标签，点击数字即可打开原文
      return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-colors cursor-pointer">[${num}]</a>`;
    }
    return `[${num}]`;
  };
  
  // 匹配各种编号格式 - 只在【依据】段中将[N]转为链接，其他段保持纯文本
  
  // 按【依据】分割内容，链接转换仅在【依据】段中生效
  const evidenceMatch = filteredContent.match(/【依据】/);
  let contentBeforeEvidence = '';
  let contentFromEvidence = filteredContent;
  if (evidenceMatch && evidenceMatch.index !== undefined) {
    contentBeforeEvidence = filteredContent.substring(0, evidenceMatch.index);
    contentFromEvidence = filteredContent.substring(evidenceMatch.index);
  }
  
  // 在【依据】之前的部分：将[N]转为纯文本数字，避免显示为链接
  contentBeforeEvidence = contentBeforeEvidence
    .replace(/\[([1-9]|10)\]/g, '($1)')  // [1] → (1) 纯文本编号
    .replace(/【([1-9]|10)】/g, '($1)');  // 【1】 → (1) 纯文本编号
  
  // 只对【依据】及其后续内容做链接转换
  let evidenceContent = contentFromEvidence;

  // 0. 先处理 emoji 数字格式 1️⃣ 2️⃣ 3️⃣ 等（仅在依据段）
  evidenceContent = evidenceContent.replace(
    /[\u0031-\u0039]\uFE0F\u20E3/g,
    (match) => {
      const num = match.replace(/\uFE0F|\u20E3/g, '');
      const index = parseInt(num, 10);
      return makeLink(num, index);
    }
  );
  
  // 1. 处理全角方括号【1】【2】【3】或【①】【②】【③】（仅在依据段）
  evidenceContent = evidenceContent.replace(
    /【([1-9]|10|[一二三四五六七八九十①-⑨]|[\u2460-\u2469]|[\u2470-\u2473])】/g, 
    (match, num) => {
      const index = getIndexFromNum(num);
      return makeLink(num, index);
    }
  );
  
  // 2. 处理半角方括号[1][2][3]或[①][②][③]或[一][二][三]（仅在依据段）
  evidenceContent = evidenceContent.replace(
    /\[([1-9]|10|[一二三四五六七八九十]|[\u2460-\u2469]|[\u2470-\u2473])\]/g, 
    (match, num) => {
      const index = getIndexFromNum(num);
      return makeLink(num, index);
    }
  );
  
  // 3. 处理不带括号的点号数字：1. 2. 3.（仅替换sourceMap中存在的序号，避免误改普通列表）
  evidenceContent = evidenceContent.replace(
    /(\d+)\.\s/g,
    (match, num) => {
      const index = getIndexFromNum(num);
      if (!sourceMap.has(index)) return match; // 普通列表项，不替换
      return makeLink(num, index) + ' ';
    }
  );
  
  // 4. 处理不带括号也不带点的纯数字：1、2、3（中文顿号分隔，仅替换sourceMap中存在的序号）
  evidenceContent = evidenceContent.replace(
    /(\d+)、\s/g,
    (match, num) => {
      const index = getIndexFromNum(num);
      if (!sourceMap.has(index)) return match;
      return makeLink(num, index) + ' ';
    }
  );
  
  // 5. 处理不带括号的纯数字（前后有空格或换行）：① ② ③
  evidenceContent = evidenceContent.replace(
    /([\u2460-\u2469]|[\u2470-\u2473])\s+/g,
    (match, num) => {
      const index = getIndexFromNum(num);
      return makeLink(num, index) + ' ';
    }
  );
  
  // 6. 处理括号中的纯数字 (1) (2) (3)（仅在依据段）
  evidenceContent = evidenceContent.replace(
    /\((\d+)\)/g,
    (match, num) => {
      const index = getIndexFromNum(num);
      const linkUrl = sourceMap.has(index) ? sourceMap.get(index)!.url : '#';
      return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-colors cursor-pointer">(${num})</a>`;
    }
  );
  
  // 合并【依据】前后的内容
  let processedContent = contentBeforeEvidence + evidenceContent;
  
  // 7. 【段落标题】保持原格式，不做样式化渲染

  // 8. 渲染【需医生确认】为醒目标签
  processedContent = processedContent.replace(
    /【需医生确认】/g,
    '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">⚠️ 需医生确认</span>'
  );

  // 9. 渲染可信度徽章为带样式的标签
  processedContent = processedContent.replace(
    /🏛️\s*\[政府官网\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">🏛️ 政府官网</span>'
  );
  processedContent = processedContent.replace(
    /🏥\s*\[医院指南\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">🏥 医院指南</span>'
  );
  processedContent = processedContent.replace(
    /📰\s*\[行业媒体\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">📰 行业媒体</span>'
  );
  processedContent = processedContent.replace(
    /⚠️\s*\[待验证\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">⚠️ 待验证</span>'
  );

  // 10. 渲染时效性标签
  processedContent = processedContent.replace(
    /\[时效性：高\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">时效性：高</span>'
  );
  processedContent = processedContent.replace(
    /\[时效性：中\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">时效性：中</span>'
  );
  processedContent = processedContent.replace(
    /\[时效性：低\]/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">时效性：低</span>'
  );
  // 兼容其他时效性描述
  processedContent = processedContent.replace(
    /\[时效性：([^\]]+)\]/g,
    (match, desc) => {
      // 如果已经处理过的就跳过
      if (desc === '高' || desc === '中' || desc === '低') return match;
      return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">时效性：${desc}</span>`;
    }
  );

  // 11. 将 Markdown 转换为 HTML（标题、粗体、列表等）
  try {
    const htmlContent = marked.parse(processedContent) as string;
    return htmlContent;
  } catch {
    // 如果 Markdown 解析失败，返回原始内容
    return processedContent;
  }
};

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
    description: '状况评估，信号识别',
    icon: Stethoscope,
    color: 'from-blue-500 to-blue-600',
    features: ['系统性评估症状特征', '识别紧急危险信号', '整理关键信息供就诊参考', '生成医患沟通提问清单']
  },
  {
    id: 'department',
    title: '科室推荐',
    description: '对症匹配，就近择优',
    icon: Hospital,
    color: 'from-purple-500 to-purple-600',
    features: ['匹配合适的就诊科室', '推荐权威医院', '列出就诊准备清单', '生成医患沟通提问清单']
  },
  {
    id: 'treatment',
    title: '治疗相关',
    description: '问诊检查，医患沟通',
    icon: Activity,
    color: 'from-orange-500 to-orange-600',
    features: ['术前检查清单和数据解读', '标准治疗顺序', '化疗副作用应对', '生成医患沟通提问清单']
  },
  {
    id: 'guidance',
    title: '就医指导',
    description: '异地医保，转诊保险',
    icon: FileText,
    color: 'from-green-500 to-green-600',
    features: ['异地就医流程指导', '医保报销政策', '转诊须知和材料准备', '生成综合就医提问清单']
  }
];

const WELCOME_MESSAGES: Record<Stage, string> = {
  symptom: `您好！我是您的健康就医决策助手，全程陪伴您的就医过程。

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
  
  // 尝试提取【结论】部分
  const summaryMatch = answer.match(/【结论】\s*([^\n【]+)/);
  if (summaryMatch) {
    return summaryMatch[1].trim().substring(0, 80);
  }
  
  // 如果没有明确摘要，提取前80字符作为摘要
  const firstPart = answer.substring(0, 80);
  return firstPart.replace(/\n/g, ' ').trim();
}

// ============== 生成环节欢迎消息 ==============
function generateWelcomeMessage(targetStage: Stage): string {
  return WELCOME_MESSAGES[targetStage];
}

export default function Home() {
  // ============== 对话模式状态 ==============
  const [chatMode, setChatMode] = useState<ChatMode>('instant');
  const [patientSessions, setPatientSessions] = useState<PatientSession[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [showPatientSidebar, setShowPatientSidebar] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientStage, setNewPatientStage] = useState('');

  const [currentStage, setCurrentStage] = useState<Stage>('symptom');
  const [completedStages, setCompletedStages] = useState<Stage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false); // 移动端键盘状态
  const [stageConclusions, setStageConclusions] = useState<Record<Stage, string>>({
    symptom: '',
    department: '',
    treatment: '',
    guidance: ''
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const assistantContentRef = useRef<string>('');
  const reasoningContentRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false); // 跟踪是否有消息正在发送，保护消息不被初始化清空
  
  // 二维码弹窗状态
  const [selectedHospital, setSelectedHospital] = useState<typeof HOSPITALS_QR.hospitals[0] | null>(null);
  
  // 历史记录面板状态
  const [showHistory, setShowHistory] = useState(false);
  
  // 聊天历史记录列表（持久化显示）
  const [chatHistoryList, setChatHistoryList] = useState<ChatHistoryItem[]>([]);
  
  // 文件上传状态 - 支持多文件
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB 总大小上限
  
  // 当前消息中的医院列表（用于显示推荐卡片）
  const [messageHospitals, setMessageHospitals] = useState<typeof HOSPITALS_QR.hospitals>([]);

  // 页面加载时初始化历史记录和模式
  useEffect(() => {
    // 使用懒初始化，避免在effect中直接setState
    const historyList = getHistory();
    if (historyList.length > 0) {
      setChatHistoryList(historyList);
    }
    
    // 初始化对话模式
    const savedMode = getCurrentMode();
    setChatMode(savedMode);
    
    // 初始化患者会话列表
    const sessions = getPatientSessions();
    setPatientSessions(sessions);
    
    // 恢复当前选中的患者
    const savedPatientId = getCurrentPatientId();
    if (savedPatientId && sessions.find(s => s.id === savedPatientId)) {
      setCurrentPatientId(savedPatientId);
    }
  }, []);

  // 移动端键盘适配
  useEffect(() => {
    // 检测移动端键盘弹出/收起
    const handleResize = () => {
      // 使用window.innerHeight变化来判断键盘状态
      const visualHeight = window.visualViewport?.height || window.innerHeight;
      const screenHeight = window.screen.height;
      // 如果可视高度明显小于屏幕高度，说明键盘弹出
      setIsKeyboardVisible(visualHeight < screenHeight * 0.75);
    };

    // 使用visualViewport API（移动端浏览器）
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize);
      visualViewport.addEventListener('scroll', handleResize);
      return () => {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      };
    } else {
      // 降级方案
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 从 localStorage 恢复历史消息
  const [stageMessages, setStageMessages] = useState<Record<Stage, Message[]>>(() => {
    if (typeof window !== 'undefined') {
      return getStageMessages();
    }
    return { symptom: [], department: [], treatment: [], guidance: [] };
  });

  // 使用 ref 跟踪初始化状态
  const initializedRef = useRef<Record<Stage, boolean>>({
    symptom: false,
    department: false,
    treatment: false,
    guidance: false
  });

  // 使用 ref 跟踪最新消息（用于在 async 函数中获取最新状态）
  const messagesRef = useRef<Message[]>([]);
  
  // 同步 messagesRef
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 初始化当前环节的消息（依赖于currentStage切换时加载对应模块的历史）
  useEffect(() => {
    // 如果正在发送消息，不初始化，避免清空正在显示的用户消息
    if (isSendingRef.current) return;
    
    const history = stageMessages[currentStage];
    
    // 使用条件更新，避免不必要的setState
    if (history.length > 0) {
      setMessages(history);
    }
    // 注意：不再无条件清空消息，保留用户可能正在编辑的内容
  }, [currentStage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (content: string) => {
    if ((!content.trim() && attachedFiles.length === 0) || isLoading) return;

    // 智能判断问题类型并自动切换环节（所有环节适用）
    const lowerContent = content.toLowerCase();
    
    // 定义各环节的专属关键词（按优先级排序：更具体的关键词放前面）
    const symptomExclusiveKeywords = ['症状', '难受', '不舒服', '指标异常', '报告解读', 
      'ca125', 'ca153', 'afp', '血红蛋白', '白细胞', '血小板', '肝功能', '肾功能', '血糖'];
    
    // 就医指导专属关键词（药物购买、医保、挂号等）- 优先级最高
    const guidanceExclusiveKeywords = ['医保', '报销', '费用', '特药', '双通道', '门特', '门规', 
      '异地就医', '临床试验', '大病保险', '价格', '多少钱', '花费', '原研药', '仿制药', 
      '开药', '医生不让', '药占比', '医院没有', '买不到', '怎么开', '哪里买', '哪里能买',
      '政策', '新农合', '城乡居民', '挂号', '预约', '北肿', '北京肿瘤', '就诊', '转诊', '床位',
      '奥沙利铂', '进口', '国产', '集采', '药', '靶向药', '买药', '开药', '取药', '药房', '药店'];
    
    const treatmentExclusiveKeywords = ['化疗', '放疗', '手术', '靶向', '免疫治疗', '免疫', 
      '耐药', '疗程', '方案', 'cea', 'ca199', 'ca724', 'ca242', '治疗效果', 
      '副作用', '不良反应', '效果', '起效', '没效果', '降低', '上升',
      '内镜', 'esd', 'emr', '切除', '抑酸', '胃镜', '肠镜', '结肠镜', '胃部', '肠道',
      '术前', '术后', '恢复', '息肉', '溃疡', '肿块', '良性', '恶性', '恶性'];
    
    // 判断问题是否与各环节相关
    const isSymptomRelated = symptomExclusiveKeywords.some(k => lowerContent.includes(k));
    const isTreatmentRelated = treatmentExclusiveKeywords.some(k => lowerContent.includes(k));
    const isGuidanceRelated = guidanceExclusiveKeywords.some(k => lowerContent.includes(k));
    
    // 医保相关问题优先判断：报销应在就医指导范畴内
    // 药物购买问题也应在就医指导范畴内（优先级高于治疗相关）
    if (isGuidanceRelated && currentStage !== 'guidance' && currentStage !== 'department') {
      // 医保/药物购买相关问题：切换到就医指导环节
      setCurrentStage('guidance');
      toast.info('已切换至「就医指导」环节', {
        description: '根据您的问题内容，将为您提供医保和费用相关信息',
        duration: 3000,
      });
    } else if (isTreatmentRelated && !isGuidanceRelated && currentStage !== 'treatment' && currentStage !== 'department') {
      // 治疗相关问题（且非药物购买）：切换到治疗相关环节
      setCurrentStage('treatment');
      toast.info('已切换至「治疗相关」环节', {
        description: '根据您的问题内容，将为您提供针对性的治疗指导',
        duration: 3000,
      });
    } else if (isSymptomRelated && !isGuidanceRelated && !isTreatmentRelated && currentStage === 'guidance') {
      // 只有在就医指导环节时，症状问题才切换到症状自查
      setCurrentStage('symptom');
      toast.info('已切换至「症状自查」环节', {
        description: '根据您的问题内容，将为您提供针对性的症状解读',
        duration: 3000,
      });
    } else if (currentStage === 'department') {
      // 科室推荐环节的切换逻辑
      if (isSymptomRelated) {
        setCurrentStage('symptom');
        toast.info('已切换至「症状自查」环节', {
          description: '根据您的问题内容，将为您提供针对性的症状解读',
          duration: 3000,
        });
      } else if (isTreatmentRelated) {
        setCurrentStage('treatment');
        toast.info('已切换至「治疗相关」环节', {
          description: '根据您的问题内容，将为您提供针对性的治疗指导',
          duration: 3000,
        });
      } else if (isGuidanceRelated) {
        setCurrentStage('guidance');
        toast.info('已切换至「就医指导」环节', {
          description: '根据您的问题内容，将为您提供医保和费用相关信息',
          duration: 3000,
        });
      }
    }

    isSendingRef.current = true; // 标记正在发送，防止初始化清空消息
    setIsLoading(true);

    // 清空文件内容变量
    let fileContent = '';

    // 构建附件信息（用于多模态支持）
    const attachments: Array<{ filename: string; base64: string; mimeType: string }> = [];
    for (let index = 0; index < attachedFiles.length; index++) {
      const file = attachedFiles[index];
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        // 图片文件压缩后转为 base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new (window as unknown as { Image: new () => HTMLImageElement }).Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // 计算压缩后的尺寸（最大 600px）
              let width = img.width;
              let height = img.height;
              const maxSize = 600;
              
              if (width > maxSize || height > maxSize) {
                if (width > height) {
                  height = Math.round((height * maxSize) / width);
                  width = maxSize;
                } else {
                  width = Math.round((width * maxSize) / height);
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              
              // 转为 base64（压缩质量 0.4）
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
              resolve(compressedBase64);
            };
            img.onerror = () => resolve('');
            img.src = e.target?.result as string;
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        
        if (base64) {
          // 移除 data:image/jpeg;base64, 前缀，只发送纯 base64 数据
          const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
          attachments.push({
            filename: file.name,
            base64: pureBase64,
            mimeType: 'image/jpeg'
          });
          fileContent += `[文件${index + 1}: ${file.name}] (已作为图片附件上传)\n`;
        } else {
          fileContent += `[文件${index + 1}: ${file.name}] (图片处理失败)\n`;
        }
      } else {
        // 文本文件直接读取
        try {
          const text = await file.text();
          // 限制文本长度
          const truncatedText = text.length > 5000 ? text.substring(0, 5000) + '\n...(内容过长已截断)' : text;
          fileContent += `[文件${index + 1}: ${file.name}]\n${truncatedText}\n\n`;
        } catch {
          fileContent += `[文件${index + 1}: ${file.name}] (读取失败)\n`;
        }
      }
    }

    // 如果有非图片附件，添加到消息内容中
    const fullMessage = content.trim() || '请根据上传的文件内容回答相关问题';
    const fullMessageWithAttachments = attachedFiles.length > 0 && fileContent
      ? `【用户上传文件 (${attachedFiles.length}个)】\n\n【文件内容】\n${fileContent}\n\n【用户问题】\n${fullMessage}`
      : fullMessage;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: fullMessageWithAttachments,
      timestamp: new Date(),
      stage: currentStage
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    
    // 清空附件
    const currentFiles = [...attachedFiles];
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

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
      // 根据模式构建请求参数
      const requestBody: Record<string, unknown> = { 
        message: fullMessage,
        history: historyMessages,
        stage: currentStage,
        context: fullContext,
        attachments: attachments,
        mode: chatMode,  // 传递当前模式
      };
      
      // 模式B/C：传递患者会话信息
      if (chatMode === 'patient' || chatMode === 'multi-patient') {
        const currentPatient = patientSessions.find(s => s.id === currentPatientId);
        if (currentPatient) {
          requestBody.conversationId = currentPatient.conversationId || undefined;
          requestBody.userId = currentPatient.id;
          requestBody.metaData = {
            patient_id: currentPatient.id,
            patient_name: currentPatient.name,
            stage: currentPatient.stage,
          };
        }
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      // 重置 refs
      assistantContentRef.current = '';
      reasoningContentRef.current = '';
      let assistantSources: SourceItem[] = [];

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        stage: currentStage,
        sources: []
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        let currentEvent = '';
        let hasError = false;
        for (const line of lines) {
          // 解析 event 行 (Coze返回格式: event:xxx 无空格)
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
            continue;
          }
          // 解析 data 行
          if (line.startsWith('data:')) {
            const data = line.slice(5);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // 检测 Coze API 错误响应（非 SSE 格式的错误 JSON）
              if (parsed.code && parsed.code !== 0 && parsed.msg) {
                hasError = true;
                console.error('Coze API error:', parsed.msg);
                break;
              }
              
              // 处理后端注入的 conversation_id 事件
              if (parsed.type === 'conversation_id' && parsed.conversation_id) {
                if (chatMode === 'patient' || chatMode === 'multi-patient') {
                  handleConversationIdReceived(parsed.conversation_id);
                }
                continue;
              }
              
              // Coze API 流式响应格式
              // Bot 启用深度思考模式时，先返回 reasoning_content（思考过程），然后返回 content（最终回答）
              if (currentEvent === 'conversation.message.delta') {
                // 如果有 reasoning_content，说明还在思考阶段
                if (parsed.reasoning_content !== undefined) {
                  reasoningContentRef.current += parsed.reasoning_content;
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, content: reasoningContentRef.current, isThinking: true }
                        : m
                    )
                  );
                } 
                // 如果有 content（即使是空字符串），说明思考结束，开始输出最终回答
                else if (parsed.content !== undefined) {
                  // 如果之前有思考内容，最终回答时需要合并或直接替换
                  // Coze 的最终回答会完整输出，所以直接用 content
                  if (parsed.content) {
                    assistantContentRef.current += parsed.content;
                  }
                  // 当 content 非空时，说明最终回答开始，更新消息
                  if (parsed.content) {
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessage.id 
                          ? { ...m, content: assistantContentRef.current, isThinking: false }
                          : m
                      )
                    );
                  }
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
        if (hasError) break;
      }
      
      // 检查是否收到了有效内容
      if (!assistantContentRef.current && !reasoningContentRef.current) {
        // 没有收到任何有效内容，显示错误提示
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: '抱歉，服务暂时不可用，请稍后再试。如问题持续，请联系管理员检查 API 配置。', isThinking: false }
              : m
          )
        );
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
      // 保存当前环节的消息到历史（使用messagesRef获取最新值，包含用户消息和AI回复）
      const latestMessages = messagesRef.current;
      if (latestMessages.length > 0) {
        const newStageMessages = { ...stageMessages, [currentStage]: latestMessages };
        setStageMessages(newStageMessages);
        // 同时保存到 localStorage
        saveStageMessages(newStageMessages);
      }
      // 保存用户提问到历史记录
      const historyItem: ChatHistoryItem = {
        id: userMessage.id,
        content: fullMessageWithAttachments,  // 完整消息（包含文件信息）
        userQuestion: content.trim() || '请根据上传的文件内容回答相关问题',  // 用户输入框中的问题
        fileNames: currentFiles.map(f => f.name),  // 关联的文件名列表
        timestamp: Date.now(),
        stage: currentStage
      };
      saveHistory(historyItem);
      // 刷新历史记录列表
      setChatHistoryList(getHistory());
      // 清除发送标记
      isSendingRef.current = false;
    }
  };

  // 文件上传处理 - 支持多文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // 验证文件类型
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    const allowedExtensions = ['.txt', '.doc', '.docx', '.xls', '.xlsx', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    for (const file of files) {
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
        alert(`不支持的文件格式：${file.name}，请上传 txt、word、excel、pdf 或图片格式`);
        return;
      }
      
      // 单个文件大小限制 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`文件 "${file.name}" 超过5MB限制`);
        return;
      }
    }
    
    // 计算当前总大小 + 新文件总大小
    const currentTotalSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);
    const newTotalSize = currentTotalSize + files.reduce((sum, f) => sum + f.size, 0);
    
    if (newTotalSize > MAX_TOTAL_SIZE) {
      const remainingSize = MAX_TOTAL_SIZE - currentTotalSize;
      alert(`总文件大小超过10MB限制，还能上传 ${(remainingSize / 1024 / 1024).toFixed(1)}MB`);
      return;
    }
    
    // 添加到现有文件列表
    setAttachedFiles(prev => [...prev, ...files]);
    
    // 清空 input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  // ============== 模式切换处理 ==============
  const handleModeChange = (mode: ChatMode) => {
    setChatMode(mode);
    saveCurrentMode(mode);
    
    // 切换到模式B或C时，如果没有患者会话，提示创建
    if ((mode === 'patient' || mode === 'multi-patient') && patientSessions.length === 0) {
      setShowNewPatientDialog(true);
    }
    
    // 切换到模式A时，清空当前患者选择
    if (mode === 'instant') {
      setCurrentPatientId(null);
      saveCurrentPatientId(null);
    }
    
    // 清空当前消息（切换模式时重置对话）
    setMessages([]);
  };

  // ============== 患者管理处理 ==============
  const handleCreatePatient = () => {
    if (!newPatientName.trim()) {
      toast.error('请输入患者姓名');
      return;
    }
    
    const session = createPatientSession(newPatientName.trim(), newPatientStage.trim());
    setPatientSessions(getPatientSessions());
    setCurrentPatientId(session.id);
    saveCurrentPatientId(session.id);
    
    // 清空输入
    setNewPatientName('');
    setNewPatientStage('');
    setShowNewPatientDialog(false);
    
    toast.success(`已创建患者会话：${session.name}`);
  };

  const handleSelectPatient = (patientId: string) => {
    setCurrentPatientId(patientId);
    saveCurrentPatientId(patientId);
    
    // 切换到该患者时，清空当前消息
    setMessages([]);
    
    // 在移动端自动关闭侧边栏
    if (window.innerWidth < 768) {
      setShowPatientSidebar(false);
    }
  };

  const handleDeletePatient = (patientId: string) => {
    if (confirm('确定删除该患者会话？删除后无法恢复。')) {
      deletePatientSession(patientId);
      setPatientSessions(getPatientSessions());
      
      // 如果删除的是当前选中的患者，切换到第一个或清空
      if (currentPatientId === patientId) {
        const remaining = getPatientSessions();
        if (remaining.length > 0) {
          setCurrentPatientId(remaining[0].id);
          saveCurrentPatientId(remaining[0].id);
        } else {
          setCurrentPatientId(null);
          saveCurrentPatientId(null);
        }
      }
      
      toast.success('患者会话已删除');
    }
  };

  // 获取当前患者的 conversation_id
  const getCurrentPatientConversationId = (): string | null => {
    if (!currentPatientId) return null;
    const patient = patientSessions.find(s => s.id === currentPatientId);
    return patient?.conversationId || null;
  };

  // 更新当前患者的 conversation_id
  const handleConversationIdReceived = (conversationId: string) => {
    if (currentPatientId && (chatMode === 'patient' || chatMode === 'multi-patient')) {
      updatePatientConversationId(currentPatientId, conversationId);
      setPatientSessions(getPatientSessions());
    }
  };

  const currentStageInfo = STAGES.find(s => s.id === currentStage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-gray-800 dark:to-slate-900">
      <Toaster position="top-center" richColors />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-lg">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  健康就医决策助手
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  仅供参考，不替代临床诊疗建议
                </p>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              <Shield className="mr-1 h-3 w-3" />
              仅辅助决策，不替代诊疗
            </Badge>
          </div>
        </div>
      </header>

      {/* ============== 模式选择器 ============== */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => handleModeChange('instant')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                chatMode === 'instant'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              即时问答
            </button>
            <button
              onClick={() => handleModeChange('patient')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                chatMode === 'patient'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              患者随访
            </button>
            <button
              onClick={() => handleModeChange('multi-patient')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                chatMode === 'multi-patient'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              多患者管理
            </button>
            
            {/* 模式B/C：显示当前患者信息和侧边栏切换 */}
            {(chatMode === 'patient' || chatMode === 'multi-patient') && (
              <>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                {currentPatientId && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    当前：{patientSessions.find(s => s.id === currentPatientId)?.name || '未选择'}
                  </span>
                )}
                <button
                  onClick={() => setShowPatientSidebar(!showPatientSidebar)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300"
                >
                  <Users className="h-3 w-3" />
                  患者列表
                </button>
                <button
                  onClick={() => setShowNewPatientDialog(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300"
                >
                  + 新患者
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============== 患者侧边栏（模式B/C） ============== */}
      {showPatientSidebar && (chatMode === 'patient' || chatMode === 'multi-patient') && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setShowPatientSidebar(false)}>
          <div 
            className="h-full w-72 bg-white dark:bg-slate-800 shadow-2xl flex flex-col border-r border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">患者列表</h3>
              <button 
                onClick={() => setShowPatientSidebar(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {patientSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无患者会话</p>
                  <button
                    onClick={() => {
                      setShowPatientSidebar(false);
                      setShowNewPatientDialog(true);
                    }}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    创建第一个患者
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {patientSessions.map(session => (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        currentPatientId === session.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => handleSelectPatient(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {session.name}
                          </span>
                          {session.conversationId && (
                            <span className="h-2 w-2 rounded-full bg-green-500" title="已建立会话" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {session.stage || '未设置分期'} · {session.messageCount}条消息
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePatient(session.id);
                        }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                        title="删除患者"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============== 新建患者对话框 ============== */}
      {showNewPatientDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowNewPatientDialog(false)}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">新建患者会话</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  患者姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="请输入患者姓名"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  疾病分期（可选）
                </label>
                <input
                  type="text"
                  value={newPatientStage}
                  onChange={(e) => setNewPatientStage(e.target.value)}
                  placeholder="如：T2N1M0、II期等"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewPatientDialog(false);
                  setNewPatientName('');
                  setNewPatientStage('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreatePatient}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-2 md:px-4 py-2 md:py-4 max-w-6xl">
        {/* 模式A提示：即时问答模式说明 */}
        {chatMode === 'instant' && (
          <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>即时问答模式</strong>：每次提问独立处理，不保留上下文。适合快速查询指南条款、医保政策等。
            </p>
          </div>
        )}
        
        {/* 模式B/C提示：患者随访模式说明 */}
        {(chatMode === 'patient' || chatMode === 'multi-patient') && !currentPatientId && (
          <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300">
              <strong>患者随访模式</strong>：请先创建或选择一个患者会话，系统将保留完整对话上下文。
            </p>
          </div>
        )}
        {/* Stage Navigation - Mobile Optimized (仅模式B/C显示) */}
        {chatMode !== 'instant' && (
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
        )}

        {/* 历史记录入口 - 放在四个模块下方 */}
        <div className="mb-2 md:mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 text-xs"
          >
            <History className="h-3.5 w-3.5 mr-1" />
            历史记录
          </Button>
        </div>

        {/* Chat Area - Mobile Optimized */}
        {/* 模式B/C：未选择患者时显示提示 */}
        {(chatMode === 'patient' || chatMode === 'multi-patient') && !currentPatientId ? (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg">
            <CardContent className="p-8 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                请先选择或创建患者会话
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                患者随访模式需要绑定患者身份，以便保留完整的对话上下文。
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setShowNewPatientDialog(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  创建新患者
                </Button>
                {patientSessions.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPatientSidebar(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    选择已有患者
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 md:gap-4">
          <div className="lg:col-span-3">
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg flex flex-col h-[calc(100vh-160px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)]">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 py-2 md:py-3 px-3 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-sm md:text-base">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                    <span className="text-sm md:text-base">
                      {chatMode === 'instant' ? '即时问答' : currentStageInfo?.title}
                    </span>
                    {chatMode !== 'instant' && (
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                        {STAGES.findIndex(s => s.id === currentStage) + 1}/{STAGES.length}
                      </Badge>
                    )}
                    {chatMode === 'instant' && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                        无上下文
                      </Badge>
                    )}
                  </div>
                  {chatMode !== 'instant' && (
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
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-2 md:p-4" ref={scrollRef}>
                    <div className="space-y-3 md:space-y-4">
                    {messages.map((message, msgIndex) => {
                      // 找到当前AI回复之前的用户问题
                      const currentIndex = msgIndex;
                      const prevUserMessage = currentIndex > 0 ? messages[currentIndex - 1] : null;
                      const userQuestionText = prevUserMessage ? prevUserMessage.content : '';
                      
                      // 优先从用户提问中提取医院，只有用户提问没有时才从AI回复提取
                      let hospitals: typeof HOSPITALS_QR.hospitals = [];
                      if (message.role === 'assistant') {
                        const userHospitals = extractHospitalsFromMessage(userQuestionText);
                        if (userHospitals.length > 0) {
                          // 用户提问中已有医院，优先使用
                          hospitals = userHospitals;
                        } else {
                          // 用户提问没有医院，才检查AI回复
                          hospitals = extractHospitalsFromMessage(message.content);
                        }
                      }
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
                            {/* 思考状态指示器 */}
                            {message.role === 'assistant' && message.isThinking && (
                              <div className="absolute -bottom-1 left-6 flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded-full text-[10px] text-amber-700 dark:text-amber-400">
                                <Brain className="h-3 w-3 animate-pulse" />
                                <span>深度思考中...</span>
                              </div>
                            )}
                            <div
                              className={`max-w-[90%] sm:max-w-[88%] md:max-w-[85%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${
                                message.role === 'user'
                                  ? 'bg-blue-500 text-white rounded-tr-sm'
                                  : message.isThinking 
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-amber-200 dark:border-amber-800'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                              }`}
                            >
                              {/* 如果消息包含文件，显示文件信息 */}
                              {message.content.includes('【用户上传文件') && (
                                <div className={`mb-2 p-2 rounded-lg border ${
                                  message.role === 'user' 
                                    ? 'bg-blue-600/30 border-blue-400/50' 
                                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                }`}>
                                  <div className="flex items-center gap-2 text-xs">
                                    <File className="h-4 w-4" />
                                    <span className={message.role === 'user' ? 'text-blue-100' : 'text-green-700 dark:text-green-400'}>
                                      {message.content.match(/【用户上传文件[^】]*】/)?.[0]?.replace(/【|】/g, '') || '已上传文件'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div 
                                className="text-sm sm:text-base md:text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words markdown-content"
                                dangerouslySetInnerHTML={{ 
                                  __html: renderContentWithSources(
                                    message.content.includes('【用户上传文件') 
                                      ? message.content.split('【用户问题】')[1] || message.content
                                      : message.content,
                                    message.sources
                                  )
                                }}
                              />

                              {/* 来源列表 - 仅在assistant回复且有sources时显示 */}
                              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                                <div className="mt-3 bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3">
                                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                    <span>【信息来源声明】本回答参考了以下来源，点击数字可查看原文：</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {message.sources.map((source, idx) => {
                                      const linkUrl = source.url || '#';
                                      const displayTitle = source.title || source.snippet || '查看原文';
                                      return (
                                        <li key={source.index} className="flex items-start gap-2 text-xs">
                                          <a
                                            href={linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none hover:bg-blue-600 transition-colors cursor-pointer"
                                            title={`点击查看来源：${linkUrl}`}
                                          >
                                            {source.index || idx + 1}
                                          </a>
                                          <a
                                            href={linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors line-clamp-2 flex-1"
                                            title={linkUrl}
                                          >
                                            {displayTitle}
                                          </a>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                              {/* 复制和下载按钮 - 仅在assistant回复时显示 */}
                              {message.role === 'assistant' && (() => {
                                // 找到当前AI回复之前的用户问题
                                const currentIndex = messages.findIndex(m => m.id === message.id);
                                const prevUserMessage = currentIndex > 0 ? messages[currentIndex - 1] : null;
                                
                                // 获取纯文本内容（去除HTML标签）
                                const getPlainText = (htmlContent: string) => {
                                  const tempDiv = document.createElement('div');
                                  tempDiv.innerHTML = htmlContent;
                                  return tempDiv.textContent || tempDiv.innerText || '';
                                };
                                
                                const aiReplyText = getPlainText(renderContentWithSources(message.content, message.sources));
                                const userQuestionText = prevUserMessage ? getPlainText(prevUserMessage.content) : '';
                                
                                // 组合完整内容：问题 + 回复
                                const fullContent = userQuestionText 
                                  ? `【用户问题】\n${userQuestionText}\n\n【AI回复】\n${aiReplyText}`
                                  : `【AI回复】\n${aiReplyText}`;
                                
                                return (
                                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(fullContent).then(() => {
                                          toast.success('已复制到剪贴板');
                                        }).catch(() => {
                                          toast.error('复制失败，请重试');
                                        });
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                      title="复制问题及回复内容"
                                    >
                                      <Copy className="h-3 w-3" />
                                      <span>复制</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        // 创建下载文件
                                        const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `AI问答_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                        toast.success('已下载为文本文件');
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                      title="下载问题及回复内容"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>下载</span>
                                    </button>
                                  </div>
                                );
                              })()}
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
                  {/* 附件显示区域 - 支持多文件 */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div 
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-[200px]"
                          >
                            {isImage ? (
                              <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : file.name.endsWith('.xls') || file.name.endsWith('.xlsx') ? (
                              <FileSpreadsheet className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <File className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <span className="flex-1 text-xs text-blue-700 dark:text-blue-400 truncate">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded shrink-0"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          </div>
                        );
                      })}
                      {attachedFiles.length > 1 && (
                        <button
                          type="button"
                          onClick={handleClearAllFiles}
                          className="text-xs text-gray-500 hover:text-red-500 px-2"
                        >
                          清除全部
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {/* 文件上传按钮 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.doc,.docx,.xls,.xlsx,.pdf,.jpg,.jpeg,.png,.gif,.webp"
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="shrink-0 h-11 w-11 sm:h-10 sm:w-10 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="上传附件"
                    >
                      <Paperclip className="h-5 w-5 sm:h-4 sm:w-4 text-gray-500" />
                    </Button>
                    <Input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="输入您的问题..."
                      disabled={isLoading}
                      className="flex-1 text-base sm:text-sm md:text-base h-11 sm:h-10"
                    />
                    <Button 
                      type="submit" 
                      disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-11 w-11 sm:h-10 sm:w-10"
                      size="icon"
                    >
                      <Send className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 hidden sm:block">
                    支持多文件上传，txt、word、excel、pdf、图片格式，总大小最大 10MB
                  </p>
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
        )}
      </main>

      {/* 医院二维码弹窗 */}
      <HospitalQRDialoDialog 
        hospital={selectedHospital} 
        onClose={() => setSelectedHospital(null)}
      />

      {/* 历史记录面板 */}
      {showHistory && (
        <HistoryPanel
          history={chatHistoryList}
          onClose={() => setShowHistory(false)}
          onSelectHistory={(userQuestion, fileNames) => {
            setInput(userQuestion);
            if (fileNames && fileNames.length > 0) {
              // 提示用户需要重新上传文件
              toast(`请重新上传之前关联的文件：${fileNames.join(', ')}`, {
                description: '点击上传按钮选择文件',
                duration: 5000,
              });
            }
            setShowHistory(false);
          }}
          onRefresh={() => setChatHistoryList(getHistory())}
        />
      )}
    </div>
  );
}
