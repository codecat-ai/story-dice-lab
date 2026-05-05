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
- 可复制确定性的可打印工作坊讲义，包含种子、六类骰子和三个场景构思问题。
- 可复制可分享的 URL hash，用于恢复种子和锁定骰子。
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

使用种子 `moonlit workshop`，锁定场景，然后重掷其他骰子，直到提示适合你的场景。点击 **Copy handout** 可复制可打印的工作坊讲义，或点击 **Copy share link** 保存或发送类似 `#seed=moonlit+workshop&locked=setting` 的 URL hash。

## 配置

无需配置。应用在本地浏览器中运行，不调用远程 API。

## 开发

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## 测试

行为测试位于 `tests/storyDice.test.ts`，覆盖确定性结果、锁定行为、单骰重掷、提示格式化和工作坊讲义导出。

## 路线图

- 适合工作坊的打印布局。
- 可选的自定义词库导入/导出。

## 贡献

欢迎提交 issue 和小型 PR。请保持本地优先、可访问，并用行为测试覆盖变更。

## 许可证

MIT。见 `LICENSE`。

## 维护说明

本项目在 AI 辅助下维护，并通过测试和 CI 验证变更。
