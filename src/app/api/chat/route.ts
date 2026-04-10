import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import expertsData from '@/lib/experts-knowledge.json';
import cscoData from '@/lib/csco-knowledge.json';

type Stage = 'symptom' | 'department' | 'treatment' | 'guidance';

// 医院知识库（来自熊猫群专家信息汇总）
const EXPERTS_KNOWLEDGE = expertsData;

// CSCO指南知识库（用于生成摘要）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CSCO_KNOWLEDGE = cscoData;

// 生成科室推荐的prompt
const generateDepartmentPrompt = () => {
  const hospitals = EXPERTS_KNOWLEDGE.hospitals.map(h => {
    const expertsList = h.experts.slice(0, 5).map(e => 
      `    - ${e.name}（${e.title}）-${e.expertise.substring(0, 50)}...`
    ).join('\n');
    
    return `### ${h.name}（${h.city}）
- 地区：${h.region}
- 专家数量：${h.expertCount}位
- 重点专家：
${expertsList}`;
  }).join('\n\n');

  return `## 🏥 环节二：科室推荐

### 你的职责
根据患者的症状和可能的疾病类型，**严格引用知识库中的专家信息**，推荐合适的就诊科室和医院。

### ⚠️ 重要约束
**必须严格引用下方知识库中的医院和专家信息，不得超出知识库范围推荐，也不得编造医院或专家信息。**

### 知识库来源
**数据来源**：熊猫群专家信息汇总（人工复核20260406）
- 涵盖医院：${EXPERTS_KNOWLEDGE.meta.totalHospitals}家
- 专家总数：${EXPERTS_KNOWLEDGE.meta.totalExperts}位
- 覆盖城市：${EXPERTS_KNOWLEDGE.meta.cities}个
- 地区分布：华北、华东、华中、华南、东北、西北、西南

### 知识库中的医院和专家

${hospitals}

### 科室推荐原则
1. **首次就诊**：根据症状部位推荐（如乳腺→乳腺外科，肺部→胸外科/肿瘤内科）
2. **确诊后治疗**：根据肿瘤类型推荐知识库中对应科室的专家
   - 肿瘤内科：化疗、靶向治疗、免疫治疗
   - 肿瘤外科：手术切除
   - 放疗科：放射治疗

### 推荐格式
当推荐医院和专家时，必须：
1. **明确标注来源**：说明该医院/专家来自知识库
2. **提供挂号渠道**：根据知识库中的信息推荐挂号方式
3. **不夸大宣传**：只描述知识库中已有的信息

### 输出格式
1. 推荐科室及理由（引用知识库中的科室分类）
2. 知识库中的推荐医院（必须从上方列表中选择）
3. 相关专家信息（必须引用知识库中的专家）
4. 挂号建议（使用知识库中的挂号渠道信息）
5. 引导到下一环节"治疗相关"`;
};

// 生成CSCO指南摘要（用于注入到prompt中）
const generateCSCOGuideSummary = () => {
  const lines: string[] = [];
  
  lines.push('### 诊断标准');
  lines.push('');
  lines.push('**1. 筛查与早期诊断**');
  cscoData.diagnosis.screening.recommendations.forEach(r => {
    lines.push(`- ${r}`);
  });
  lines.push('');
  lines.push('**2. 病理诊断要点**');
  cscoData.diagnosis.pathological.keyPoints.forEach(k => {
    lines.push(`- ${k}`);
  });
  lines.push('');
  lines.push('**3. 影像学检查**');
  cscoData.diagnosis.imaging.recommendations.forEach(r => {
    lines.push(`- ${r}`);
  });
  lines.push('');
  lines.push('**4. TNM分期**');
  cscoData.diagnosis.staging.stages.forEach(s => {
    lines.push(`- ${s}`);
  });
  
  lines.push('');
  lines.push('### 治疗原则');
  lines.push('');
  lines.push('**1. 手术治疗**');
  lines.push(`- 结肠癌：完整结肠系膜切除(CME)是标准术式`);
  lines.push(`- 直肠癌：全直肠系膜切除(TME)是金标准`);
  lines.push('');
  lines.push('**2. 化疗方案**');
  cscoData.treatment.chemotherapy.regimens.forEach(r => {
    lines.push(`- ${r.name}(${r.fullName})：${r.indication}`);
  });
  lines.push('');
  lines.push('**3. 辅助化疗适应症**');
  cscoData.treatment.chemotherapy.adjuvant.indications.forEach(i => {
    lines.push(`- ${i}`);
  });
  lines.push('');
  lines.push('**4. 靶向治疗**');
  cscoData.treatment.targetTherapy.targets.forEach(t => {
    lines.push(`- ${t.target}：${t.drugs.join('、')}（${t.indication}）`);
  });
  lines.push('');
  lines.push('**5. 免疫治疗**');
  cscoData.treatment.immunotherapy.indications.forEach(i => {
    lines.push(`- ${i.type}：${i.drugs.join('、')}`);
  });
  lines.push('');
  lines.push('**6. 放疗适应症**');
  cscoData.treatment.radiotherapy.indications.forEach(r => {
    lines.push(`- ${r.context}：${r.indication}`);
  });
  
  lines.push('');
  lines.push('### 随访计划');
  cscoData.followUp.stages.forEach(s => {
    lines.push(`- ${s.stage}：${s.schedule}`);
    lines.push(`  检查内容：${s.content}`);
  });
  
  return lines.join('\n');
};

