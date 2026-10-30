import type { Locale } from "@/shared/i18n/config";
import type { ArticleBlock } from "../domain/blocks";

export const demoArticleBlocks: Partial<
  Record<Locale, Record<string, ArticleBlock[]>>
> = {
  "zh-CN": {
    "the-productivity-paradox": [
      {
        type: "callout",
        tone: "tip",
        title: "留一点余地",
        text: "少做一点，留意更多。把一部分省下来的时间，留给没有目的的散步、阅读和发呆。",
      },
      {
        type: "movie",
        title: "红海龟",
        originalTitle: "The Red Turtle",
        year: 2016,
        director: "Michael Dudok de Wit",
        url: "https://www.sonyclassics.com/theredturtle/",
        note: "一座岛、潮汐与生命的节奏。适合在想慢下来时，安静看完的一部动画。",
      },
    ],
    "ai-native-workflow": [
      {
        type: "link",
        title: "Next.js · 官方文档",
        siteName: "nextjs.org",
        url: "https://nextjs.org/docs",
        description:
          "从路由、服务端渲染到数据获取，让每一轮实现都回到明确的约定与可验证的行为。",
      },
      {
        type: "code",
        language: "shell",
        caption: "为每一轮改动留下可重复的验证",
        code: "npm run check\nnpm run build",
      },
    ],
  },
  en: {
    "the-productivity-paradox": [
      {
        type: "callout",
        tone: "tip",
        title: "Leave a little room",
        text: "Do a little less, notice a little more. Keep some of the time you save for an unhurried walk, a book, or simply doing nothing.",
      },
      {
        type: "movie",
        title: "The Red Turtle",
        year: 2016,
        director: "Michael Dudok de Wit",
        url: "https://www.sonyclassics.com/theredturtle/",
        note: "An island, the tides, and the rhythm of a life. An animated film to sit with when you want to slow down.",
      },
    ],
    "ai-native-workflow": [
      {
        type: "link",
        title: "Next.js · Official documentation",
        siteName: "nextjs.org",
        url: "https://nextjs.org/docs",
        description:
          "Routing, server rendering, and data fetching: a shared reference for explicit contracts and verifiable behaviour.",
      },
      {
        type: "code",
        language: "shell",
        caption: "Repeatable checks for each change",
        code: "npm run check\nnpm run build",
      },
    ],
  },
};
