---
name: skill-writer
description: 指导用户为 Claude Code 创建系统级 Agent Skills，支持多个业务子 Skill 的模块化设计。当用户想要创建、编写或设计系统级 Skill，或提到"生成 skills-list / 更新技能清单 / generate_skills_list"时使用。脚本 `scripts/generate_skills_list.py` 仅存放于本 skill-writer 目录，其他系统级 Skill 不需要复制；需要更新清单时由 skill-writer 脚本对目标 Skill 目录执行。
---

# 系统级 Skill 编写助手

此 Skill 帮助您为 Claude Code 创建结构良好、模块化、可扩展的系统级 Agent Skills，支持多个业务子 Skill 的集成，遵循渐进式披露、关注点分离和可组合性原则。

## 何时使用此 Skill

当您需要进行以下操作时使用此 Skill：
- 创建一个新的系统级 Agent Skill，支持多个业务子 Skill
- 编写或更新系统级 SKILL.md 文件，包括技能清单自动化
- 针对**指定的系统级 Skill** 生成或更新 `skills-list.md`（例如用户说“把这个 Skill 的 skills-list 生成一下/更新一下”）
- 设计系统架构、frontmatter 和子 Skill 结构
- 排除系统级 Skill 发现（discovery）问题的故障
- 将现有的提示词 (prompts) 或复杂工作流转换为模块化的系统级 Skills

## 指南

### 第 1 步：确定系统级 Skill 范围

首先，理解系统级 Skill 应该做什么：

1. **提出澄清性问题**：
   - 这个系统级 Skill 应该提供什么整体能力？（例如，企业级综合管理系统）
   - 它包含哪些业务子 Skill？（例如，finance、hr、it）
   - Claude 应该在什么时候使用这个系统级 Skill，以及如何路由到子 Skill？
   - 它需要什么工具、资源或自动化脚本？
   - 这是供个人使用还是团队共享？

2. **保持专注**：一个系统级 Skill = 一个领域 + 多个可组合子 Skill
   - 好： "企业级综合管理系统"（包含 finance-module、hr-module 等）
   - 太宽泛： "所有业务处理"、"通用工具"

### 第 2 步：选择系统级 Skill 位置

确定在哪里创建系统级 Skill：
**项目 Skills** (`.claude/skills/`)：
- 团队工作流和公约
- 项目特定的领域知识
- 共享模块化系统（提交到 git）

### 第 3 步：创建系统级 Skill 结构

创建目录和文件，支持模块化设计：

```bash
# 项目
mkdir -p .claude/skills/system-name
```

对于系统级 Skills（注意：脚本 `generate_skills_list.py` 集中存放在 `skill-writer/scripts/`，其他 Skill 不需要复制）：
```
system-name/
├── SKILL.md (必须，系统入口)
├── skills-list.md (必须，技能清单；由 skill-writer 脚本生成)
├── reference.md (可选，详细业务知识)
└── modules/
    ├── sub-skill1/
    │   ├── SKILL.md (必须)
    │   ├── reference.md (可选)
    │   └── examples.md (可选)
    ├── sub-skill2/
    │   ├── SKILL.md (必须)
    │   ├── reference.md (可选)
    │   └── examples.md (可选)
    └── templates/
        └── template.txt (可选)
```

### 第 4 步：编写 SKILL.md frontmatter

创建包含必填字段的 YAML frontmatter：

```yaml
---
name: system-name
description: 简要描述系统功能、包含的子 Skill 以及何时使用它
---
```

**字段要求**：

- **name** (名称):
  - 仅限小写字母、数字、连字符
  - 最多 64 个字符
  - 必须与目录名称匹配
  - 好： `enterprise-system`, `business-automation`
  - 坏： `Enterprise_System`, `Business Tools!`

- **description** (描述):
  - 最多 1024 个字符
  - 包含系统做**什么**、包含的子 Skill 以及**何时**使用
  - 使用用户可能会说的具体触发词
  - 提及路由流程、子模块和上下文

**可选 frontmatter 字段**：

- **allowed-tools**: 限制工具访问（逗号分隔列表）
  ```yaml
  allowed-tools: Read, Grep, Glob, Bash
  ```
  用于：
  - 系统级路由和子 Skill 执行
  - 安全敏感的工作流
  - 范围受限的操作

### 第 5 步：编写有效的描述

描述对于 Claude 发现您的系统级 Skill 至关重要。

**公式**: `[系统做什么] + [何时使用] + [关键触发词] + [子 Skill 概述]`

**示例**:

✅ **好**:
```yaml
description: 企业级综合管理系统，处理财务、HR 和 IT 业务。优先查阅 ./skills-list.md 以路由到子模块，如费用报销或员工入职。当用户提到企业管理、报销或人事时使用。
```

✅ **好**:
```yaml
description: 项目自动化系统，集成代码审查、文档生成和测试模块。当处理项目工作流、代码分析或自动化测试时使用，路由至相应子 Skill。
```

❌ **太模糊**:
```yaml
description: 帮助处理业务
description: 用于系统管理
```

