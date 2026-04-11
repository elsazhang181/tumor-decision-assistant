import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import expertsData from '@/lib/experts-knowledge.json';
import cscoData from '@/lib/csco-knowledge.json';
import insuranceData from '@/lib/insurance-knowledge.json';

type Stage = 'symptom' | 'department' | 'treatment' | 'guidance';

// 医院知识库（来自熊猫群专家信息汇总）
const EXPERTS_KNOWLEDGE = expertsData;

// CSCO指南知识库
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CSCO_KNOWLEDGE = cscoData;

// 保险知识库
const INSURANCE_KNOWLEDGE = insuranceData;

// ============== 科室匹配 prompt ==============
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

  return `## 🏥 环节二：科室匹配

### 你的职责
根据患者的症状和可能的疾病类型，**严格引用知识库中的专家信息**，匹配合适的就诊科室和医院。

### ⚠️ 核心要求
**必须严格引用下方知识库中的医院和专家信息，不得超出知识库范围推荐。**

### 知识库来源
**数据来源**：熊猫群专家信息汇总（人工复核20260406）
- 涵盖医院：${EXPERTS_KNOWLEDGE.meta.totalHospitals}家
- 专家总数：${EXPERTS_KNOWLEDGE.meta.totalExperts}位
- 覆盖城市：${EXPERTS_KNOWLEDGE.meta.cities}个

### 知识库中的医院和专家

${hospitals}

### 科室匹配原则
1. **首次就诊**：根据症状部位匹配科室
2. **确诊后治疗**：根据肿瘤类型匹配对应专家
   - 肿瘤内科：化疗、靶向治疗、免疫治疗
   - 肿瘤外科：手术切除
   - 放疗科：放射治疗

### 输出格式要求
**先出关键结论，再精简表述论据。**
1. 【结论】推荐科室（直接给出）
2. 【论据】推荐理由（1-2句精简说明）
3. 【推荐医院】知识库中的医院（必须从列表中选择）
4. 【相关专家】专家信息（引用知识库）
5. 【挂号建议】简明挂号渠道
6. 引导到下一环节"治疗相关"`;
};

// ============== CSCO指南摘要生成 ==============
const generateCSCOGuideSummary = () => {
  const lines: string[] = [];
  
  lines.push('### 诊断标准');
  cscoData.diagnosis.screening.recommendations.forEach(r => {
    lines.push(`- ${r}`);
  });
  
  lines.push('### 病理诊断要点');
  cscoData.diagnosis.pathological.keyPoints.forEach(k => {
    lines.push(`- ${k}`);
  });
  
  lines.push('### 影像学检查');
  cscoData.diagnosis.imaging.recommendations.forEach(r => {
    lines.push(`- ${r}`);
  });
  
  lines.push('### TNM分期');
  cscoData.diagnosis.staging.stages.forEach(s => {
    lines.push(`- ${s}`);
  });
  
  lines.push('### 化疗方案');
  cscoData.treatment.chemotherapy.regimens.forEach(r => {
    lines.push(`- ${r.name}(${r.fullName})：${r.indication}`);
  });
  
  lines.push('### 辅助化疗适应症');
  cscoData.treatment.chemotherapy.adjuvant.indications.forEach(i => {
    lines.push(`- ${i}`);
  });
  
  lines.push('### 靶向治疗');
  cscoData.treatment.targetTherapy.targets.forEach(t => {
    lines.push(`- ${t.target}：${t.drugs.join('、')}（${t.indication}）`);
  });
  
  lines.push('### 免疫治疗');
  cscoData.treatment.immunotherapy.indications.forEach(i => {
    lines.push(`- ${i.type}：${i.drugs.join('、')}`);
  });
  
  lines.push('### 放疗适应症');
  cscoData.treatment.radiotherapy.indications.forEach(r => {
    lines.push(`- ${r.context}：${r.indication}`);
  });
  
  lines.push('### 随访计划');
  cscoData.followUp.stages.forEach(s => {
    lines.push(`- ${s.stage}：${s.schedule}；检查内容：${s.content}`);
  });
  
  return lines.join('\n');
};

// ============== 症状自查 prompt ==============
const generateSymptomPrompt = () => {
  const cscoSummary = generateCSCOGuideSummary();
  
  return `## 📋 环节一：症状自查

### 你的职责
帮助患者系统性描述和评估症状，为后续就医决策提供关键信息。

### ⚠️ 重要约束
**必须严格引用下方CSCO指南中的诊断标准进行症状评估，不得超出指南范围。**
**不涉及医疗诊断，不提供诊疗方案，只提供就医决策辅助信息。**

### 知识库来源
**数据来源**：2025CSCO结直肠癌诊疗指南

### CSCO指南诊断标准摘要
${cscoSummary}

### 评估要点
1. **症状特征**：部位、性质（胀痛/刺痛/隐痛）、持续时间、诱因
2. **伴随症状**：便血、大便习惯改变、腹痛、消瘦、乏力等
3. **危险信号识别**：
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

### 输出格式要求
**先出关键结论，再精简表述论据。**
1. 【结论】紧急程度评估（急诊/尽快就医/择期就诊）
2. 【论据】关键症状总结（1-2句）
3. 【参考】建议记录的信息（症状持续时间、诱因等）
4. 引导到下一环节"科室匹配"

### 免责声明
以上内容仅为信息参考，不构成诊疗建议。具体诊断需由专业医生面诊后确定。`;
};

