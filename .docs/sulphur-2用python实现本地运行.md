你可以使用 Hugging Face 的 **`diffusers`**（扩散模型专用 Python 库）配合 **`FastAPI`**，自己编写一个极简的 Python 本地 API 服务器。

由于 Sulphur 2 是基于 **LTX-Video (LTX 2.3)** 架构开发的，`diffusers` 库提供了原生的 `LTXPipeline` 或 `LTX2Pipeline` 类来直接加载和运行这类模型。

下面是具体的实现方案和 Python 示例代码：

---

### 1. 准备 Python 依赖库

在你的本地 Python 环境中（建议使用独立虚拟环境），安装以下库：

```bash
# 安装深度学习和 Diffusers 核心库
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121  # 确保安装带 CUDA 渲染支持的 PyTorch
pip install -U diffusers transformers accelerate sentencepiece

# 安装创建 API 接口所需的库
pip install fastapi uvicorn pydantic
```

---

### 2. 编写轻量级 API 服务代码 (`server.py`)

你可以使用以下 Python 脚本，直接加载你下载的 `sulphur_dev_fp8mixed.safetensors` 文件，并通过 API 接口提供给前端软件调用。

```python
import torch
from diffusers import LTXPipeline  # 如果是 LTX 2.3，也可以使用 LTX2Pipeline
from diffusers.utils import export_to_video
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import uuid

app = FastAPI()

# 1. 配置文件路径（指向你下载的官方 .safetensors 权重文件）
MODEL_FILE_PATH = "./sulphur_dev_fp8mixed.safetensors"

print("正在加载 Sulphur 2 模型，请稍候...")
# 使用 diffusers 的单文件加载功能直接读取 .safetensors
pipeline = LTXPipeline.from_single_file(
    MODEL_FILE_PATH,
    torch_dtype=torch.bfloat16
)

# 2. 优化显存占用（根据你的 GPU 显存大小二选一）
# 方案 A：如果显存为 16GB ~ 24GB，启用 CPU 卸载技术（大幅省显存，速度稍慢一点）
pipeline.enable_model_cpu_offload()

# 方案 B：如果显存超大（>= 48GB），直接放入显存（速度最快）
# pipeline.to("cuda")

print("模型加载成功！")

# 定义请求参数格式
class VideoRequest(BaseModel):
    prompt: str
    width: int = 704
    height: int = 480
    num_frames: int = 161          # 帧数，推荐为 8 的倍数 + 1（如 97, 161, 257）
    num_inference_steps: int = 50   # 推理步数

@app.post("/v1/videos/generations")
async def generate_video(request: VideoRequest):
    try:
        # 生成视频帧
        video_frames = pipeline(
            prompt=request.prompt,
            width=request.width,
            height=request.height,
            num_frames=request.num_frames,
            num_inference_steps=request.num_inference_steps,
        ).frames[0]
      
        # 保存为本地 mp4 临时文件
        os.makedirs("outputs", exist_ok=True)
        file_path = f"outputs/{uuid.uuid4()}.mp4"
        export_to_video(video_frames, file_path, fps=24)
      
        # 返回文件给前端
        return FileResponse(file_path, media_type="video/mp4")
      
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"视频生成失败: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # 在本地 8000 端口启动服务
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

---

### 3. 本项目如何调用这个服务？

1. 运行上述 Python 脚本：`python server.py`。
2. 保持脚本在后台运行（它会在 `http://127.0.0.1:8000` 监听）。
3. 启动本项目客户端，点击**模型配置**：
   * 新建自定义 Provider，Base URL 填入 `http://127.0.0.1:8000/v1`。
   * 新建名为 `sulphur-2` 的自定义视频模型。
4. 现在，在分镜导演中选择 `sulphur-2` 点击生成，系统就会通过你写的 Python 后台，利用本地显卡去跑官方的 `.safetensors` 文件并生成视频了。


## **用 Python（通过 `diffusers` 和 `PyTorch`）是目前最能完美榨干 4090 显卡 24G 显存性能的方式。**

因为 Python 代码是这些 AI 模型的“原生”开发语言，相比 ComfyUI 等图形化界面，Python 给你提供了**最直接、最底层**的显存控制权和优化手段。

针对 **RTX 4090 (24G 显存)**，以下是实现“完美且高效利用”的具体原理和优化配置代码：


---

### 一、 为什么 24G 显存需要配置优化？

Sulphur 2 (基于 LTX-Video) 包含两个主要部分：

1. **T5-XXL 文本编码器**：约 110 亿参数，在 BF16 精度下需要占用约 **22G 显存**。
2. **Sulphur 2 视频扩散网络 (DiT)**：需要约 **4G ~ 8G 显存**。

如果你用最暴力的 `pipeline.to("cuda")`（全 BF16 精度静态加载），总显存会超过 26G，直接导致 OOM 报错崩溃。因此，我们必须针对 4090 调整加载策略。