**提示**:
- 包含具体的子模块名称 (finance-module, hr-module)
- 提及常见的用户短语（"报销"、"入职"、"查询"）
- 列出具体的操作和路由（而不是通用的动词）
- 添加上下文线索（"Use when..."，"Route to..."）

### 第 6 步：构建系统级 Skill 内容

使用清晰的 Markdown 章节，支持渐进式披露：

```markdown
# 系统名称

简要概述此系统级 Skill 的功能和子 Skill 集成。

## Quick start (快速开始)

提供一个简单的路由例子以便立即上手。

## Instructions (说明)

给 Claude 的分步指导：
1. 阅读 ./skills-list.md 获取子 Skill 清单
2. 根据用户需求匹配并路由到子 Skill
3. 执行子 Skill 的核心指令
4. 处理边缘情况，如子 Skill 冲突

## Examples (示例)

显示包含路由和子 Skill 执行的具体使用示例。

## Best practices (最佳实践)

- 需遵循的关键公约（如模块化设计）
- 需避免的常见陷阱（如上下文过载）
- 何时使用系统级 vs 子 Skill

## Requirements (要求)

列出任何依赖项或先决条件：
```bash
pip install pyyaml
```

## Advanced usage (高级用法)

对于复杂场景，请参阅 [reference.md](reference.md)。
```

### 第 7 步：添加辅助文件（必须/可选）

为渐进式披露创建额外文件：

