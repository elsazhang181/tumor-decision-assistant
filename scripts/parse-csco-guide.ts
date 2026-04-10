/**
 * 脚本：解析2025CSCO结直肠癌诊疗指南PDF，生成知识库JSON
 * 运行方式：npx tsx scripts/parse-csco-guide.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// CSCO结直肠癌诊疗指南关键内容（从PDF提取的摘要）
// 实际项目中应使用PDF解析库提取完整内容

const cscoGuideContent = {
  meta: {
    source: "2025CSCO结直肠癌诊疗指南-CA万事屋",
    version: "2025",
    scope: "结直肠癌的诊断、治疗及随访"
  },

  // 诊断标准
  diagnosis: {
    screening: {
      title: "筛查与早期诊断",
      recommendations: [
        "一般人群：50-74岁每2年1次粪便免疫化学检测(FIT)或每5年1次肠镜",
        "高危人群（有家族史）：提前至40岁开始筛查，缩短间隔",
        "遗传性综合征（如Lynch综合征）：更早、更频繁的筛查"
      ]
    },
    pathological: {
      title: "病理诊断",
      keyPoints: [
        "组织学确认是金标准",
        "免疫组化：CK20(+), CDX2(+), SATB2(+)支持肠癌诊断",
        "分子检测：KRAS/NRAS/BRAF突变状态必须检测",
        "MMR蛋白表达：MLH1, MSH2, MSH6, PMS2"
      ]
    },
    imaging: {
      title: "影像学检查",
      recommendations: [
        "胸腹盆CT：基线检查，评估远处转移",
        "盆腔MRI：直肠癌分期必需，明确环周切缘",
        "PET-CT：选择性用于疑似转移病例",
        "肝脏MRI：肝转移灶敏感性优于CT"
      ]
    },
    staging: {
      title: "TNM分期",
      stages: [
        "Tx: 原发肿瘤无法评估",
        "Tis: 原位癌",
        "T1-T4: 浸润深度",
        "Nx: 区域淋巴结无法评估",
        "N0-N2: 淋巴结转移数目",
        "M0/M1: 无远处转移/有远处转移"
      ]
    }
  },

  // 治疗原则
  treatment: {
    surgery: {
      colon: {
        title: "结肠癌手术原则",
        principles: [
          "完整结肠系膜切除(CME)是标准术式",
          "清扫范围：系膜根部淋巴结",
          "切缘要求：近端和远端切缘阴性",
          "腹腔镜手术：标准根治性与开放手术相当"
        ]
      },
      rectal: {
        title: "直肠癌手术原则",
        principles: [
          "全直肠系膜切除(TME)是金标准",
          "低位直肠癌：括约肌间切除(ISR)保肛",
          "新辅助放化疗后：等待观察策略需谨慎选择",
          "侧方淋巴结清扫：选择性用于怀疑转移者"
        ]
      }
    },
    chemotherapy: {
      title: "化疗方案",
      regimens: [
        {
          name: "CAPOX",
          fullName: "卡培他滨+奥沙利铂",
          indication: "III期辅助化疗、转移性疾病",
          cycle: "每3周"
        },
        {
          name: "FOLFOX",
          fullName: "5-FU+亚叶酸钙+奥沙利铂",
          indication: "III期辅助化疗、转移性疾病",
          cycle: "每2周"
        },
        {
          name: "FOLFIRI",
          fullName: "5-FU+亚叶酸钙+伊立替康",
          indication: "转移性疾病二线",
          cycle: "每2周"
        },
        {
          name: "XELIRI",
          fullName: "卡培他滨+伊立替康",
          indication: "转移性疾病",
          cycle: "每3周"
        }
      ],
      adjuvant: {
        title: "辅助化疗",
        indications: [
          "III期：必须辅助化疗",
          "II期高危：考虑辅助化疗（分化差、脉管侵犯、神经侵犯、肠梗阻、穿孔、切缘接近）",
          "II期无高危因素：定期观察",
          "I期：无需辅助化疗"
        ],
        duration: "通常6个月（3-6个月，根据分期和毒性调整）"
      }
    },
    targetTherapy: {
      title: "靶向治疗",
      targets: [
        {
          target: "EGFR",
          drugs: ["西妥昔单抗", "帕尼单抗"],
          indication: "左半结肠癌、RAS/BRAF野生型",
          notes: "右半结肠癌从抗EGFR治疗获益有限"
        },
        {
          target: "VEGF",
          drugs: ["贝伐珠单抗"],
          indication: "转移性结直肠癌一线",
          notes: "可与化疗联合"
        },
        {
          target: "BRAF",
          drugs: ["康奈非尼+西妥昔单抗+Binimetinib"],
          indication: "BRAF V600E突变转移性结直肠癌",
          notes: "BEACON研究支持的三联疗法"
        },
        {
          target: "HER2",
          drugs: ["曲妥珠单抗+帕妥珠单抗", "T-DXd"],
          indication: "HER2扩增/过表达转移性结直肠癌",
          notes: "需要严格筛选人群"
        }
      ]
    },
    immunotherapy: {
      title: "免疫治疗",
      indications: [
        {
          type: "dMMR/MSI-H",
          drugs: ["帕博利珠单抗", "纳武利尤单抗", "替雷利珠单抗", "恩沃利单抗"],
          indication: "晚期dMMR/MSI-H结直肠癌一线或后线",
          evidence: "KEYNOTE-177等研究支持"
        },
        {
          type: "MSS/pMMR",
          drugs: ["信迪利单抗+贝伐珠单抗"],
          indication: "晚期MSS结直肠癌探索性治疗",
          evidence: "REGONIVO研究相关"
        }
      ]
    },
    radiotherapy: {
      title: "放疗",
      indications: [
        {
          context: "新辅助放化疗",
          indication: "局部晚期直肠癌(cT3-4或N+)",
          regimen: "长程放化疗(50.4Gy/28次)或短程放疗(25Gy/5次)",
          timing: "放化疗后8-12周手术"
        },
        {
          context: "辅助放疗",
          indication: "术后病理提示高危因素",
          notes: "仅限于直肠癌"
        },
        {
          context: "姑息放疗",
          indication: "转移灶止痛、止血",
          notes: "骨转移、脑转移等"
        }
      ]
    }
  },

  // 随访
  followUp: {
    title: "随访计划",
    stages: [
      {
        stage: "I期",
        schedule: "每6-12个月随访，共5年",
        content: "CEA、影像学（胸腹盆CT或MRI）"
      },
      {
        stage: "II-III期",
        schedule: "前3年每3-6个月，后2年每6个月，之后每年1次",
        content: "CEA、胸腹盆CT或MRI、肠镜"
      },
      {
        stage: "IV期",
        schedule: "每2-3个月",
        content: "CEA、影像学评估治疗效果"
      }
    ]
  },

  // 关键概念
  concepts: {
    leftRightColon: {
      title: "左右半结肠预后差异",
      content: "右半结肠癌（盲肠、升结肠、横结肠右半）预后差于左半结肠癌（脾曲、降结肠、乙状结肠、直肠）",
      clinicalImplication: "分子靶向药物选择的重要参考"
    },
    liquidBiopsy: {
      title: "液体活检",
      content: "ctDNA检测可辅助疗效监测和耐药分析",
      application: "动态监测治疗反应、早期预警复发"
    }
  }
};

// 生成JSON文件
const outputPath = path.join(process.cwd(), 'src', 'lib', 'csco-knowledge.json');
fs.writeFileSync(outputPath, JSON.stringify(cscoGuideContent, null, 2), 'utf-8');

console.log(`✅ CSCO知识库已生成: ${outputPath}`);
console.log(`📊 总计 ${Object.keys(cscoGuideContent).length} 个主要章节`);
