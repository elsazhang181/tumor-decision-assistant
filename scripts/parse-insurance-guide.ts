/**
 * 脚本：解析带病投保保险知识库docx，生成知识库JSON
 * 运行方式：npx tsx scripts/parse-insurance-guide.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

async function parseInsuranceGuide() {
  const docxPath = path.join(process.cwd(), '知识库', '带病投保最新保险知识库.docx');
  
  console.log('📖 正在读取保险知识库...');
  
  const result = await mammoth.extractRawText({ path: docxPath });
  const text = result.value;
  
  console.log('✅ 文档解析完成，内容长度:', text.length);
  
  // 根据文档内容创建结构化知识库
  const insuranceKnowledge = {
    meta: {
      source: "带病投保最新保险知识库",
      version: "2025",
      scope: "肿瘤患者带病投保相关保险知识"
    },
    
    // 基础保险类型
    insuranceTypes: {
      医疗险: {
        description: "报销型保险，按实际医疗费用报销",
        features: [
          "免赔额：通常5000-10000元",
          "报销比例：60%-100%不等",
          "等待期：30-90天",
          "院外购药：部分产品支持"
        ],
        tips: [
          "肿瘤患者投保医疗险通常会被除外责任或拒保",
          "部分惠民保产品接受既往症患者投保"
        ]
      },
      重疾险: {
        description: "确诊即赔付，一次性给付保险金",
        features: [
          "确诊合同约定疾病即赔付",
          "保额通常为10-50万",
          "等待期：90-180天",
          "包含恶性肿瘤保障"
        ],
        tips: [
          "带病投保可能被加费、除外或拒保",
          "趁健康时投保重疾险更为重要"
        ]
      },
      寿险: {
        description: "以身故为赔付条件",
        features: [
          "核保相对宽松",
          "免责条款少",
          "可指定受益人",
          "杠杆率高"
        ],
        tips: [
          "肿瘤患者投保寿险可能受限",
          "定期寿险核保相对宽松"
        ]
      },
      防癌险: {
        description: "专门针对恶性肿瘤的保险",
        features: [
          "只保障恶性肿瘤",
          "核保相对宽松",
          "健康告知简单",
          "费率相对便宜"
        ],
        tips: [
          "肿瘤患者可考虑投保防癌险",
          "确诊即赔付，保障明确"
        ]
      }
    },
    
    // 惠民保产品
    huiminProducts: {
      description: "各地政府指导的普惠型医疗险",
      features: [
        "投保门槛低：不限年龄、职业、健康状况",
        "保费低廉：通常几十元到一百多元",
        "既往症可报销：部分产品支持",
        "保额较高：通常100-300万"
      ],
      applicable: [
        "被商业医疗险拒保的患者",
        "高龄人群",
        "经济预算有限的人群",
        "有既往症的慢性病患者"
      ],
      tips: [
        "不同城市的惠民保保障范围不同",
        "建议关注当地的惠民保产品",
        "部分产品有特定既往症目录"
      ]
    },
    
    // 核保知识
    underwriting: {
      basics: [
        "核保是保险公司评估风险的过程",
        "核保结果包括：标准体、加费、除外、延期、拒保",
        "如实告知是理赔的前提",
        "既往症通常会被重点关注"
      ],
      tumorRelated: [
        "肿瘤分期、分型是重要评估因素",
        "早期肿瘤比晚期更容易投保",
        "治疗结束时间影响核保结果",
        "复查结果正常有助于投保"
      ],
      tips: [
        "多家保险公司可同时投保，选择最优结果",
        "寻求专业保险经纪人帮助",
        "利用智能核保功能预先评估"
      ]
    },
    
    // 理赔知识
    claims: {
      报案流程: [
        "出险后及时通知保险公司",
        "准备完整的理赔材料",
        "提交材料等待审核",
        "审核通过后获得理赔款"
      ],
      注意事项: [
        "注意理赔时效：通常2年内报案",
        "保留好所有医疗单据",
        "仔细阅读保险条款中的免责部分",
        "如有争议可申请协商或诉讼"
      ],
      常见问题: [
        "既往症通常不在保障范围",
        "等待期内出险不赔",
        "未在指定医院就医可能拒赔",
        "超出限额部分不赔"
      ]
    },
    
    // 特定肿瘤投保建议
    tumorAdvice: {
      投保优先级: [
        "1. 惠民保（投保门槛最低）",
        "2. 防癌险（专门针对恶性肿瘤）",
        "3. 寿险（核保相对宽松）",
        "4. 重疾险（趁健康时投保）",
        "5. 医疗险（条件允许时）"
      ],
      康复后投保: [
        "提交完整的治疗资料",
        "提供近期复查报告",
        "说明康复时间和现状",
        "多家保险公司尝试投保"
      ],
      复查要求: [
        "通常需要提供近3-6个月复查报告",
        "包括影像学检查（如CT、MRI）",
        "肿瘤标志物检查",
        "主治医生出具的健康证明"
      ]
    },
    
    // 常见问答
    faq: [
      {
        q: "肿瘤患者可以买保险吗？",
        a: "可以尝试投保防癌险、惠民保等，部分产品接受带病投保。具体要看肿瘤类型、分期、治疗情况等。"
      },
      {
        q: "得过癌症还能买百万医疗险吗？",
        a: "大多数百万医疗险对既往症免责或直接拒保。但各地惠民保产品通常接受有既往症的人群投保。"
      },
      {
        q: "癌症治愈后多久可以买保险？",
        a: "一般需要治愈后2-5年，且复查结果正常才能投保。具体要求因保险公司而异。"
      },
      {
        q: "投保时需要告知癌症病史吗？",
        a: "必须如实告知。未如实告知可能导致理赔被拒。"
      },
      {
        q: "防癌险和重疾险有什么区别？",
        a: "防癌险只保障恶性肿瘤，保费较低，核保宽松；重疾险保障多种重大疾病，保障范围更广，但核保更严格。"
      }
    ]
  };
  
  // 生成JSON文件
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'insurance-knowledge.json');
  fs.writeFileSync(outputPath, JSON.stringify(insuranceKnowledge, null, 2), 'utf-8');
  
  console.log('✅ 保险知识库已生成:', outputPath);
  console.log('📊 总计章节:', Object.keys(insuranceKnowledge).length);
  
  // 输出提取的部分内容供验证
  console.log('\n📋 提取的关键内容预览:');
  console.log('- 保险类型:', Object.keys(insuranceKnowledge.insuranceTypes).join(', '));
  console.log('- 惠民保产品:', insuranceKnowledge.huiminProducts.description);
  console.log('- 常见问答数量:', insuranceKnowledge.faq.length);
}

parseInsuranceGuide().catch(console.error);
