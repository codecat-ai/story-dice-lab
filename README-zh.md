# Story Dice Lab

[English](README.md) | [中文](README-zh.md) | [日本語](README-ja.md)


Story Dice Lab 是一个本地优先的浏览器应用，用来生成确定性的创意写作提示。

## 问题与动机

写作者、教师和桌游主持人经常需要快速、有趣、可复现且便于分享的提示，同时不想依赖账号或网络请求。

## 功能

- 六类提示骰子：角色、目标、场景、阻碍、物件和反转。
- 基于种子的确定性结果，适合课堂和工作坊复用。
- 可一次重掷全部骰子，也可单独重掷某一个骰子。
- 可锁定骰子，让“重掷全部”保留最有用的想法。
- 可复制紧凑的纯文本提示。
- 可复制确定性的五拍场景大纲，用全部六类骰子生成开场画面、欲望、复杂化、转折点和结尾钩子。
- 可复制确定性的可打印工作坊讲义，包含种子、六类骰子和三个场景构思问题。
- 可复制确定性的主持人议程，可编辑标题和总分钟数，并包含计时阶段以及把骰子类别连接到场景决策的提示。
- 可复制 Markdown 提示，其中骰子值会转义 Markdown 敏感字符，并复用同样的工作坊问题。
- 可将当前提示作为适合工作坊的浏览器打印页打印，并在打印时隐藏控件。
- 可复制可分享的 URL hash，用于恢复种子和锁定骰子。
- 可导入包含六类骰子的自定义 JSON 词库，并复制/导出规范化后的 JSON。
- 可访问、支持键盘操作的控件。

## 安装

Story Dice Lab 目前只发布在 GitHub。它尚未发布到 npm，因此没有经过验证的 `npm install -g` 或 `npx` 命令。

```bash
git clone https://github.com/codecat-ai/story-dice-lab.git
cd story-dice-lab
npm ci
```

## 快速开始

```bash
npm run dev
```

打开终端中显示的本地 Vite 地址。

## 示例

使用种子 `moonlit workshop`，锁定场景，然后重掷其他骰子，直到提示适合你的场景。点击 **Copy outline** 可复制五拍场景大纲，点击 **Copy handout** 可复制可打印的工作坊讲义，在点击 **Copy agenda** 前设置议程标题和总分钟数，即可复制供教师或写作小组主持人使用的场景冲刺议程；点击 **Copy Markdown** 可将 Markdown 提示复制到笔记或 issue 线程中，点击 **Print prompt sheet** 可为当前提示打开浏览器打印流程，或点击 **Copy share link** 保存或发送类似 `#seed=moonlit+workshop&locked=setting` 的 URL hash。

大纲预览包含种子和五个节拍：开场画面、欲望、复杂化、转折点和结尾钩子。这些节拍会共同复用当前结果中的角色、目标、场景、阻碍、物件和反转。

议程预览包含种子、六类骰子、会按所选总分钟数缩放的五个计时阶段，以及把角色/目标、阻碍/场景、物件/反转连接到具体场景选择的主持人提示。

若要使用自定义词库，请粘贴包含全部六类的 JSON：

```json
{
  "character": ["curious pilot"],
  "want": ["to find dawn"],
  "setting": ["clock market"],
  "obstacle": ["a locked moon"],
  "object": ["silver key"],
  "twist": ["the map is alive"]
}
```

点击 **Import word bank** 验证并规范化词库。点击 **Copy/export word bank** 复制当前启用的规范化 JSON。

## 配置

无需配置。应用在本地浏览器中运行，不调用远程 API。自定义词库 JSON 只在浏览器本地处理。

## 开发

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## 测试

行为测试位于 `tests/storyDice.test.ts`，覆盖确定性结果、锁定行为、单骰重掷、提示格式化、五拍场景大纲导出、工作坊讲义导出、主持人议程导出、时间缩放和 UI 控件、Markdown 提示导出、打印布局格式化、浏览器打印触发，以及自定义词库导入/导出。

## 路线图

- 更多适合课堂使用的打印布局。

## 贡献

欢迎提交 issue 和小型 PR。请保持本地优先、可访问，并用行为测试覆盖变更。

## 许可证

MIT。见 `LICENSE`。

## 维护说明

本项目在 AI 辅助下维护，并通过测试和 CI 验证变更。
