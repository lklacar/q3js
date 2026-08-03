import { Fragment } from "react";
import { cn } from "@/lib/utils";

const quakeColors: Record<string, string | undefined> = {
  "0": "#202020",
  "1": "#ff4f4f",
  "2": "#55d86a",
  "3": "#f4d95b",
  "4": "#61a0ff",
  "5": "#55d6df",
  "6": "#db73ef",
  "7": undefined,
  "8": "#ef9b4e",
  "9": "#b8b8b8",
};

interface Segment {
  color?: string;
  text: string;
}

function segments(value: string): Segment[] {
  const result: Segment[] = [];
  let color: string | undefined;
  let text = "";

  const flush = () => {
    if (text) {
      result.push({ color, text });
      text = "";
    }
  };

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "^") {
      text += value[index];
      continue;
    }

    const code = value[index + 1];
    if (code === "^") {
      text += "^";
      index += 1;
      continue;
    }
    if (code && code in quakeColors) {
      flush();
      color = quakeColors[code];
      index += 1;
      continue;
    }
    if (code?.toLowerCase() === "x") {
      const hex = value.slice(index + 2, index + 8);
      if (/^[0-9a-f]{6}$/i.test(hex)) {
        flush();
        color = `#${hex}`;
        index += 7;
        continue;
      }
    }
    text += "^";
  }

  flush();
  return result;
}

export function Q3ColoredText({
  className,
  text,
}: Readonly<{ className?: string; text: string }>) {
  return (
    <span className={cn("align-middle", className)}>
      {segments(text).map((segment, index) => (
        <Fragment key={`${index}-${segment.text}`}>
          {segment.color ? <span style={{ color: segment.color }}>{segment.text}</span> : segment.text}
        </Fragment>
      ))}
    </span>
  );
}
