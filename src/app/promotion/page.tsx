'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const APP_URL = 'https://116bfa2a-8982-46ac-b0ee-51f2cb6b1139.dev.coze.site';

const PROMOTION_TEXT = `🏥 肿瘤就医决策助手

📋 智能就医决策辅助工具

✅ 症状自查 - 系统评估，识别危险信号
✅ 科室推荐 - 匹配权威医院和专家
✅ 治疗相关 - 了解治疗流程和注意事项
✅ 就医指导 - 异地就医、医保报销指南

🔗 访问链接：
${APP_URL}

⚠️ 本助手仅提供就医决策辅助信息，不提供诊疗建议，具体治疗请遵医嘱。`;

export default function PromotionPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qrcode')?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = '肿瘤就医决策助手_二维码.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleDownloadPoster = () => {
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 800;
    posterCanvas.height = 1100;
    const ctx = posterCanvas.getContext('2d');
    
    if (ctx) {
      // 背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 1100);
      
      // 渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 800, 300);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 300);
      
      // 标题
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('肿瘤就医决策助手', 400, 80);
      
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('智能就医决策辅助工具', 400, 130);
      
      // 二维码
      const qrCanvas = document.getElementById('qrcode')?.querySelector('canvas');
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, 275, 200, 250, 250);
      }
      
      // 链接文字
      ctx.fillStyle = '#374151';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('扫码或访问链接', 400, 520);
      
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(APP_URL, 400, 560);
      
      // 功能介绍
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('功能特点', 60, 640);
      
      const features = [
        '✅ 症状自查 - 系统评估，识别危险信号',
        '✅ 科室推荐 - 匹配权威医院和专家',
        '✅ 治疗相关 - 了解治疗流程和注意事项',
        '✅ 就医指导 - 异地就医、医保报销指南',
      ];
      
      ctx.font = '18px Arial, sans-serif';
      ctx.fillStyle = '#4b5563';
      features.forEach((text, i) => {
        ctx.fillText(text, 60, 700 + i * 45);
      });
      
      // 底部声明
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ 本助手仅提供就医决策辅助信息，不提供诊疗建议', 400, 980);
      ctx.fillText('具体治疗请遵医嘱', 400, 1010);
      ctx.fillText('如有紧急情况，请立即就医或拨打急救电话', 400, 1040);
      
      // 下载海报
      const link = document.createElement('a');
      link.download = '肿瘤就医决策助手_推广海报.png';
      link.href = posterCanvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            肿瘤就医决策助手 - 推广素材
          </h1>
          <p className="text-gray-600">生成二维码和推广文案，方便分享</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 二维码下载 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-center">下载二维码</h2>
              
              <div className="flex justify-center mb-6">
                <div id="qrcode" className="bg-white p-4 rounded-xl shadow-lg">
                  <QRCodeSVG
                    value={APP_URL}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleDownloadQR}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载二维码图片
                </Button>
                
                <Button 
                  onClick={handleDownloadPoster}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载完整推广海报
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 推广文案 */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-center">推广文案</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
{PROMOTION_TEXT}
                </pre>
              </div>
              
              <Button 
                onClick={handleCopy}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制！
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制链接
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 海报预览 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">海报预览</h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              完整推广海报尺寸：800 x 1100 像素，适合打印和线上推广
            </p>
            <div className="flex justify-center">
              <div 
                className="bg-white rounded-xl shadow-lg overflow-hidden"
                style={{ width: 320, height: 440 }}
              >
                {/* 渐变背景 */}
                <div 
                  className="h-[100px] flex flex-col items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                >
                  <div className="text-lg font-bold">肿瘤就医决策助手</div>
                  <div className="text-xs opacity-80">智能就医决策辅助工具</div>
                </div>
                {/* 二维码 */}
                <div className="flex justify-center py-4 bg-white">
                  <div className="p-2 shadow-md rounded-lg">
                    <QRCodeSVG
                      value={APP_URL}
                      size={120}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>
                {/* 链接 */}
                <div className="text-center px-4">
                  <div className="text-[10px] text-gray-500 mb-1">扫码或访问链接</div>
                  <div className="text-[9px] text-blue-500 break-all leading-tight">
                    {APP_URL}
                  </div>
                </div>
                {/* 功能 */}
                <div className="px-4 py-3 text-[10px] text-gray-600 space-y-1">
                  <div className="font-semibold text-gray-800">功能特点</div>
                  <div>✅ 症状自查 - 系统评估</div>
                  <div>✅ 科室推荐 - 权威医院</div>
                  <div>✅ 治疗相关 - 流程了解</div>
                  <div>✅ 就医指导 - 医保指南</div>
                </div>
                {/* 声明 */}
                <div className="px-4 py-2 bg-gray-50 text-[8px] text-gray-400 text-center">
                  ⚠️ 仅提供就医决策辅助，具体治疗请遵医嘱
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 分享提示 */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">分享方式</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>微信好友/群聊</strong>：直接发送链接或二维码图片</p>
              <p>• <strong>朋友圈</strong>：长按二维码图片发送</p>
              <p>• <strong>公众号</strong>：嵌入链接或插入二维码</p>
              <p>• <strong>线下推广</strong>：打印海报或易拉宝</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
