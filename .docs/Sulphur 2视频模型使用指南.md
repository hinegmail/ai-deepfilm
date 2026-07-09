# Sulphur 2模型使用指南


**Sulphur 2（基于 LTX 2.3 架构微调的开源 AI 视频模型）的 GGUF 格式文件无法直接放入本项目中运行，但可以通过“本地启动推理服务 + 本项目 API 对接”的方式间接使用。**

官方下载地址：[huggingface.co/SulphurAI/Sulphur-2-base](https://huggingface.co/SulphurAI/Sulphur-2-base)

**Sulphur 2 蒸馏模型下载:[huggingface.co/vantagewithai/LTX2.3-10Eros-GGUF](https://huggingface.co/vantagewithai/LTX2.3-10Eros-GGUF)**

### 一、 为什么本项目不能直接运行 GGUF 文件？

1. **项目定位**：本项目是一个基于 **Electron + React** 构建的前端客户端应用。它本身**不具备** PyTorch、Diffusers 等深度学习推理引擎，也不包含 C++ 层的本地模型推理库（如 `llama.cpp`）。
2. **云端 API 模式**：本项目目前所有的 AI 功能（包含剧本生成、角色生图、视频生成等）都是通过调用云端 API 接口（如 Agnes-AI、Gemini、Sora 等）实现的。
3. **GGUF 的用途**：GGUF 格式是专门为**本地量化推理**设计的。要运行它，必须依赖支持该格式的本地推理后端（例如 ComfyUI、llama.cpp）。

---

### 二、 怎么在本项目中使用该模型？（解决方案）

要使用 Sulphur 2 GGUF 模型，你需要**在本地搭建一个推理后端，并将其包装为 API** 供本项目调用。

#### 步骤 1：在本地部署推理后端（推荐使用 ComfyUI）

因为 Sulphur 2 是基于 **LTX 2.3** 架构的视频模型，目前最成熟的本地运行方式是使用 **ComfyUI**：

1. **安装 ComfyUI**：确保本地已安装 ComfyUI，并且显卡（VRAM）足够运行视频模型。
2. **安装 GGUF 插件**：在 ComfyUI 中通过 Manager 安装 `ComfyUI-GGUF` 插件（由 city96 维护），以支持加载 `.gguf` 格式文件。
3. **放置模型**：将下载的 Sulphur 2 GGUF 文件（如 `sulphur-2-q8_0.gguf` 等）放入 `ComfyUI/models/unet/` 或 `ComfyUI/models/diffusion_models/` 目录中。
4. **搭建工作流**：在 ComfyUI 中搭建或导入 LTX-Video (LTX 2.3) 的文生视频 / 图生视频工作流，确认在 ComfyUI 内部能成功生成视频。

#### 步骤 2：将 ComfyUI 封装为兼容的 API 接口

为了让本项目能够调用你本地的 Sulphur 2 模型，需要将本地的视频生成能力包装为标准的 HTTP 接口。

* **方案 A（适合开发者）**：编写一个简单的 Python FastAPI 中间件，接收本项目发送的 Prompt，通过 ComfyUI 的 API 接口（启动时加 `--listen` 参数）提交任务，并在生成完成后返回视频 URL。
* **方案 B（使用集成网关）**：使用支持 Local / 自定义 API 的网关（如 One-API），将本地的推理服务挂载为符合 OpenAI 格式的接口（例如 `/v1/images/generations` 或自定义端点）。

#### 步骤 3：在本项目中配置自定义模型

当你在本地（或局域网内）拥有了该 API 端点后，你可以在本项目的**模型配置**中进行对接：

1. 启动本项目，在首页打开**模型配置 (Model Config)** 面板。
2. 添加一个新的**自定义提供商 (Provider)**：
   * **名称**：例如 `Local-ComfyUI`
   * **API Base URL**：填写你本地代理或 API 服务的地址（例如 `http://127.0.0.1:8000/v1`）
   * **API Key**：如果没有设置鉴权，可随便填写一个占位符。
3. 在该提供商下添加一个新的**视频模型 (Video Model)**：
   * **模型 ID**：`sulphur-2`
   * **类型**：视频模型
4. 在分镜导演页面，将视频生成模型选择为你刚刚添加的 `sulphur-2` 即可。


**Sulphur 2 官方的原始权重文件**（`.safetensors` 格式，文件大小在 29GB ~ 46GB 之间）以及配套的 `workflows`（ComfyUI 工作流文件夹）。

由于这些文件是**庞大的深度学习模型权重文件**，**本项目（前端 React + Electron）同样无法直接加载和运行它们**。直接在浏览器/Electron 环境下加载几十 GB 的 `.safetensors` 文件不仅会导致软件直接崩溃，而且前端也缺少运行这些模型所需的 CUDA 显卡加速驱动和 PyTorch 运行环境。

### 本项目要使用官方的这些格式，标准的工作流如下：

#### 第一步：运行本地推理后端（推荐使用 ComfyUI）

官方仓库中提供了一个名为 `workflows` 的文件夹，里面存放的就是 **ComfyUI 工作流文件**。这意味着官方也是推荐通过 ComfyUI 来本地运行该模型的：

1. **下载权重文件**：
   * 如果你的显卡显存非常大（如 RTX 3090 / 4090 或拥有超大统一内存的 Mac Studio，显存/内存 $\ge$ 48GB），可以下载 `sulphur_dev_bf16.safetensors` 或 `sulphur_distil_bf16.safetensors`（双精度，画质最好）。
   * 如果你使用的是普通的 24GB 显存显卡，建议下载 `sulphur_dev_fp8mixed.safetensors`（量化后的 FP8 混合精度版本，显存占用更低）。
2. **放置权重文件**：将下载的 `.safetensors` 文件放入 `ComfyUI/models/diffusion_models/`（有些版本的 ComfyUI 叫 `unet/`）文件夹。
3. **加载工作流**：
   * 下载官方 Hugging Face 仓库中 `workflows` 文件夹里的 `.json` 格式工作流文件。
   * 打开 ComfyUI 网页，将该 `.json` 导入，ComfyUI 会自动配置好生成视频所需的全部节点。

---

#### 第二步：通过 API 将本地 ComfyUI 接入本项目

要让本项目能直接调用你在本地 ComfyUI 中运行的 Sulphur 2，需要使用 API 网关进行“桥接”：

1. **启用 ComfyUI 的 API 运行模式**：
   * 启动 ComfyUI 时添加 `--listen` 参数以允许局域网/本地 API 请求。
2. **使用桥接工具（例如 ComfyUI-to-OpenAI 代理）**：
   * 在本地运行一个开源桥接脚本（如 GitHub 上的 `comfyui-api` 封装工具，或者使用类似 `one-api` 的集成中转工具），将 ComfyUI 的工作流包装为一个标准的 **OpenAI 兼容接口**（如 `/v1/images/generations`）。
3. **在本项目中添加自定义模型配置**：
   * 启动本项目，进入 **模型配置** 页面。
   * 添加一个新的自定义 API 提供商，将 API 地址指向你本地部署的桥接服务端口（例如 `http://127.0.0.1:8000/v1`）。
   * 添加视频模型名称，ID 设为 `sulphur-2`。
4. **开始使用**：
   * 在本项目的分镜导演中，将视频生成模型切换为 `sulphur-2`。
   * 当你点击“生成视频”时，本项目会发送请求到你的本地 API，API 会自动触发你本地的 ComfyUI 进行显卡渲染，并将生成的视频返回到本软件中。


### 一、 GGUF 格式的蒸馏模型是否可以用 Python 库实现视频输出？

**可以，完全可行，并且同样不需要 ComfyUI！**

现在的 Hugging Face **`diffusers`** 库已经原生支持直接加载 GGUF 格式的扩散/视频模型组件。
要运行它，你只需在 Python 环境中额外安装一个读取 GGUF 文件的库：

```bash
pip install gguf
```

#### 🐍 Python 加载 GGUF 视频模型的代码结构：

在 `diffusers` 中，你不能直接把整个 Pipeline 加载为 GGUF，而是要**把 GGUF 格式的模型权重注入到 Transformer 结构中**，代码示例如下：

```python
import torch
from diffusers import LTXPipeline, GGUFQuantizationConfig
from diffusers.models import LTXVideoTransformer3DModel
from diffusers.utils import export_to_video

# 1. 独立加载 GGUF 格式的量化 Transformer 组件
transformer = LTXVideoTransformer3DModel.from_single_file(
    "D:/models/10Eros_v1-Q5_K_M.gguf",  # 指向你下载的 GGUF 文件
    quantization_config=GGUFQuantizationConfig(compute_dtype=torch.bfloat16),
    torch_dtype=torch.bfloat16
)

# 2. 将加载好的量化组件注入到 LTXPipeline 中
pipeline = LTXPipeline.from_pretrained(
    "Lightricks/LTX-Video",              # 基础配置文件（用于获取 VAE 和文本编码器）
    transformer=transformer,
    torch_dtype=torch.bfloat16
)

# 3. 开启 4090 的显存优化并运行
pipeline.enable_model_cpu_offload()

# 4. 生成基础视频
video_frames = pipeline(
    prompt="Cinematic shot, highly detailed...",
    num_frames=97,
    num_inference_steps=8  # 如果是蒸馏版模型，这里只需 8 步
).frames[0]

export_to_video(video_frames, "output.mp4")
```

---

### 二、 如果追求高清 1080P 视频，应该下载哪个 GGUF 模型？

在你的第二张截图列表中（`vantagewithai/LTX2.3-10Eros-GGUF` 仓库中），包含了从 Q3 到 Q8 不同量化精度的文件。对于 **RTX 4090 (24G 显存)**，推荐如下选择：

#### 1. 极致画质推荐：`10Eros_v1-Q8_0.gguf` (22.8 GB)

* **优势**：这是 8-bit 的量化版本。其画质细节非常接近原版无损的 BF16（几乎无损），人脸、眼神和精细背景的还原度是所有 GGUF 中最高的。
* **显存适配**：它的文件体积为 22.8 GB，对于 24G 显存的 4090 来说，在配合 `enable_model_cpu_offload()` 卸载文本编码器后，可以完美常驻并稳定生成，是 4090 追求画质上限的首选。

#### 2. 速度与显存平衡推荐：`10Eros_v1-Q5_K_M.gguf` (16.1 GB)

* **优势**：这是 5-bit 的量化版本，在社区中被称为“黄金性价比量化”。它在压缩体积的同时，保留了 98% 以上的画面质量（肉眼几乎看不出与 Q8 的区别）。
* **显存适配**：由于只有 16.1 GB，显存压力极小，剩下的 8G 显存可以直接留给后面的 1080P 超分处理，生成速度也会比 Q8 快。

---

### 三、 总结：如何分步实现高清 1080P 视频？

要在 Python 中完美输出 1080P 视频，最稳妥、效果最好的分步实现方法如下：

* **第一步：基础生成（Base Generation）**
  * 下载并加载 **`10Eros_v1-Q5_K_M.gguf`**（或 Q8_0）。
  * 在 Python 中以 **768x512** 的基础分辨率生成视频。这一步是为了确保视频的动作逻辑、形体、运镜是自然且不崩坏的。
* **第二步：本地超分（Super-Resolution / Upscale）**
  * 使用 Python 加载一个超分模型（例如 **`Real-ESRGAN`** 的 `RealESRGAN_x4plus` 权重，或者 **`SwinIR`**）。
  * 将生成好的 768x512 的 `.mp4` 视频拆成帧图片，使用 4090 进行 2.5 倍超分处理，无损拉伸重建至 **1920x1080 (1080P)**，最后重新合成为视频。
  * *4090 运行这类超分模型速度极快，处理一段几秒钟的视频只需 3~5 秒。*
