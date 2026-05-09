// Script to sync all hospital QR codes from Coze knowledge base to S3
// Usage: npx tsx scripts/sync-qrcodes.ts

const HOSPITALS = [
  { name: "北大肿瘤", keywords: ["北大肿瘤", "北京大学肿瘤医院", "北京肿瘤医院", "北肿"], url: "" },
  { name: "中国医学科学院肿瘤医院", keywords: ["东肿", "中国医学科学院肿瘤医院"], url: "" },
  { name: "北京大学第一医院", keywords: ["北京大学第一医院", "北大一院", "北大第一医院"], url: "" },
  { name: "北京大学人民医院", keywords: ["北京大学人民医院", "北大人民医院"], url: "" },
  { name: "北京协和医院", keywords: ["北京协和医院", "协和医院", "协和"], url: "" },
  { name: "中日友好医院", keywords: ["中日友好医院", "中日医院"], url: "" },
  { name: "北京大学第三医院", keywords: ["北京大学第三医院", "北医三院", "北大三院"], url: "" },
  { name: "首都医科大学北京友谊医院", keywords: ["北京友谊医院", "友谊医院"], url: "" },
  { name: "北京清华长庚医院", keywords: ["清华长庚", "北京清华长庚医院"], url: "" },
  { name: "解放军总医院", keywords: ["解放军总医院", "301医院"], url: "" },
  { name: "北京西苑医院", keywords: ["西苑医院", "北京西苑医院"], url: "" },
  { name: "上海复旦大学附属肿瘤医院", keywords: ["复旦肿瘤", "复旦大学附属肿瘤医院", "上海肿瘤医院"], url: "" },
  { name: "上海市胸科医院", keywords: ["上海胸科医院", "上海市胸科医院"], url: "" },
  { name: "浙江省肿瘤医院", keywords: ["浙江省肿瘤医院"], url: "" },
  { name: "浙江大学医学院附属第二医院", keywords: ["浙二", "浙江大学医学院附属第二医院", "浙医二院"], url: "" },
  { name: "广东省人民医院", keywords: ["广东省人民医院"], url: "" },
  { name: "广州中山大学附属肿瘤医院", keywords: ["中山肿瘤", "中山大学附属肿瘤医院", "中大肿瘤"], url: "" },
  { name: "陕西省肿瘤医院", keywords: ["陕西省肿瘤医院"], url: "" },
  { name: "西安交通大学第一附属医院", keywords: ["西安交大一附院", "西安交通大学第一附属医院"], url: "" },
  { name: "四川省肿瘤医院", keywords: ["四川省肿瘤医院"], url: "" },
  { name: "河南省肿瘤医院", keywords: ["河南省肿瘤医院"], url: "" },
  { name: "广西医科大附属肿瘤医院", keywords: ["广西医科大附属肿瘤医院", "广西肿瘤医院"], url: "" },
  { name: "华中科技大学同济医院", keywords: ["同济医院", "华中科技大学同济医院", "武汉同济"], url: "" },
  { name: "江苏省肿瘤医院", keywords: ["江苏省肿瘤医院"], url: "" },
  { name: "江苏省人民医院", keywords: ["江苏省人民医院", "南医大一附院"], url: "" },
  { name: "山西省肿瘤医院", keywords: ["山西省肿瘤医院"], url: "" },
  { name: "山东省肿瘤医院", keywords: ["山东省肿瘤医院"], url: "" },
  { name: "青岛大学附属医院", keywords: ["青岛大学附属医院"], url: "" },
  { name: "新疆医科大学附属肿瘤医院", keywords: ["新疆医科大学附属肿瘤医院", "新疆肿瘤医院"], url: "" },
  { name: "云南省肿瘤医院", keywords: ["云南省肿瘤医院"], url: "" },
  { name: "贵州省肿瘤医院", keywords: ["贵州省肿瘤医院"], url: "" },
  { name: "武汉大学中南医院", keywords: ["武汉大学中南医院", "中南医院"], url: "" },
  { name: "天津医科大学肿瘤医院", keywords: ["天津医科大学肿瘤医院", "天津肿瘤医院"], url: "" },
  { name: "重庆大学附属肿瘤医院", keywords: ["重庆大学附属肿瘤医院", "重庆肿瘤医院"], url: "" },
  { name: "湖北省肿瘤医院", keywords: ["湖北省肿瘤医院"], url: "" },
  { name: "福建省肿瘤医院", keywords: ["福建省肿瘤医院"], url: "" },
  { name: "南方医科大学南方医院", keywords: ["南方医院", "南方医科大学南方医院"], url: "" },
  { name: "陆军军医大学西南医院", keywords: ["西南医院", "陆军军医大学西南医院"], url: "" },
  { name: "辽宁省肿瘤医院", keywords: ["辽宁省肿瘤医院"], url: "" },
  { name: "安徽省肿瘤医院", keywords: ["安徽省肿瘤医院"], url: "" },
  { name: "甘肃省肿瘤医院", keywords: ["甘肃省肿瘤医院"], url: "" },
  { name: "湖南省肿瘤医院", keywords: ["湖南省肿瘤医院"], url: "" },
  { name: "吉林省肿瘤医院", keywords: ["吉林省肿瘤医院"], url: "" },
];

async function syncQRCodes() {
  const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  const apiUrl = `${baseUrl}/api/hospital-qrcodes`;
  
  // Filter hospitals that have URLs
  const hospitalsWithUrls = HOSPITALS.filter(h => h.url);
  
  if (hospitalsWithUrls.length === 0) {
    console.log('No hospital URLs found. Please update the url field for each hospital.');
    console.log('You need to get fresh URLs from Coze knowledge base.');
    return;
  }
  
  console.log(`Syncing ${hospitalsWithUrls.length} hospital QR codes...`);
  
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitals: hospitalsWithUrls }),
  });
  
  const result = await response.json();
  console.log('Sync results:', JSON.stringify(result, null, 2));
}

syncQRCodes().catch(console.error);
