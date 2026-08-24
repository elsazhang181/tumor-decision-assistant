# Coze 工作流校验节点 - 完整配置步骤

## 前置条件

1. 已登录 Coze 平台
2. 已进入「健康就医决策助手」Bot 编辑页面
3. 已关联知识库（如「医保相关」、「肿瘤治疗指南」等）

## 第一步：创建工作流

1. 在 Bot 编辑页面，点击左侧菜单的「工作流」
2. 点击「+ 创建工作流」
3. 工作流名称：`健康就医问答流程`
4. 点击「创建」

## 第二步：添加知识库检索节点

1. 在工作流画布中，点击「+」添加节点
2. 选择「知识库检索」节点
3. 节点名称：`检索知识库`
4. 配置：
   - 知识库：选择已关联的知识库（如「医保相关」）
   - 查询内容：选择「用户输入」或 `{{input}}`
   - 返回条数：5-10 条
5. 点击「保存」

## 第三步：添加 LLM 节点

1. 点击「+」添加节点
2. 选择「大模型」节点
3. 节点名称：`生成回答`
4. 配置：
   - 模型：选择 GLM-4.7 或其他模型
   - 系统提示词：粘贴 `assets/coze-bot-prompt.md` 的内容
   - 用户输入：选择「用户输入」或 `{{input}}`
   - 知识库上下文：选择上一步「检索知识库」节点的输出 `chunks`
5. 点击「保存」

## 第四步：添加代码校验节点

1. 点击「+」添加节点
2. 选择「代码」节点
3. 节点名称：`引用校验`
4. 语言选择：`Python`

### 4.1 配置输入参数

点击「添加输入参数」，添加以下两个参数：

| 参数名 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| `answer` | String | 无 | LLM 生成的回答 |
| `retrieved_chunks` | Array | 无 | 检索到的知识库片段 |

**参数来源设置**：
- `answer`：选择「引用上游节点」→ 选择「生成回答」节点 → 选择输出字段 `output` 或 `answer`
- `retrieved_chunks`：选择「引用上游节点」→ 选择「检索知识库」节点 → 选择输出字段 `chunks` 或 `results`

### 4.2 粘贴代码

将以下完整代码粘贴到代码编辑器中：

```python
import re
from typing import Tuple, List, Dict, Any

def verify_citation(answer: str, retrieved_chunks: List[str]) -> Tuple[bool, str, set]:
    """
    校验回答中的数字是否都出现在检索原文中
    
    参数:
        answer: Bot 生成的回答文本
        retrieved_chunks: 检索到的知识库片段列表
    
    返回:
        (是否通过校验，校验消息，可疑数字集合)
    """
    # 提取回答中的所有数字（包括带单位的：万、元、%）
    # 匹配模式：数字 + 可选的小数 + 可选的单位
    numbers_in_answer = set(re.findall(r'\d+\.?\d*\s*[万元%]?', answer))
    
    # 提取所有检索片段中的数字
    numbers_in_chunks = set()
    for chunk in retrieved_chunks:
        if isinstance(chunk, str):
            numbers_in_chunks.update(re.findall(r'\d+\.?\d*\s*[万元%]?', chunk))
        elif isinstance(chunk, dict):
            # 如果 chunk 是字典，提取 content 字段
            content = chunk.get('content', '')
            numbers_in_chunks.update(re.findall(r'\d+\.?\d*\s*[万元%]?', content))
    
    # 找出回答中有但原文中没有的数字
    suspicious = numbers_in_answer - numbers_in_chunks
    
    if suspicious:
        return False, f"回答中以下数字未在引用来源中找到：{suspicious}", suspicious
    
    return True, "校验通过：所有数字均在引用来源中找到", set()


def main(answer: str, retrieved_chunks: List[str]) -> Dict[str, Any]:
    """
    Coze 工作流代码节点主函数
    
    参数:
        answer: LLM 生成的回答
        retrieved_chunks: 检索到的知识库片段
    
    返回:
        包含校验结果和最终回答的字典
    """
    # 执行校验
    verified, message, suspicious_numbers = verify_citation(answer, retrieved_chunks)
    
    if verified:
        # 校验通过，返回原回答
        return {
            "verified": True,
            "message": message,
            "final_answer": answer,
            "suspicious_numbers": []
        }
    else:
        # 校验失败，返回备用回答
        fallback = "当前资料无法确认该信息的具体数值，建议通过以下途径核实：\n\n1. **国家医保服务平台 APP**：查询最新医保政策\n2. **当地医保局官网/公众号**：查看本地具体政策\n3. **拨打 12393 医保热线**：直接咨询当地医保部门\n\n以上信息仅供参考，不能替代专业医生的诊断和治疗建议。"
        
        return {
            "verified": False,
            "message": message,
            "final_answer": fallback,
            "suspicious_numbers": list(suspicious_numbers)
        }
```

### 4.3 配置输出参数

点击「添加输出参数」，添加以下参数：

| 参数名 | 类型 | 说明 |
|-------|------|------|
| `verified` | Boolean | 是否通过校验 |
| `message` | String | 校验结果消息 |
| `final_answer` | String | 最终回答 |
| `suspicious_numbers` | Array | 可疑数字列表（未通过校验时） |

### 4.4 保存代码节点