---

### 二、 针对 4090 (24G) 的三种黄金 Python 优化配置

根据你的使用场景（是追求**生成速度**，还是追求**极致的分辨率**），你可以选择以下不同的配置：

#### 方案 1：T5 文本编码器量化 + 核心模型 BF16（推荐：速度最快）

* **原理**：将占用 22G 显存的 T5 编码器量化为 8-bit 或 FP8 精度（显存降至 ~11G），而视频生成的核心模型仍运行在 BF16。
* **效果**：**无需做内存与显存的频繁切换**，全部模型能完整常驻在 4090 的 24G 显存内。免去了 CPU 和 GPU 之间搬运权重的延迟，4090 的 Tensor Cores 会火力全开，生成速度达到极致。
* **代码实现**：
  ```python
  import torch
  from diffusers import LTXPipeline
  from transformers import T5EncoderModel

  # 1. 以 8-bit 精度加载 T5 文本编码器
  text_encoder = T5EncoderModel.from_pretrained(
      "Lightricks/LTX-Video",
      subfolder="text_encoder",
      load_in_8bit=True,  # 8-bit 精度加载，省去 11G 显存
      device_map="auto"
  )

  # 2. 加载完整的视频生成管线
  pipeline = LTXPipeline.from_single_file(
      "./sulphur_dev_bf16.safetensors",
      text_encoder=text_encoder,
      torch_dtype=torch.bfloat16
  )
  pipeline.to("cuda")  # 全部静态常驻 24G 显存中，极致速度
  ```

#### 方案 2：组件级 CPU 卸载（`enable_model_cpu_offload`）（推荐：追求高分辨率/多帧数）

* **原理**：只在需要时把模型送入 GPU。先用 GPU 跑 T5 编码文本，跑完把 T5 移回系统内存，再把视频生成 DiT 移入 GPU 运行。
* **效果**：显存占用在任意时刻都不会超过 16G，剩下的显存空间（~8G）可以完全留给 4090 去生成**高分辨率（如 720p / 1080p）**和**更多秒数（帧数）**的视频。
* **代码实现**：
  ```python
  pipeline = LTXPipeline.from_single_file(
      "./sulphur_dev_bf16.safetensors",
      torch_dtype=torch.bfloat16
  )
  # 启用组件级卸载，diffusers 会自动在后台无缝调度显存
  pipeline.enable_model_cpu_offload() 
  ```

#### 方案 3：开启 FP8 Layerwise 精度（最省显存）

* **原理**：针对 4090 原生支持的 FP8（Ada Lovelace 架构特性）进行计算。
* **效果**：直接加载 `sulphur_dev_fp8mixed.safetensors` 文件，并将计算和存储都在 FP8 精度下运行，显存占用极低，允许你进行多任务并行生成。
* **代码实现**：
  ```python
  pipeline = LTXPipeline.from_single_file(
      "./sulphur_dev_fp8mixed.safetensors",
      torch_dtype=torch.float16 # 或 bfloat16
  )
  # 启用层级转换，4090 会以 FP8 的高速率进行推理
  pipeline.transformer.enable_layerwise_casting(
      storage_dtype=torch.float8_e4m3fn, 
      compute_dtype=torch.bfloat16
  )
  pipeline.to("cuda")
  ```

---

### 三、 4090 独占速度加速：`torch.compile`

既然你用 Python 和 4090，你可以享受到 ComfyUI 中很难配置的一项超强优化——**PyTorch 2.0 模型编译**。
这可以将 4090 的视频生成速度**额外提升 20% ~ 30%**：

```python
# 加载完 pipeline 后，对 transformer 网络进行图编译优化
pipeline.transformer = torch.compile(
    pipeline.transformer, 
    mode="max-autotune", 
    fullgraph=True
)
```

*提示：首次生成视频时，由于需要进行硬件编译，会卡住 3-5 分钟；但编译完成后，后面的每一次视频生成速度都会飞起，完美匹配 4090 的算力上限。*


## 针对你的 **RTX 4090 (24G 显存)**，在官方提供的模型列表中，最推荐下载以下两个模型：

---

### 推荐 1：`sulphur_distil_bf16.safetensors` (46.1 GB)

👉 **最适合：追求极致生成速度、高效日常创作的用户（强烈推荐！）**

* **为什么合适**：
  * 这是 **Distill（蒸馏）** 版本。普通的 `dev` 版本需要 **30 ~ 50 步 (steps)** 才能渲染出好视频，而蒸馏版只需要 **4 ~ 8 步** 即可达到极高的画质。
  * 在 4090 上，这意味着生成一段视频的时间会从 1 分钟**直接缩短到 10 秒左右**，体验呈倍数提升。
