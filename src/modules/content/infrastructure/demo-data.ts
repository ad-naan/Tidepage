import type { Article } from "../domain/models";

export const articles: Omit<Article, "updatedAt">[] = [
  {
    slug: "the-productivity-paradox",
    title: "AI 时代的效率悖论：当生产力提升反而带来疲惫",
    date: "2026-10-10",
    category: "技术",
    tags: ["AI", "productivity", "思考"],
    minutes: 6,
    sketch: "sun",
    excerpt:
      "工具替我们省下了时间，然后呢？也许真正稀缺的从来不是速度，而是注意力。",
    sections: [
      {
        title: "更快，并不总是更好",
        paragraphs: [
          "以前，一个下午只能完成一件事。现在，打开编辑器，把想法交给 AI，十分钟后就有了第一版。速度变快了，但关上电脑的时候，满足感却没有按比例增长。",
          "这篇手记记录一个小实验：把“今天做了多少”换成“今天有什么值得记住”。当衡量的单位改变，工作也开始呈现不同的样子。",
        ],
      },
      {
        title: "把省下来的时间还给生活",
        paragraphs: [
          "效率工具很容易制造一种错觉：既然这一件事只花了十分钟，剩下的时间就应该再塞进五件事。但空白不是浪费，它是让想法长出根的地方。",
          "我开始在日程里留一段没有名字的时间。不做总结，也不追求产出。去散步，磨一杯咖啡，或者只是看着窗外。很多困住我的问题，恰好是在这些空白里松动的。",
        ],
      },
      {
        title: "一个更温柔的工作方式",
        paragraphs: [
          "给一天设置结束的条件，而不是无限延伸的待办。选择一件真正想完成的事，然后允许自己在做完之后停下来。",
          "工具应当帮我们接近想过的生活。创造的意义，不只是把世界填满，也是在里面找到属于自己的节奏。",
        ],
      },
    ],
  },
  {
    slug: "ai-native-workflow",
    title: "我的 AI Native iOS 开发验证工作流",
    date: "2026-09-22",
    category: "技术",
    tags: ["iOS", "Claude Code", "工具链"],
    minutes: 8,
    sketch: "mountain",
    excerpt: "从一个模糊的念头，到可以握在手中的原型。让反馈更早发生。",
    sections: [
      {
        title: "从最小的问题开始",
        paragraphs: [
          "一个产品的起点，不应该是一张长长的功能清单，而是一个具体的生活场景：谁，在什么时候，为什么需要它？",
          "先把这个问题写成三句话，再做一个只有核心路径的原型。这个阶段的目标是理解问题，而不是证明自己的方案。",
        ],
      },
      {
        title: "缩短反馈的回路",
        paragraphs: [
          "把需求拆成可以独立验证的小步：先布局，再状态，再数据，最后才是那些让人会心一笑的细节。每完成一步，都在真实设备上走一遍。",
          "AI 可以生成很多代码，但判断体验是否自然，依然需要亲手触摸屏幕。记录不舒服的瞬间，比记录完成的功能更有用。",
        ],
      },
    ],
  },
  {
    slug: "make-a-small-mv",
    title: "用 Claude Code、Codex 和 Remotion 做一支 MV",
    date: "2026-08-14",
    category: "技术",
    tags: ["AI", "视频", "创作"],
    minutes: 5,
    sketch: "boat",
    excerpt: "当代码拥有节奏，平凡的素材也能讲出自己的故事。",
    sections: [
      {
        title: "先有故事，再有画面",
        paragraphs: [
          "想做一支关于夏天的小短片。没有宏大的叙事，只有风、树影、缓慢移动的云，以及一些不想忘记的瞬间。",
          "先听音乐，在纸上标记情绪转折的位置。把每段旋律对应到一个动作或颜色，然后才打开编辑器。",
        ],
      },
      {
        title: "让代码跟着音乐呼吸",
        paragraphs: [
          "用组件组织场景，用时间轴安排出场。动画最动人的地方，往往不是复杂，而是恰好落在某个节拍上的停顿。",
          "第一次渲染出来的时候，所有东西都太着急了。我把一半的转场删掉，又给每个画面多留了两秒。于是故事终于开始呼吸。",
        ],
      },
    ],
  },
  {
    slug: "electron-update",
    title: "把 Electron 更新做快：我在 OTA 上的几次推倒重来",
    date: "2026-07-02",
    category: "技术",
    tags: ["Electron", "工程", "踩坑"],
    minutes: 10,
    sketch: "tree",
    excerpt: "一次更新体验的打磨，也是一次关于可靠性的重新思考。",
    sections: [
      {
        title: "更新应该安静地发生",
        paragraphs: [
          "最好的更新体验，是用户几乎不需要理解“更新”这件事。下载、校验、安装，每一步都应该有明确的边界和失败后的退路。",
          "这份设计笔记围绕一个简单的原则展开：任何时刻中断更新，应用都应该依然可用。",
        ],
      },
      {
        title: "先设计失败的路径",
        paragraphs: [
          "网络会断开，磁盘可能不足，下载的文件可能不完整。把这些情况先画在纸上，再决定成功的路径，会让架构简单许多。",
          "分阶段写入、完整性校验、保留上一版本、允许重试。这些朴素的做法，比一个聪明却脆弱的方案更值得信任。",
        ],
      },
    ],
  },
  {
    slug: "a-week-of-lody",
    title: "一天原型，一周成品：开发 Lody iOS 实况",
    date: "2026-06-13",
    category: "产品",
    tags: ["iOS", "React Native", "独立开发"],
    minutes: 7,
    sketch: "sun",
    excerpt: "一个白噪音小工具的诞生。把对安静的向往，写成可以使用的产品。",
    sections: [
      {
        title: "做一个足够小的东西",
        paragraphs: [
          "Lody 是这里的一个概念项目：让雨声、风声和咖啡馆的背景声，组成一小块属于自己的空间。没有排行榜，没有打卡，打开就可以停留。",
          "第一版只保留三个声音和一个计时器。范围足够小，才有时间认真对待每一个按钮的反馈。",
        ],
      },
      {
        title: "在细节里表达态度",
        paragraphs: [
          "声音淡入要慢一点，停止按钮要容易找到，深夜的界面不要刺眼。这些看起来微不足道的决定，构成了产品的性格。",
          "独立开发的快乐，是每一个细节都可以有自己的答案。也许做得很小，但可以做得很认真。",
        ],
      },
    ],
  },
  {
    slug: "take-a-walk",
    title: "没有目的地的散步，是一天里最好的部分",
    date: "2026-05-26",
    category: "生活",
    tags: ["日常", "散步"],
    minutes: 3,
    sketch: "tree",
    excerpt: "把手机收进口袋，重新看看这个熟悉又陌生的街区。",
    sections: [
      {
        title: "走出熟悉的路线",
        paragraphs: [
          "今天拐进了一条平时不会走的小路。墙角开着不知名字的花，一只猫躺在电动车坐垫上。没有什么特别的事情发生，但心情忽然变得很好。",
          "我们总想在远方寻找新鲜，却常常忽略生活里还有许多没有认真看过的角落。",
        ],
      },
      {
        title: "留一点无用的时间",
        paragraphs: [
          "不听播客，不统计步数，也不急着拍照。让脚步替自己决定方向，让注意力跟着光走。",
          "回来的时候问题还在那里，但我已经不再是出门之前的我。",
        ],
      },
    ],
  },
];
export const notes = [
  {
    id: "n1",
    date: "10 月 24 日",
    mood: "翻过一页",
    text: "今天把一个反复卡住的小交互调顺了。想留住的不只是完成它的那一刻，也包括中间那些愿意再试一次的自己。",
    tag: "设计碎片",
    sketch: "boat" as const,
  },
  {
    id: "n2",
    date: "10 月 20 日",
    mood: "慢慢来",
    text: "把待办清单关掉，出去走了一会儿。秋天的光落在树叶上，忽然觉得，有些答案可以等明天再找。今天先好好生活。",
    tag: "生活切片",
    sketch: "tree" as const,
  },
  {
    id: "n3",
    date: "10 月 16 日",
    mood: "正在创造",
    text: "一个小作品完成了，另一个想法又冒出来。原来终点也可以是起点。先把这段过程存好，再写下一页。",
    tag: "独立开发",
    sketch: "sun" as const,
  },
  {
    id: "n4",
    date: "10 月 08 日",
    mood: "一点思考",
    text: "给走过的时间留一份副本。等以后回头看，还能记起当时在想什么，为什么出发，又是谁陪我走过了这一段。",
    tag: "关于记录",
    sketch: "mountain" as const,
  },
];
export const quotes = [
  {
    text: "让过去有处安放，\n让明天仍有期待。",
    author: "写给下一页的自己",
  },
  { text: "这一页写得慢一点，\n也没有关系。", author: "光阴手记" },
  {
    text: "把值得留下的存好，\n带着轻一点的自己继续走。",
    author: "关于重新出发",
  },
  {
    text: "一个人写下的光阴，\n也会因为相遇，有了我们的回声。",
    author: "给来到这里的你",
  },
  { text: "走完这一段，\n仍然可以重新出发。", author: "下一页，还在继续" },
];
export const projects = [
  {
    id: "lody",
    name: "Lody",
    subtitle: "给世界按下静音键",
    category: "产品",
    status: "概念作品",
    description:
      "一个关于专注与放松的声音空间。混合雨声、海浪和森林，找到自己的频率。",
    stack: ["React Native", "Expo", "Audio"],
    sketch: "boat" as const,
    color: "sage",
  },
  {
    id: "paper",
    name: "Paper Garden",
    subtitle: "让想法在这里生长",
    category: "开源",
    status: "设计探索",
    description:
      "用纸张的温度承载数字世界的想法。支持双向链接、每日记录与自由整理的笔记应用概念。",
    stack: ["Next.js", "React", "TypeScript"],
    sketch: "tree" as const,
    color: "sand",
  },
  {
    id: "spring",
    name: "Spring Lab",
    subtitle: "一些会呼吸的交互",
    category: "实验",
    status: "交互实验",
    description:
      "探索物理弹簧、拖拽和微交互的游乐场。下面的实验球可以拖动，松开后会弹回原位。",
    stack: ["Motion", "SVG", "React"],
    sketch: "sun" as const,
    color: "peach",
  },
];
