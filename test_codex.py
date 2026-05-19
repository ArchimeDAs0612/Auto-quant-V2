import os
from openai import OpenAI

def test_codex():
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("错误：请先设置 OPENAI_API_KEY 环境变量")
        print("示例：export OPENAI_API_KEY='你的API密钥'")
        return
    
    client = OpenAI(api_key=api_key)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个代码助手。"},
                {"role": "user", "content": "写一个Python函数，计算斐波那契数列的第n项"}
            ]
        )
        
        print("AI生成的代码：")
        print(response.choices[0].message.content)
        
    except Exception as e:
        print(f"请求失败: {e}")

if __name__ == "__main__":
    test_codex()