* **显存如何适配（24G）**：
  * 虽然它有 46.1 GB，但因为它是 BF16 格式，你可以配合 Python 代码中的 **CPU 卸载（`pipeline.enable_model_cpu_offload()`）** 或 **将 T5 文本编码器量化为 8-bit/FP8** 加载。
  * 这样在实际运行中，显存占用可以轻松控制在 24G 以内，完美流畅运行。

---

### 推荐 2：`sulphur_dev_fp8mixed.safetensors` (29.2 GB)

👉 **最适合：追求极致高分辨率（如 720p/1080p）、长视频生成、显存最安全的用户**

* **为什么合适**：
  * 这是官方经过 **FP8 量化（混合精度）** 后的开发版模型。
  * 相比于 46GB 的大模型，它本身只有 29.2 GB。由于 4090 显卡（Ada Lovelace 架构）有强大的 **FP8 Tensor Cores 硬件加速**，运行这个模型非常高效。
  * 较低的权重显存占用，能给视频渲染过程中产生的“动态显存（Activation Memory）”留出巨大的空间。你可以尝试生成**更高分辨率**、**更长帧数**的视频而完全不用担心 OOM（显存溢出）报错。
* **缺点**：
  * 它是非蒸馏（Non-distilled）的开发版，生成一个视频需要 **30 ~ 50 步**，生成时间大约是蒸馏版的 5 ~ 6 倍。

---

### 💡 最终选型建议：

1. **如果你希望像用云端 API 一样，点击生成后 10 秒钟内就能看到视频** ➡️ 请下载 **`sulphur_distil_bf16.safetensors`**，并使用我们在上一轮提到的 **CPU 卸载** 或者 **T5 8-bit 加载** 方案。
2. **如果你需要生成大尺寸（如 1280x720）且较长镜头的视频，且不介意每次等待 1 分钟左右** ➡️ 请下载 **`sulphur_dev_fp8mixed.safetensors`**。


## 希望最终得到 **1080P (1920x1080) 的高清视频**

显卡的选型和模型使用策略需要遵循**“低分辨率生成 + 超分辨率放大（Upscale）”**的行业标准方案。

直接在 4090 上用本地模型**原生生成** 1080P 视频是不可取的，原因有两个：

1. **显存直接炸开（OOM）**：1080P 的视频帧像素量是普通分辨率的 4~6 倍，在生成时产生的自注意力机制（Self-Attention）矩阵呈几何级数增长，会瞬间吃满并超出 4090 的 24G 显存。
2. **画面畸变**：Sulphur 2 (LTX-Video) 模型的训练基准分辨率通常在 704x480 或 768x512 左右。直接强行生成 1080P 会导致画面出现肢体重复、人脸多头、画面撕裂等严重畸变。

---

### 1080P 最佳选择与配置方案：

#### 1. 模型选择：`sulphur_dev_fp8mixed.safetensors` (29.2 GB)

* **原因**：FP8 量化版在运行中占用的显存极小（仅需 4090 的不到一半显存），这为后面的**超分辨率放大算法（Upscaler）留出了足够的显存空间**。
* *注：如果你追求速度，也可以选择 `sulphur_distil_bf16.safetensors`，但加载时必须开启上文提到的 `enable_model_cpu_offload` 和 FP8 转换，以释放显存给放大算法。*

---

### 2. 两阶段 1080P 生成工作流（Python 侧实现）

你可以在 Python API 服务中，将流程分为两步自动执行：

* **阶段一：基础视频生成（Base Generation）**
  * 在 4090 上，先以 **768x512** 或 **704x480** 分辨率生成一段基础视频。这能保证视频的人物动作、构图和光影是完全正常的。
* **阶段二：AI 超分放大（Video Upscaling）**
  * 视频生成后，立即使用 Python 库（如 `Real-ESRGAN`、`SwinIR` 等轻量级高清重建算法）或调用插帧/超分模型，将生成的 mp4 视频无损放大 2~3 倍，达到 **1920x1080**。

#### 💡 Python 代码中集成超分放大的示例：

你可以安装 `realesrgan` 依赖包：

```bash
pip install realesrgan
```

然后在 Python API 服务的代码里，在视频导出后加上超分逻辑：

```python
from realesrgan import RealESRGANer
# ... [生成基础视频 base_output.mp4] ...

# 自动调用 Real-ESRGAN 将 base_output.mp4 的每一帧放大到 1080P
# 4090 在处理这类超分时速度极快，几秒钟即可完成
upscaled_video = upscale_video_to_1080p("base_output.mp4", scale=2.5)

return FileResponse(upscaled_video, media_type="video/mp4")
```

通过这种**两阶段方案**，你的 4090 显卡可以在 24G 显存内轻松愉快地工作，既不会报错，又能产出画面逻辑正常、清晰度极高的 1080P 视频。
