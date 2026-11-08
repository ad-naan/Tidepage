import type { LyricLine, MusicLyrics } from "@/shared/contracts/music";

const timestamp = /\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g;
const emptyMarker =
  /^(?:暂无歌词|暂时没有歌词|纯音乐[，,、\s]*(?:请欣赏)?|此歌曲为没有填词的纯音乐[，,\s]*请您欣赏|no lyrics(?: available)?|instrumental)[。.!！\s]*$/i;

/** Line-timed LRC only: word stamps are stripped rather than inventing word timing. */
export function parseLyrics(raw: string): MusicLyrics {
  const text = raw.replace(/^\uFEFF/, "").slice(0, 262144);
  // Positive LRC offset makes a line appear sooner (milliseconds).
  const offset =
    Number(text.match(/\[offset:\s*([+-]?\d+)\s*\]/i)?.[1] ?? 0) / 1000;
  const timed: LyricLine[] = [];
  const plain: string[] = [];
  let instrumental = false;
  for (const rawLine of text.split(/\r?\n/).slice(0, 2000)) {
    const times = [...rawLine.matchAll(timestamp)];
    const content = rawLine
      .replace(timestamp, "")
      .replace(/\[(?:ar|al|ti|au|by|offset|re|ve|length):[^\]]*\]/gi, "")
      .replace(/<\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?>/g, "")
      .trim()
      .slice(0, 600);
    if (emptyMarker.test(content)) {
      instrumental = true;
      continue;
    }
    if (!times.length) {
      if (content) plain.push(content);
      continue;
    }
    for (const match of times) {
      const time = Math.max(
        0,
        Number(match[1]) * 60 +
          Number(match[2]) +
          Number(`0.${match[3] ?? "0"}`) -
          offset,
      );
      timed.push({ time, text: content });
    }
  }
  const credit =
    /^(?:作词|作曲|编曲|制作人|词|曲|词曲|监制|出品|发行|lyrics|composer|arranger)\s*[:：]/i;
  if (
    instrumental &&
    timed.every((line) => !line.text || credit.test(line.text))
  )
    return { lines: [], plain: [] };
  timed.sort((a, b) => a.time - b.time);
  const lines: LyricLine[] = [];
  for (const line of timed) {
    const previous = lines.at(-1);
    if (previous?.time === line.time) {
      if (!previous.text) previous.text = line.text;
      else if (
        line.text &&
        line.text !== previous.text &&
        !previous.translation?.split(" / ").includes(line.text)
      )
        previous.translation = [previous.translation, line.text]
          .filter(Boolean)
          .join(" / ")
          .slice(0, 600);
    } else lines.push({ ...line });
  }
  // Empty timed lines are meaningful instrumental gaps, but not a lyrics document.
  return lines.some((line) => line.text)
    ? { lines: lines.slice(0, 1500), plain: [] }
    : { lines: [], plain: plain.slice(0, 500) };
}

export function activeLyricIndex(lines: LyricLine[], time: number) {
  if (!Number.isFinite(time)) return -1;
  let low = 0,
    high = lines.length - 1,
    found = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].time <= time) {
      found = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

export function lyricProgress(
  lines: LyricLine[],
  index: number,
  time: number,
  duration: number,
) {
  if (index < 0 || !lines[index]?.text) return 0;
  const start = lines[index].time;
  const end = lines[index + 1]?.time ?? duration;
  return end > start
    ? Math.min(1, Math.max(0, (time - start) / (end - start)))
    : 0;
}

export function lyricTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
