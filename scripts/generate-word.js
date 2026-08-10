const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

// 读取 Markdown 文件
const mdContent = fs.readFileSync(path.join(__dirname, '..', 'public', '健康就医决策助手 - 设计理念与部署文档.md'), 'utf-8');

// 简单的 Markdown 转 Word 函数
function parseMarkdown(md) {
  const lines = md.split('\n');
  const children = [];
  
  for (let line of lines) {
    // 标题
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.slice(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.slice(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.slice(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }));
    } else if (line.startsWith('#### ')) {
      children.push(new Paragraph({
        text: line.slice(5),
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 150, after: 80 }
      }));
    }
    // 表格行
    else if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      children.push(new Paragraph({
        children: [new TextRun({ text: cells.join(' | '), size: 20 })],
        spacing: { before: 50, after: 50 }
      }));
    }
    // 分隔线
    else if (line.startsWith('---')) {
      children.push(new Paragraph({
        text: '────────────────────────────────────────',
        spacing: { before: 200, after: 200 }
      }));
    }
    // 列表项
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({
        text: '• ' + line.slice(2),
        spacing: { before: 50, after: 50 },
        indent: { left: 400 }
      }));
    }
    // 代码块
    else if (line.startsWith('```')) {
      // 跳过代码块标记
    }
    // 普通文本
    else if (line.trim()) {
      children.push(new Paragraph({
        text: line,
        spacing: { before: 50, after: 50 }
      }));
    }
  }
  
  return children;
}

const doc = new Document({
  sections: [{
    properties: {},
    children: parseMarkdown(mdContent)
  }]
});

// 生成 Word 文件
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(path.join(__dirname, '..', 'public', '健康就医决策助手 - 设计理念与部署文档.docx'), buffer);
  console.log('Word 文档已生成：public/健康就医决策助手 - 设计理念与部署文档.docx');
});