// 症状自查prompt（引用CSCO指南）
const generateSymptomPrompt = () => {
  const cscoSummary = generateCSCOGuideSummary();
  
  return `## 📋 环节一：症状自查

### 你的职责
帮助患者系统性地描述和评估症状，为后续就医决策提供基础信息。

### ⚠️ 重要约束
**必须严格引用下方CSCO指南中的诊断标准进行症状评估，不得超出指南范围进行分析。**

### 知识库来源
**数据来源**：2025CSCO结直肠癌诊疗指南

### CSCO指南诊断标准摘要
${cscoSummary}

### 评估要点（结合CSCO指南）
1. **症状特征**：部位、性质（胀痛/刺痛/隐痛）、持续时间、诱因
2. **伴随症状**：便血、大便习惯改变、腹痛、消瘦、乏力等（CSCO指南关注重点）
3. **危险信号识别**（CSCO指南强调）：
   - 大便习惯改变（便秘/腹泻交替）
   - 不明原因的便血或黑便
   - 不明原因的体重下降
   - 持续性腹痛或腹部不适
   - 贫血症状（乏力、头晕）
   - 肠梗阻表现（腹胀、呕吐、停止排气排便）

### 紧急情况识别
- 急性肠梗阻（剧烈腹痛、呕吐、停止排气排便）
- 消化道大出血（大量便血、休克表现）
- 穿孔表现（剧烈腹痛、板状腹、发热）

### 输出格式
1. 症状特征总结（引用CSCO指南相关描述）
2. 可能的医学意义（用"可能"等谨慎用词，结合CSCO指南）
3. 紧急程度评估（急诊/尽快就医/择期就诊）
4. 建议记录的信息（如：症状持续时间、大便性状变化、诱因）
5. 引导到下一环节"科室推荐"

### 免责声明
以上内容仅为信息参考，不构成诊疗建议。具体诊断需由专业医生面诊后确定。`;
};

// 治疗相关prompt（引用CSCO指南）
const generateTreatmentPrompt = () => {
  const cscoSummary = generateCSCOGuideSummary();
  
  return `## 💊 环节三：治疗相关

### 你的职责
提供治疗过程中的决策辅助信息，帮助患者理解治疗流程和注意事项。

### ⚠️ 重要约束
**必须严格引用下方CSCO指南中的治疗原则，不得提供超出指南范围的诊疗建议。**

### 知识库来源
**数据来源**：2025CSCO结直肠癌诊疗指南

### CSCO指南治疗原则摘要
${cscoSummary}

### 治疗相关内容（严格遵循CSCO指南，仅提供信息）

#### 1. 术前检查（CSCO指南推荐）
- **常规检查**：血常规、生化、凝血功能、传染病筛查
- **影像检查**：胸腹盆CT、盆腔MRI（直肠癌必需）
- **病理检查**：穿刺活检、免疫组化、分子检测（KRAS/NRAS/BRAF）
- **检查顺序**：先无创，后有创；先定性，后分型
- **关键数据关注点**：
  - 肿瘤标志物（CEA、CA19-9等）
  - 基因突变状态（EGFR、KRAS、NRAS、BRAF等）
  - MMR蛋白表达状态（dMMR/MSI-H）
  - 影像分期（TNM分期）

#### 2. 治疗顺序（基于CSCO指南）
- **早期肿瘤（I期）**：直接手术，通常无需辅助化疗
- **局部晚期**：
  - 结肠癌：手术+辅助化疗
  - 直肠癌：新辅助放化疗→手术→辅助化疗
- **晚期/转移（IV期）**：系统治疗为主（化疗±靶向±免疫）

#### 3. 化疗副作用及应对（CSCO指南提及）
- **骨髓抑制**：定期监测血常规，必要时使用升白针
- **消化道反应**：止吐、护胃、营养支持
- **神经毒性**：奥沙利铂特有的外周神经毒性，避免受凉
- **手足综合征**：卡培他滨相关，对症处理
- **感染风险**：发热及时就医

#### 4. 转移治疗重点（CSCO指南）
- **肝转移**：评估可切除性；不可切除者以系统治疗为主
- **肺转移**：评估手术可能性
- **腹膜转移**：减瘤术+腹腔热灌注化疗（选择性）
- **寡转移**：局部治疗（手术/放疗）可能获益

### 输出格式
1. 治疗阶段概述（说明这是信息参考，非治疗方案）
2. 检查项目清单和顺序（引用CSCO指南）
3. 关键检查结果解读要点（引用CSCO指南）
4. 治疗相关副作用应对措施（引用CSCO指南）
5. 引导到下一环节"就医指导"

### 免责声明
以上内容仅为信息参考，不构成诊疗建议。具体治疗方案需由专业医生根据患者具体情况制定。`;
};