点击「保存」按钮。

## 第五步：添加输出节点

1. 点击「+」添加节点
2. 选择「输出」节点
3. 节点名称：`最终输出`
4. 配置：
   - 输出内容：选择「引用上游节点」→ 选择「引用校验」节点 → 选择输出字段 `final_answer`
5. 点击「保存」

## 第六步：连接节点

按照以下顺序连接节点：

```
[开始] → [检索知识库] → [生成回答] → [引用校验] → [最终输出] → [结束]
```

**具体操作**：
1. 将「开始」节点的输出连接到「检索知识库」节点的输入
2. 将「检索知识库」节点的输出连接到「生成回答」节点的输入（知识库上下文）
3. 将「生成回答」节点的输出连接到「引用校验」节点的输入（answer）
4. 将「检索知识库」节点的输出连接到「引用校验」节点的输入（retrieved_chunks）
5. 将「引用校验」节点的输出连接到「最终输出」节点

## 第七步：配置 Bot 使用工作流

1. 回到 Bot 编辑页面
2. 在「编排」区域，找到「工作流」部分
3. 点击「+ 添加工作流」
4. 选择刚创建的「健康就医问答流程」
5. 设置为默认工作流

## 第八步：测试验证

### 测试 1：简单问题
- 问题："你好"
- 预期：正常回复开场白

### 测试 2：知识库中有明确信息
- 问题："北京安宁疗护机构有哪些"
- 预期：正常回复，列出知识库中的机构

### 测试 3：数字校验（关键测试）
- 问题："南京职工医保报销比例和北京职工医保报销比例对比"
- 预期：
  - 如果知识库中有明确的对比数据，回复应该**逐字逐句复制**知识库原文
  - 如果知识库中没有明确数据，回复应该是："当前资料无法确认该信息的具体数值，建议通过以下途径核实..."

## 常见问题

### Q1: 代码节点报错 "ModuleNotFoundError: No module named 'xxx'"
**解决**：Coze 代码节点只支持标准库，不要导入第三方库。当前代码只使用了 `re` 和 `typing`，都是标准库。

### Q2: 校验节点总是返回失败
**可能原因**：
1. 知识库未正确关联
2. 检索节点未返回有效内容
3. 参数名称不匹配

**排查步骤**：
1. 检查「检索知识库」节点的输出，确认有内容返回
2. 检查参数名称是否与代码中的参数名一致
3. 在代码中添加调试输出（如果支持）

### Q3: 校验节点总是返回成功
**可能原因**：
1. 知识库内容太丰富，包含了所有数字
2. 正则表达式匹配不准确

**排查步骤**：
1. 检查知识库中是否真的有相关数据
2. 测试一个明显编造的问题，看是否能检测到

### Q4: 工作流执行超时
**解决**：
1. 减少知识库检索返回条数（从 10 改为 5）
2. 简化 LLM 提示词
3. 检查代码是否有死循环

## 优化建议

### 1. 添加日志记录
在代码节点中添加日志，方便调试：

```python
def main(answer: str, retrieved_chunks: List[str]) -> Dict[str, Any]:
    # 调试日志
    print(f"回答长度：{len(answer)} 字符")
    print(f"检索片段数量：{len(retrieved_chunks)}")
    
    # ... 校验逻辑 ...
    
    return result
```

### 2. 添加置信度评分
除了简单的通过/失败，可以添加置信度评分：

```python
def calculate_confidence(answer: str, retrieved_chunks: List[str]) -> float:
    """计算回答的置信度（0-1）"""
    numbers_in_answer = set(re.findall(r'\d+\.?\d*\s*[万元%]?', answer))
    if not numbers_in_answer:
        return 1.0  # 没有数字，默认高置信度
    
    numbers_in_chunks = set()
    for chunk in retrieved_chunks:
        numbers_in_chunks.update(re.findall(r'\d+\.?\d*\s*[万元%]?', chunk))
    
    verified_count = len(numbers_in_answer & numbers_in_chunks)
    return verified_count / len(numbers_in_answer)
```

### 3. 分级处理
根据置信度分级处理：

```python
if confidence >= 0.9:
    # 高置信度，直接返回
    final_answer = answer
elif confidence >= 0.5:
    # 中等置信度，添加免责声明
    final_answer = answer + "\n\n注意：以上信息仅供参考，请以官方数据为准。"
else:
    # 低置信度，返回备用回答
    final_answer = fallback
```

## 预期效果

配置完成后，Bot 的回复应该更加准确和可靠：

**之前（可能编造数据）**：
```
南京门诊：社区医院起付线 200 元，报销比例 80%
北京门诊：社区医院无起付线，报销比例 90%
```

**之后（校验失败时）**：
```
当前资料无法确认该信息的具体数值，建议通过以下途径核实：

1. **国家医保服务平台 APP**：查询最新医保政策
2. **当地医保局官网/公众号**：查看本地具体政策
3. **拨打 12393 医保热线**：直接咨询当地医保部门

以上信息仅供参考，不能替代专业医生的诊断和治疗建议。
```

**之后（校验通过时）**：
```
根据知识库信息：
[原样复制知识库原文，数字完全一致]

【依据】
[1] 医保相关文件（知识库文件，无外部链接）
```
