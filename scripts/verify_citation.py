"""
引用校验脚本 - 用于 Coze 工作流代码节点
验证回答中的数字是否都出现在检索的原文中
"""

import re
from typing import Tuple, List, Set


def verify_citation(answer: str, retrieved_chunks: List[str]) -> Tuple[bool, str]:
    """
    简单校验：回答中的数字是否都出现在 retrieval 原文中
    
    Args:
        answer: Bot 生成的回答文本
        retrieved_chunks: 检索到的知识库片段列表
    
    Returns:
        (是否通过校验，消息)
    """
    # 提取回答中的所有数字（包括带单位的）
    numbers_in_answer = set(re.findall(r'\d+\.?\d*\s*[万元%]?', answer))
    
    # 提取所有检索片段中的数字
    numbers_in_chunks = set()
    for chunk in retrieved_chunks:
        numbers_in_chunks.update(re.findall(r'\d+\.?\d*\s*[万元%]?', chunk))
    
    # 找出回答中有但原文中没有的数字
    suspicious = numbers_in_answer - numbers_in_chunks
    
    if suspicious:
        return False, f"回答中以下数字未在引用来源中找到：{suspicious}"
    
    return True, "ok"


def verify_citation_strict(answer: str, retrieved_chunks: List[str]) -> Tuple[bool, str]:
    """
    严格校验：不仅检查数字，还检查关键术语
    
    Args:
        answer: Bot 生成的回答文本
        retrieved_chunks: 检索到的知识库片段列表
    
    Returns:
        (是否通过校验，消息)
    """
    # 提取数字
    numbers_in_answer = set(re.findall(r'\d+\.?\d*\s*[万元%]?', answer))
    numbers_in_chunks = set()
    for chunk in retrieved_chunks:
        numbers_in_chunks.update(re.findall(r'\d+\.?\d*\s*[万元%]?', chunk))
    
    suspicious_numbers = numbers_in_answer - numbers_in_chunks
    
    # 提取关键术语（医院名称、政策名称等）
    # 这里可以根据需要扩展
    key_terms_pattern = r'(?:医院|社区卫生服务中心|报销比例|起付线|封顶线)'
    terms_in_answer = set(re.findall(key_terms_pattern, answer))
    terms_in_chunks = set()
    for chunk in retrieved_chunks:
        terms_in_chunks.update(re.findall(key_terms_pattern, chunk))
    
    suspicious_terms = terms_in_answer - terms_in_chunks
    
    issues = []
    if suspicious_numbers:
        issues.append(f"数字未在来源中找到：{suspicious_numbers}")
    if suspicious_terms:
        issues.append(f"术语未在来源中找到：{suspicious_terms}")
    
    if issues:
        return False, "；".join(issues)
    
    return True, "ok"


# Coze 代码节点入口函数
def main(answer: str, retrieved_chunks: List[str]) -> dict:
    """
    Coze 工作流代码节点主函数
    
    Args:
        answer: Bot 生成的回答
        retrieved_chunks: 检索到的知识库片段
    
    Returns:
        {
            "verified": bool,  # 是否通过校验
            "message": str,    # 校验结果消息
            "fallback_answer": str  # 校验失败时的备用回答
        }
    """
    verified, message = verify_citation(answer, retrieved_chunks)
    
    if verified:
        return {
            "verified": True,
            "message": "校验通过",
            "fallback_answer": answer
        }
    else:
        fallback = "当前资料无法确认该信息，建议通过官方渠道查询或咨询医保部门。"
        return {
            "verified": False,
            "message": message,
            "fallback_answer": fallback
        }


# 测试示例
if __name__ == "__main__":
    # 测试用例 1：通过校验
    answer1 = "南京三级医院起付线 1000 元，报销比例 85%"
    chunks1 = [
        "南京三级医院起付线 1000 元，报销比例 85%（统筹基金支付段）"
    ]
    result1 = main(answer1, chunks1)
    print(f"测试 1: {result1}")
    
    # 测试用例 2：未通过校验（数字不匹配）
    answer2 = "南京三级医院起付线 7500 元，报销比例 65%"
    chunks2 = [
        "南京三级医院起付线 1000 元，报销比例 85%"
    ]
    result2 = main(answer2, chunks2)
    print(f"测试 2: {result2}")