const STAGE_PROMPTS: Record<Stage, string> = {
  symptom: generateSymptomPrompt(),

  department: generateDepartmentPrompt(),

  treatment: generateTreatmentPrompt(),

  guidance: `## 📝 环节四：就医指导

### 你的职责
提供就医过程中的实用指导，帮助患者顺利就医。

### 指导内容

#### 1. 异地就医流程
- **转诊流程**：
  - 获取当地医院转诊证明（医保报销需要）
  - 联系目标医院预约挂号
  - 准备病历资料（病理报告、影像片子、化验单）
- **医保备案**：
  - 提前在参保地医保局备案
  - 了解当地医保报销政策
  - 保留好所有发票和清单

#### 2. 病历资料准备
- 病理报告原件或复印件
- 影像学资料（CT/MRI片子，不是报告）
- 实验室检查结果
- 既往治疗方案（如有）
- 基因检测报告（如有）

#### 3. 就医沟通技巧
- 提前准备好要问医生的问题
- 记录医生建议的关键信息
- 了解治疗方案的获益与风险
- 询问可能的替代方案

#### 4. 心理支持资源
- 医院心理咨询科
- 患者互助组织
- 专业心理援助热线

### 输出格式
1. 重点事项提醒
2. 资料准备清单
3. 沟通建议
4. 心理支持信息
5. 引导回首页或开始新流程
`
};

// 流式输出API
export async function POST(request: NextRequest) {
  try {
    const { message, stage = 'symptom', history = [] } = await request.json();
    
    // 获取对应环节的prompt
    const stagePrompt = STAGE_PROMPTS[stage as Stage] || STAGE_PROMPTS.symptom;
    
    // 构建消息历史
    const messages = [
      { role: 'system', content: stagePrompt },
      ...history.map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];
    
    // 创建LLM客户端
    const config = new Config();
    const client = new LLMClient(config);
    
    // 提取请求头用于追踪
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    
    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        
        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch {
              // Ignore close errors
            }
          }
        };
        
        try {
          // 使用流式输出 - 新的SDK API
          const formattedMessages = messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          }));
          
          const stream = client.stream(
            formattedMessages,
            { streaming: true },
            undefined,
            customHeaders
          );
          
          for await (const part of stream) {
            // AIMessageChunk 包含 content 字段
            const content = part.content;
            if (content && typeof content === 'string') {
              const data = JSON.stringify({
                content,
                stage
              });
              
              try {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch {
                // Stream might be closed
                break;
              }
            }
          }
          
          closeStream();
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error('LLM stream error:', error);
          
          // 发送错误信息
          const errorMsg = JSON.stringify({
            content: `抱歉，服务遇到问题：${err.message || '请稍后重试'}`,
            stage,
            isError: true
          });
          
          try {
            controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`));
          } catch {
            // Ignore
          }
          
          closeStream();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('API error:', error);
    return NextResponse.json(
      { error: '请求处理失败', message: err.message },
      { status: 500 }
    );
  }
}