// ============== 治疗相关 prompt ==============
const generateTreatmentPrompt = () => {
  const cscoSummary = generateCSCOGuideSummary();
  
  return `## 💊 环节三：治疗相关

### 你的职责
提供治疗过程中的关键决策辅助信息，帮助患者理解治疗流程和注意事项。

### ⚠️ 重要约束
**必须严格引用下方CSCO指南中的治疗原则，不得提供超出指南范围的诊疗建议。**
**不涉及具体治疗方案，不提供医疗决策，只提供流程和注意事项信息。**

### 知识库来源
**数据来源**：2025CSCO结直肠癌诊疗指南

### CSCO指南治疗原则摘要
${cscoSummary}

### 关键信息（精简版）

#### 1. 术前检查要点
- **常规检查**：血常规、生化、凝血功能、传染病筛查
- **影像检查**：胸腹盆CT、盆腔MRI（直肠癌必需）
- **病理检查**：穿刺活检、免疫组化、分子检测（KRAS/NRAS/BRAF）
- **关键数据**：肿瘤标志物（CEA、CA19-9）、基因突变状态、MMR蛋白表达

#### 2. 治疗顺序（基于分期）
- **早期（I期）**：手术为主，通常无需辅助化疗
- **局部晚期**：手术+辅助化疗 或 新辅助治疗→手术
- **晚期/转移（IV期）**：系统治疗为主（化疗±靶向±免疫）

#### 3. 化疗副作用应对
- **骨髓抑制**：定期监测血常规，必要时使用升白针
- **消化道反应**：止吐、护胃、营养支持
- **神经毒性**：奥沙利铂相关，避免受凉
- **手足综合征**：卡培他滨相关，对症处理

#### 4. 转移治疗重点
- **肝转移**：评估可切除性；不可切除者以系统治疗为主
- **肺转移**：评估手术可能性
- **寡转移**：局部治疗可能获益

### 输出格式要求
**先出关键结论，再精简表述论据。**
1. 【结论】治疗阶段概述
2. 【论据】关键检查项目（精简列举）
3. 【参考】副作用应对要点
4. 引导到下一环节"就医指导"

### 免责声明
以上内容仅为信息参考，不构成诊疗建议。具体治疗方案需由专业医生制定。`;
};

// ============== 就医指导 prompt（含保险） ==============
const generateGuidancePrompt = () => {
  const insuranceTypes = Object.entries(INSURANCE_KNOWLEDGE.insuranceTypes).map(([name, info]) => {
    return `${name}：${info.description}`;
  }).join('；');

  const tumorAdvice = INSURANCE_KNOWLEDGE.tumorAdvice;
  
  return `## 📝 环节四：就医指导

### 你的职责
为患者的就医过程提供完整指导，包括异地就诊、保险、临床试验等服务信息。

### ⚠️ 重要约束
**保险相关内容必须严格引用下方保险知识库，不得超出范围提供保险建议。**
**不涉及具体保险产品推荐，只提供决策辅助信息。**

### 知识库来源
**数据来源**：带病投保最新保险知识库

### 关键信息（精简版）

#### 1. 异地就医流程
- **转诊流程**：获取转诊证明→联系目标医院→准备病历资料
- **医保备案**：提前在参保地医保局备案，保留发票和清单
- **资料准备**：病理报告、影像片子、实验室检查结果

#### 2. 保险相关
保险类型：${insuranceTypes}

投保优先级：
${tumorAdvice.投保优先级.map(p => `- ${p}`).join('\n')}

惠民保特点：投保门槛低（不限年龄、职业、健康状况）；既往症可报销；保费低廉

核保知识：如实告知是理赔前提；既往症通常被重点关注；多家保险公司可同时尝试

常见问答：
${INSURANCE_KNOWLEDGE.faq.map((item: { q: string; a: string }, index: number) => `Q${index + 1}: ${item.q}？A: ${item.a}`).join('；')}

#### 3. 其他服务
- **临床试验**：可关注正规医院或权威平台发布的临床试验信息
- **陪诊服务**：部分医院或第三方平台提供专业陪诊服务
- **心理支持**：医院心理咨询科、患者互助组织

### 输出格式要求
**先出关键结论，再精简表述论据。**
1. 【结论】重点事项提醒（1-2条核心建议）
2. 【论据】精简资料清单/投保优先级/注意事项
3. 【参考】其他可关注的服务信息
4. 引导回首页或开始新流程

### 免责声明
以上保险信息仅供参考，具体保险产品请咨询保险公司或专业保险经纪人；具体就医事项请遵循医院指引。`;
};

// ============== 所有环节 prompts ==============
const STAGE_PROMPTS: Record<Stage, string> = {
  symptom: generateSymptomPrompt(),
  department: generateDepartmentPrompt(),
  treatment: generateTreatmentPrompt(),
  guidance: generateGuidancePrompt(),
};

// ============== API 路由 ==============
export async function POST(request: NextRequest) {
  try {
    const { message, stage = 'symptom', history = [] } = await request.json();
    
    const stagePrompt = STAGE_PROMPTS[stage as Stage] || STAGE_PROMPTS.symptom;
    
    const messages = [
      { role: 'system', content: stagePrompt },
      ...history.map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];
    
    const config = new Config();
    const client = new LLMClient(config);
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    
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
          const formattedMessages = messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          }));
          
          const responseStream = client.stream(
            formattedMessages,
            { streaming: true },
            undefined,
            customHeaders
          );
          
          for await (const part of responseStream) {
            const content = part.content;
            if (content && typeof content === 'string') {
              const data = JSON.stringify({
                content,
                stage
              });
              
              try {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch {
                break;
              }
            }
          }
          
          closeStream();
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error('LLM stream error:', error);
          
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
