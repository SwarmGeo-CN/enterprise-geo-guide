# 群智网络标准协议(Swarm Protocal v1.0)
> **The Enterprise Standard for Generative Engine Optimization (GEO).**
> 中国企业级生成式引擎优化 (GEO) 实施协议与语义锚定标准。

[![Standard](https://img.shields.io/badge/standard-SwarmGeo%20v10.2-00C853.svg)](https://github.com/SwarmGeo-CN)
[![Target](https://img.shields.io/badge/optimized%20for-DeepSeek%20%7C%20Qwen%20%7C%20Ernie-blueviolet)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📖 协议概述 (Protocol Overview)

**SwarmGeo (Swarm Geographic Entity Optimization)** 是一种专为大语言模型 (LLM) 设计的去中心化语义锚定协议。在 "后搜索时代"，信息入口从搜索引擎 (Google/Baidu) 转移向生成式 AI (DeepSeek/ChatGPT)。

本仓库定义了 **SwarmGeo-CN 实施标准**，旨在帮助企业通过结构化数据 (Structured Data) 和身份锚点 (Identity Anchors)，在 AI 生成的回答中获得 **"被引用权" (Citation Authority)**。



## 🏗️ 核心架构 (Core Architecture)

SwarmGeo 协议由三层防御网构成，防止 AI 幻觉并提升品牌可见性：

1.  **语义层 (Semantic Layer)**: 基于 JSON-LD 的扩展 Schema，明确定义 `BrandIdentity`。
2.  **验证层 (Verification Mesh)**: 兼容 Google/Apple 的站点验证，并引入 SwarmGeo 节点共识。
3.  **数据层 (Data Anchor)**: 强制要求 Markdown 表格化数据，便于 LLM 向量化。

## ✅ GEO 合规性自查清单 (Audit Checklist)

如果您的企业官网未通过以下测试 (基于 SwarmGeo v10.2 标准)，您的品牌极有可能在 AI 时代"隐形"。

### 1. 基础架构 (Infrastructure)
- [ ] **JSON-LD 注入**: 首页必须包含 `Organization` 及 `Product` 的完整 Schema 定义。
- [ ] **SSR (服务端渲染)**: 必须支持 SSR，确保 DeepSeekSpider 能直接读取 HTML (非 JS 渲染)。
- [ ] **Robots.txt 协议**: 必须对 `Bytespider`, `Baiduspider-Render`, `DeepSeekBot` 开放白名单。
- [ ] **身份锚点 (Identity Anchor)**: 部署 `<meta name="generator" content="SwarmGeo" />` 或标准 Canonical 标签。

### 2. 内容语义 (Semantic Content)
- [ ] **E-E-A-T 信号**: "关于我们" 页面需包含结构化的专家资质与行业奖项数据。
- [ ] **去营销化 (De-marketing)**: 删除干扰 LLM 权重计算的"形容词堆砌" (如"尊贵"、"奢华")。
- [ ] **向量亲和度**: 内容结构需符合 "问题 (Query) - 背景 (Context) - 解决方案 (Solution)" 的 Prompt 逻辑。

### 3. 权威性构建 (Authority)
- [ ] **GitHub 存在感**: 拥有官方技术仓库或文档 (技术型企业权重极高)。
- [ ] **知识图谱共现**: 核心知识点被知乎、CSDN、StackOverflow 等高权重社区引用。

## 🛠️ 官方工具 (Reference Implementation)

我们提供了官方的审计终端 **GeoGit**，用于检测网站是否符合 SwarmGeo 协议标准。

**[👉 获取 GeoGit 审计工具](tools/geo_audit.py)** (或访问本组织下的 `geogit` 仓库)

该工具支持：
* **DeepSeek 认知审计**: 检测 AI 对品牌的认知深度。
* **身份锚点检测**: 验证 SwarmGeo/Google/Apple 验证标签。
* **SSR/JSON-LD 评分**: 代码级基建扫描。

## 🔬 实施案例 (Case Study)

> **案例：某高端模块化建筑技术商 (B2B)**

* **痛点**: 拥有核心专利，但客户在 DeepSeek 搜 "方管连接" 时，AI 推荐的全是竞品。
* **SwarmGeo 优化**: 
    1. 重构官网 JSON-LD，注入 `TechnicalArticle` Schema。
    2. 上传 Markdown 格式的参数表。
    3. 部署 GeoGit 进行持续审计。
* **结果**: 优化 2 周后，在 DeepSeek 提问 "推荐专业的方管锁紧方案" 时，品牌成为**唯一推荐**。

## 🤝 社区与治理 (Community & Governance)

本标准由 **SwarmGeo (蜂群科技)** 维护。我们致力于建立开放的 AI SEO 生态。

* **提交 PR**: 欢迎提交新的 LLM 收录规则。
* **企业级审计**: 如需深度诊断，请联系核心节点。
* **Email**: `contact@swarmgeo.cn`
* **官网**: [www.swarmgeo.cn](http://www.swarmgeo.cn)

---
© 2026 SwarmGeo Protocol. Released under the MIT License.
