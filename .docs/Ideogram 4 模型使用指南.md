## Ideogram 4 模型使用指南

Hugging Face 的 **`diffusers`** 库已经快速跟进，原生支持了 Ideogram 4。你可以直接通过 Python 代码在本地进行加载和推理，**不需要依赖 ComfyUI**。

官方在 `diffusers` 库中提供了专属的 **`Ideogram4Pipeline`** 类来加载和运行该模型。

以下是具体的 Python 依赖安装、实现代码，以及如何在本项目中对接的方案：

---

### 1. 准备 Python 依赖环境

要运行 Ideogram 4，你需要确保安装了最新版本的 `diffusers` 库：

```bash
pip install -U diffusers transformers accelerate
```

*注意：由于官方模型通常在 Hugging Face 上是 **Gated（受保护/需授权）** 的，你需要先去 Hugging Face 的 `ideogram-ai/ideogram-4-nf4-diffusers` 页面点击同意使用条款，并在 Python 代码中传入你的 Hugging Face Token，或者提前在终端运行 `huggingface-cli login` 进行登录。*

---

### 2. 极简本地推理 Python 代码

得益于 `diffusers` 官方的支持，加载它只需要几行代码。为了适应 24G 显存（甚至更低），推荐加载官方提供的 `nf4`（量化版）或 `fp8` 版本：

```python
import torch
from diffusers import Ideogram4Pipeline

# 加载 Ideogram 4 量化版（适合 24G 显卡）
# 注意：如果是首次运行，请确保通过 huggingface-cli 登录，或在 from_pretrained 中传入 token="你的HF_token"
pipeline = Ideogram4Pipeline.from_pretrained(
    "ideogram-ai/ideogram-4-nf4-diffusers", 
    torch_dtype=torch.bfloat16
)
pipeline.to("cuda")

# 运行推理生成图像
prompt = "A high-quality cinema photo of a retro robot holding a neon sign that says 'Deep Film'"
image = pipeline(
    prompt=prompt,
    height=1024,
    width=1024,
    generator=torch.Generator("cuda").manual_seed(42)
).images[0]

# 保存生成结果
image.save("robot.png")
```

---

### 3. 如何在本项目中使用？（桥接为 API 接口）

与视频模型一样，最方便的方法是用 **FastAPI** 写一个简单的 Python 脚本，将 `Ideogram4Pipeline` 包装为一个符合 **OpenAI 图像生成格式**（`/v1/images/generations`）的 API 接口。

#### 🐍 `api_server.py` 代码示例：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse
from diffusers import Ideogram4Pipeline
import torch
import uuid
import os

app = FastAPI()

# 初始化加载模型
print("正在加载 Ideogram 4...")
pipe = Ideogram4Pipeline.from_pretrained(
    "ideogram-ai/ideogram-4-nf4-diffusers", 
    torch_dtype=torch.bfloat16
)
pipe.to("cuda")
print("Ideogram 4 加载成功！")

class ImageRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"

@app.post("/v1/images/generations")
async def generate_image(request: ImageRequest):
    try:
        # 解析尺寸
        w, h = map(int, request.size.split("x"))
      
        # 运行生成
        image = pipe(prompt=request.prompt, height=h, width=w).images[0]
      
        # 存入本地临时文件
        os.makedirs("outputs", exist_ok=True)
        file_path = f"outputs/{uuid.uuid4()}.png"
        image.save(file_path)
      
        # 返回图片文件
        return FileResponse(file_path, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

#### 4. 在本软件前端配置：

1. 启动上面的 Python API 服务器。
2. 打开本项目的“模型配置”界面。
3. 添加自定义提供商，地址设为 `http://127.0.0.1:8000/v1`。
4. 在图片模型（Image Model）中，新建一个自定义模型，ID 设置为 `ideogram-4`。
5. 完成配置后，你就可以在剧本开发和角色变体生图里，使用你本地显卡跑的 Ideogram 4 来进行高精度的角色与分镜插图绘制了！由于该模型支持 JSON 级别的精准布局排版，它的文字渲染和画面文字清晰度会非常惊艳。