**skills-list.md**: 自动化生成的子 Skill 清单（必须）
**reference.md**: 详细的业务知识和高级选项（可选）
**modules/**: 子 Skill 目录，每个包含自己的 SKILL.md（必须），以及 reference.md 和 examples.md（可选）
**templates/**: 文件模板或样板代码（可选）

从 SKILL.md 引用它们：
```markdown
先阅读 [skills-list.md](skills-list.md) 以确定子模块。

运行自动化脚本：
\`\`\`bash
python scripts/generate_skills_list.py
\`\`\`
```

对于子 Skill，从子 SKILL.md 引用辅助文件：
```markdown
有关高级用法，请参阅 [reference.md](reference.md)。

查看示例，请参阅 [examples.md](examples.md)。
```

### 第 8 步：实现技能清单自动化

脚本 [`scripts/generate_skills_list.py`](scripts/generate_skills_list.py) **仅存放在 `skill-writer` 目录**，其他系统级 Skill 不需要复制该脚本。

脚本接受一个可选的命令行参数 `--target`，指定目标系统级 Skill 的根目录（绝对或相对路径）。如果不传，则默认扫描脚本自身所在 Skill（即 `skill-writer`）。

`skills-list.md` 输出为 XML 风格列表，每个子 Skill 一个 `<skill>`：
- `<name>`：子 Skill 的 frontmatter `name`
- `<description>`：子 Skill 的 frontmatter `description`
- `<location>`：固定为 `project`
- `<relativePath>`：相对系统级根目录的子 Skill 目录路径（例如 `modules/echo`）

#### 调用示例

为**指定 Skill** 生成/更新清单（推荐）：

```powershell
python "<skill-writer-dir>\scripts\generate_skills_list.py" --target "<path-to-target-skill>"
```

例如：

```powershell
python "D:\Desktop\03 Code\agent-skills\.claude\skills\skill-writer\scripts\generate_skills_list.py" --target "D:\Desktop\03 Code\agent-skills\.claude\skills\test-skill"
```

如果用户要求帮忙生成/更新某 Skill 的清单：
1. **确认目标 Skill 目录名或绝对路径**（例如 `test-skill` 或完整路径）。
2. 在 `.claude/skills/` 下按目录名定位目标：
   - 若能唯一匹配：继续
   - 若不唯一/不清晰：**要求用户提供目标目录的绝对路径**
3. 调用 `skill-writer/scripts/generate_skills_list.py --target <目标路径>`，覆盖更新目标 Skill 的 `skills-list.md`。

集成到 CI/CD 或 pre-commit 钩子以保持更新。

### 第 9 步：验证系统级 Skill

检查这些要求：

✅ **文件结构**:
- [ ] SKILL.md 和 skills-list.md 存在于正确的位置
- [ ] 目录名称与 frontmatter 中的 `name` 匹配
- [ ] 子模块在 modules/ 下，每个有 SKILL.md，并可选有 reference.md 和 examples.md

✅ **YAML frontmatter**:
- [ ] 第 1 行包含开头的 `---`
- [ ] 内容之前包含结尾的 `---`
- [ ] 有效的 YAML（无制表符，缩进正确）
- [ ] `name` 遵循命名规则
- [ ] `description` 具体且少于 1024 个字符

✅ **内容质量**:
- [ ] 路由说明清晰
- [ ] 提供了子 Skill 示例
- [ ] 处理了冲突和边缘情况
- [ ] 自动化脚本工作正常
- [ ] 子 Skill 的辅助文件（如 reference.md、examples.md）正确引用

✅ **测试**:
- [ ] 描述与用户问题匹配
- [ ] 系统在相关查询时激活并路由
- [ ] 子 Skill 正确加载，包括可选文件

### 第 10 步：测试系统级 Skill

1. **重启 Claude Code**（如果正在运行）以加载系统

2. **提出相关问题**以匹配描述：
   ```
   Can you handle expense reimbursement in the enterprise system?
   （你能处理企业系统中的费用报销吗？）
   ```

3. **验证激活**：Claude 应该阅读 skills-list.md 并路由到子 Skill

4. **检查行为**：确认 Claude 正确遵循路由和子 Skill 说明，包括加载可选的 reference.md 或 examples.md 如果需要

### 第 11 步：根据需要进行调试

如果 Claude 没有正确路由或加载子文件：

1. **使描述更具体**：
   - 添加触发词和子模块关键词
   - 包含文件类型和操作

2. **检查文件位置**：
   ```bash
   ls ~/.claude/skills/system-name/SKILL.md
   ls .claude/skills/system-name/SKILL.md
   ```

3. **验证 YAML 和脚本**:
   ```bash
   cat SKILL.md | head -n 10
   python scripts/generate_skills_list.py
   ```

4. **运行调试模式**:
   ```bash
   claude --debug
   ```

## 常见模式

### 路由型系统级 Skill

```yaml
---
name: enterprise-system
description: 企业级综合管理系统。请优先查阅 ./skills-list.md 以确定调用哪个子模块。
allowed-tools: Read, Grep, Glob, Bash
---
```

### 基于脚本的系统级 Skill

```yaml
---
name: automation-hub
description: 项目自动化中心，集成多个子模块。当自动化工作流时使用，路由至子 Skill。
---

# Automation Hub

## Instructions

1. 执行 ./scripts/generate_skills_list.py 更新清单
2. 阅读 ./skills-list.md
3. 路由到匹配子模块
```

### 具有渐进式披露的多模块系统

```yaml
---
name: business-suite
description: 业务套件系统，支持财务、HR 等模块。当处理业务场景时使用。
---

# Business Suite

快速开始：参见 [skills-list.md](skills-list.md)

详细参考：参见 [reference.md](reference.md)

## Instructions

1. 收集需求
2. 匹配子模块（参见 skills-list.md）
3. 执行子 Skill
4. 集成结果
```

## 子 Skill 作者的最佳实践

1. **模块化设计**：每个子 Skill 一个目的，避免系统过载
2. **具体的描述**：包含触发词和路由线索
3. **清晰的路由**：为 Claude 写路由流程，不是为人
4. **自动化维护**：使用脚本保持清单更新
5. **列出依赖项**：在系统和子 Skill 中提及所需的包
6. **与队友一起测试**：验证路由和清晰度
7. **版本化您的系统**：在内容中记录变更
8. **使用渐进式披露**：将细节放在单独的文件中，如 reference.md 和 examples.md

## 验证检查清单

在最终确定系统级 Skill 之前，请验证：

- [ ] 名称仅包含小写字母、连字符，最多 64 个字符
- [ ] 描述具体且少于 1024 个字符
- [ ] 描述包含 "what"（什么）、"when"（何时）和路由
- [ ] YAML frontmatter 有效
- [ ] 路由说明是分步骤的
- [ ] 子 Skill 示例具体且真实
- [ ] 自动化脚本和依赖项已记录
- [ ] 文件路径使用正斜杠
- [ ] 系统在相关查询时激活并路由
- [ ] Claude 正确遵循说明
- [ ] 子 Skill 的可选文件（如 reference.md、examples.md）正确配置和引用

## 故障排除

**系统未激活或未路由**:
- 使用触发词使描述更具体
- 在描述中包含子模块和操作
- 添加带有用户短语的 "Route when..."（当...时路由）子句

**子 Skill 冲突**:
- 使子描述更具区分度
- 使用不同的触发词
- 缩小每个子 Skill 的范围

**维护问题**:
- 检查 YAML 语法（无制表符，缩进正确）
- 验证脚本执行权限
- 确保 CI/CD 集成自动化更新

**可选文件未加载**:
- 确认子 Skill 目录中文件路径正确
- 在子 SKILL.md 中使用相对路径引用（如 [reference.md](reference.md)）
- 测试 Claude 是否在需要时加载这些文件

## 示例

查看完整示例的文档：
- 简单的路由系统 (enterprise-system)
- 具有工具权限的系统 (automation-hub)
- 多模块系统 (business-suite)，包含子 Skill 的 reference.md 和 examples.md

## 输出格式

当创建系统级 Skill 时，我将：

1. 询问关于范围、子 Skill 和需求的澄清性问题
2. 建议系统名称、位置和架构
3. 创建带有正确 frontmatter 的 SKILL.md 文件
4. 包含自动化脚本和技能清单
5. 添加子 Skill 模块，包括可选的 reference.md 和 examples.md
6. 提供测试和路由说明
7. 根据所有要求进行验证

结果将是一个完整、可工作的系统级 Skill，遵循所有最佳实践、模块化原则和验证规则。