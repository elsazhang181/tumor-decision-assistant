import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 医院二维码原始数据（从知识库获取的签名URL，可能已过期）
const HOSPITAL_QR_SOURCE: Array<{ name: string; aliases: string[]; url: string }> = [
  { name: '北大肿瘤', aliases: ['北大肿瘤', '北京肿瘤医院', '北肿'], url: 'https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926418409797_IhVSTY9ND0.jpg?x-expires=1778213441&x-signature=eeJYC60Z32eozdC%2BVuJTmii0qUU%3D' },
  { name: '中国医学科学院肿瘤医院', aliases: ['中国医学科学院肿瘤医院', '东肿', '医科院肿瘤'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778210854296801482_cZrn56WFT3.jpeg?x-expires=1778214484&x-signature=TurOvh4p7w3wbqX5HKW6CCIjFGk%3D' },
  { name: '北京大学第一医院', aliases: ['北京大学第一医院', '北大一院', '北大第一医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778211152153706074_Pis4ufFIZV.jpg?x-expires=1778214768&x-signature=5g%2Fdh4MhZjq5KAK26O4l1inIKas%3D' },
  { name: '北京大学人民医院', aliases: ['北京大学人民医院', '北大人民', '北大人民医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926417699613_tmBHQsCWrQ.png?x-expires=1777387632&x-signature=avCooGVtjWenWaWyYElWPGg6AOE%3D' },
  { name: '北京协和医院', aliases: ['北京协和医院', '协和医院', '协和'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777827830112779473_Ehy4efi45v.jpg?x-expires=1777831468&x-signature=0qfWWgrkIv%2BtxI8IZVU%2BYCy9oQA%3D' },
  { name: '中日友好医院', aliases: ['中日友好医院', '中日医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778211339328889736_OXnUVeVZdV.jpeg?x-expires=1778214941&x-signature=L64IoXSm97texIQQoiavfGlafIc%3D' },
  { name: '北京大学第三医院', aliases: ['北京大学第三医院', '北医三院', '北大三院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778211477721455083_Yxr5vBQ6u3.png?x-expires=1778215080&x-signature=scwv6RbVL%2FjqU05G%2BTErslvD%2BBw%3D' },
  { name: '首都医科大学北京友谊医院', aliases: ['北京友谊医院', '友谊医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778212151446066391_wevWtr0xNw.png?x-expires=1778215772&x-signature=YuBVh9KED5YRFFNTv%2Fe%2FEfm9Wy0%3D' },
  { name: '北京清华长庚医院', aliases: ['清华长庚', '北京清华长庚医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778212248945030870_uOEwsWJXNW.jpeg?x-expires=1778215872&x-signature=dbi3rF6UPW8Oed4Zq6ieB60v7QE%3D' },
  { name: '解放军总医院', aliases: ['解放军总医院', '301医院', '三零一'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277928777435209_qOvx46w0b5.png?x-expires=1778213441&x-signature=Az7O%2BzA7D3YO4tBnnJtXYYFIHiA%3D' },
  { name: '北京西苑医院', aliases: ['西苑医院', '北京西苑医院'], url: 'https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778210266013039997_48wyxVtPfO.jpg?x-expires=1778213873&x-signature=hsiyCA5i2EUEui7Cof7nhtRAs5I%3D' },
  { name: '上海复旦大学附属肿瘤医院', aliases: ['复旦肿瘤', '复旦大学附属肿瘤医院', '上海肿瘤医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778164302220977327_PXPWoTiu3B.jpg?x-expires=1778168040&x-signature=PRP9FcOe288z3H3Iw9t6o30nG08%3D' },
  { name: '上海市胸科医院', aliases: ['上海市胸科医院', '上海胸科医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778164332112611666_7FhHVX4CUx.jpg?x-expires=1778168040&x-signature=6Z2%2B%2B0%2FOk9sSWmboyet7My8xBWI%3D' },
  { name: '浙江省肿瘤医院', aliases: ['浙江省肿瘤医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778164282679812326_3JUh9vu2vg.jpg?x-expires=1778168040&x-signature=xsFEkdcDfjhPG%2Fw%2FBJxUNWpc7jY%3D' },
  { name: '浙江大学医学院附属第二医院', aliases: ['浙二', '浙医二院', '浙江大学医学院附属第二医院'], url: 'https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926807922476_7dJZmUwO2V.jpeg?x-expires=1778168040&x-signature=TQJT1P%2BrzByuOkbcnShR6dZN2p8%3D' },
  { name: '广东省人民医院', aliases: ['广东省人民医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777827864842707237_tghEyoq2pY.jpg?x-expires=1778168040&x-signature=pukupX8zUgICwI6sjMOhVboBNmc%3D' },
  { name: '广州中山大学附属肿瘤医院', aliases: ['中山肿瘤', '中山大学附属肿瘤医院', '中大肿瘤'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277928606018150_92mqZxxP44.jpeg?x-expires=1778211604&x-signature=1K5Ql3YXayfwfblg3FB17PbQcxM%3D' },
  { name: '陕西省肿瘤医院', aliases: ['陕西省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926946279846_GtFdy6FTwu.jpeg?x-expires=1778211604&x-signature=5EOT%2FRyVvtGve9e9LZmNb5eF3Ec%3D' },
  { name: '西安交通大学第一附属医院', aliases: ['西安交大一附院', '西安交通大学第一附属医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927281382124_5ouWwgEbGD.png?x-expires=1778168040&x-signature=f9t0ypx0V8ns0QCIATMNheTYN0o%3D' },
  { name: '四川省肿瘤医院', aliases: ['四川省肿瘤医院'], url: 'https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777812742268111486_oIN9wUWqCX.png?x-expires=1778168040&x-signature=cJul74TGUcmCael8g3r37%2B%2FIf64%3D' },
  { name: '河南省肿瘤医院', aliases: ['河南省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778164249249912402_YCbVh0DrUN.jpg?x-expires=1778168040&x-signature=LBh1vCjabc3NwJuVV82Dad%2BJYo0%3D' },
  { name: '广西医科大附属肿瘤医院', aliases: ['广西医科大附属肿瘤医院', '广西肿瘤医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277929116891617_Ti76TxX0v4.png?x-expires=1777387632&x-signature=aRJbH8Kh9S%2B74foIRK96aKvCUn0%3D' },
  { name: '华中科技大学同济医院', aliases: ['同济医院', '华中科技大学同济医院', '武汉同济'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277928770758192_UJSQpP8pnq.png?x-expires=1777387632&x-signature=4SvI7ZztX7Fkh8I74Cn%2B0%2FGGWUc%3D' },
  { name: '江苏省肿瘤医院', aliases: ['江苏省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777812376423666803_yETFWUOvep.png?x-expires=1777815983&x-signature=SscimbbjWwaOOrDYqyNEYcy%2BUPY%3D' },
  { name: '江苏省人民医院', aliases: ['江苏省人民医院', '南医大一附院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277928202745062_CFtHxvVTbI.jpeg?x-expires=1778211604&x-signature=YpKlr1cSTTV%2BiOEGPYk6PgwlcBY%3D' },
  { name: '山西省肿瘤医院', aliases: ['山西省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778164386312486353_sBfYxRSVym.jpg?x-expires=1778168040&x-signature=q%2BNQxnQ%2Fo5v0Gqk54QiU%2BNUdDoE%3D' },
  { name: '山东省肿瘤医院', aliases: ['山东省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1778164339943365712_Suddbu0JVv.jpg?x-expires=1778168040&x-signature=W6hFp9xiDrBIrNOaJ%2BvOl3SOlNM%3D' },
  { name: '青岛大学附属医院', aliases: ['青岛大学附属医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926577952826_sFFtXtyGZW.png?x-expires=1778211604&x-signature=s687RqzFzWiq6pTbZBDYZc1KKtY%3D' },
  { name: '新疆医科大学附属肿瘤医院', aliases: ['新疆肿瘤医院', '新疆医科大学附属肿瘤医院'], url: 'https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927486558307_W76JHTVUZu.jpeg?x-expires=1778168040&x-signature=PTEoUOpCMCfascDesN77vHSWFds%3D' },
  { name: '云南省肿瘤医院', aliases: ['云南省肿瘤医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927979005514_UqOdfUiO9U.png?x-expires=1778168040&x-signature=MDbJjZitD1DZUht4591c0LNUYnA%3D' },
  { name: '贵州省肿瘤医院', aliases: ['贵州省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927024408127_JNXT6Ed0VU.jpeg?x-expires=1778211604&x-signature=OlOxEqSSL9cX7hx9HtidVbNrcZQ%3D' },
  { name: '武汉大学中南医院', aliases: ['武汉大学中南医院', '中南医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277929603224414_8U6ife6ZuB.png?x-expires=1778168040&x-signature=TIWsJj3AsJLGSZza9%2F1iMuaM1M8%3D' },
  { name: '天津医科大学肿瘤医院', aliases: ['天津肿瘤医院', '天津医科大学肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926787358673_DOs7wmHt9U.jpeg?x-expires=1778168040&x-signature=QdHSj%2B5ai%2FNDHkLpRDwAcRUwATk%3D' },
  { name: '重庆大学附属肿瘤医院', aliases: ['重庆肿瘤医院', '重庆大学附属肿瘤医院'], url: 'https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926449429533_g6cFxsmpds.jpeg?x-expires=1778211604&x-signature=BHkQgwS8PUqvmBSxE9vdRXh0F8g%3D' },
  { name: '湖北省肿瘤医院', aliases: ['湖北省肿瘤医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277928575815028_UTcDONw0Nx.jpeg?x-expires=1778213441&x-signature=6r47yqvcsBHr3LkVgxDWDHMRC9A%3D' },
  { name: '福建省肿瘤医院', aliases: ['福建省肿瘤医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277928766663485_97oXsPXPhW.jpeg?x-expires=1778211604&x-signature=sAuIvyD8Hz2Fgg53mbrtZxdYUdw%3D' },
  { name: '南方医科大学南方医院', aliases: ['南方医院', '南方医科大学南方医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927890367860_2nDObuXUvn.jpeg?x-expires=1778211604&x-signature=oQG5tnYJfvHl9BiakrO2mNBhGmk%3D' },
  { name: '陆军军医大学西南医院', aliases: ['西南医院', '陆军军医大学西南医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927889574777_2CT8ptpcgX.jpeg?x-expires=1778213441&x-signature=Ru0JapZ4I7gULJ8zt7FNQ8frKUM%3D' },
  { name: '辽宁省肿瘤医院', aliases: ['辽宁省肿瘤医院'], url: 'https://lf6-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277929504737264_5SiBoyTw0R.png?x-expires=1778213441&x-signature=CSoVzU0AUdWsUVqwRL%2BV3e%2F83DY%3D' },
  { name: '安徽省肿瘤医院', aliases: ['安徽省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277926419999687_uRIUqTxmG0.jpeg?x-expires=1778213441&x-signature=lExQWf2dCCpLYlQaq%2Bvl4mxJ3kE%3D' },
  { name: '甘肃省肿瘤医院', aliases: ['甘肃省肿瘤医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927599609979_xuxUxsYUco.jpeg?x-expires=1778213441&x-signature=i8WuKVZKAhtymZis3VTvpF9cfJ8%3D' },
  { name: '湖南省肿瘤医院', aliases: ['湖南省肿瘤医院'], url: 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927161063022_HFEorgm4qV.jpeg?x-expires=1778213441&x-signature=bbIQIW5yQBUSM1t2mWiFXaTq2Bs%3D' },
  { name: '吉林省肿瘤医院', aliases: ['吉林省肿瘤医院'], url: 'https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_DATASET/1118647974625609_1777277927829596072_qI6NX3H7TV.png?x-expires=1778213441&x-signature=870%2F4g8IHSaGaJR735xAIJ7fQuY%3D' },
];

// 内存缓存：医院名 -> S3 key
let keyMappingCache: Record<string, string> | null = null;

function getStorage(): S3Storage {
  return new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: '',
    secretKey: '',
    bucketName: process.env.COZE_BUCKET_NAME,
    region: 'cn-beijing',
  });
}

// 从文本中匹配医院
function matchHospital(text: string): Array<{ name: string; aliases: string[]; url: string }> {
  const matches: Array<{ name: string; aliases: string[]; url: string }> = [];
  for (const hospital of HOSPITAL_QR_SOURCE) {
    for (const alias of hospital.aliases) {
      if (text.includes(alias)) {
        if (!matches.find(m => m.name === hospital.name)) {
          matches.push(hospital);
        }
        break;
      }
    }
  }
  return matches;
}

// GET: 根据文本匹配医院，返回二维码签名URL
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text') || '';

    if (!text) {
      return NextResponse.json({ hospitals: [] });
    }

    const matchedHospitals = matchHospital(text);
    if (matchedHospitals.length === 0) {
      return NextResponse.json({ hospitals: [] });
    }

    const storage = getStorage();

    // 初始化或加载 key mapping
    if (!keyMappingCache) {
      keyMappingCache = {};
    }

    const results: Array<{ name: string; aliases: string[]; qrCodeUrl: string }> = [];

    for (const hospital of matchedHospitals) {
      // 如果已有缓存的 key，直接生成签名URL
      if (keyMappingCache[hospital.name]) {
        try {
          const url = await storage.generatePresignedUrl({
            key: keyMappingCache[hospital.name],
            expireTime: 86400, // 1天有效期
          });
          results.push({ name: hospital.name, aliases: hospital.aliases, qrCodeUrl: url });
          continue;
        } catch {
          // key失效，重新上传
          delete keyMappingCache[hospital.name];
        }
      }

      // 尝试从原始URL下载并上传到S3
      try {
        const s3Key = await storage.uploadFromUrl({
          url: hospital.url,
          timeout: 30000,
        });
        keyMappingCache[hospital.name] = s3Key;

        const url = await storage.generatePresignedUrl({
          key: s3Key,
          expireTime: 86400,
        });
        results.push({ name: hospital.name, aliases: hospital.aliases, qrCodeUrl: url });
      } catch (err) {
        console.error(`Failed to upload QR code for ${hospital.name}:`, err);
        // 降级：直接使用原始URL（可能过期）
        results.push({ name: hospital.name, aliases: hospital.aliases, qrCodeUrl: hospital.url });
      }
    }

    return NextResponse.json({ hospitals: results });
  } catch (error) {
    console.error('Error in hospital-qrcodes API:', error);
    return NextResponse.json({ error: 'Failed to get hospital QR codes' }, { status: 500 });
  }
}

// POST: 批量同步所有二维码到S3
export async function POST() {
  try {
    const storage = getStorage();
    if (!keyMappingCache) {
      keyMappingCache = {};
    }

    const results: Array<{ name: string; status: string; key?: string; error?: string }> = [];

    for (const hospital of HOSPITAL_QR_SOURCE) {
      try {
        // 如果已有缓存，跳过
        if (keyMappingCache[hospital.name]) {
          results.push({ name: hospital.name, status: 'cached', key: keyMappingCache[hospital.name] });
          continue;
        }

        const s3Key = await storage.uploadFromUrl({
          url: hospital.url,
          timeout: 30000,
        });
        keyMappingCache[hospital.name] = s3Key;
        results.push({ name: hospital.name, status: 'success', key: s3Key });
      } catch (err) {
        results.push({ name: hospital.name, status: 'failed', error: String(err) });
      }
    }

    return NextResponse.json({
      results,
      total: results.length,
      success: results.filter(r => r.status === 'success' || r.status === 'cached').length,
      failed: results.filter(r => r.status === 'failed').length,
    });
  } catch (error) {
    console.error('Error batch uploading QR codes:', error);
    return NextResponse.json({ error: 'Failed to batch upload' }, { status: 500 });
  }
}
