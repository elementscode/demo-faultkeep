export interface Frame {
  id: string;
  fn: string;
  file: string;
  line: number | null;
  col: number | null;
  lib: boolean;
}

const V8_CALL = /^\s*at\s+(.*)\s+\((.*?)(?::(\d+):(\d+))?\)\s*$/;
const V8_BARE = /^\s*at\s+(.*?)(?::(\d+):(\d+))?\s*$/;
const GECKO = /^(.*)@(.*?)(?::(\d+):(\d+))?\s*$/;

function shortFile(url: string): string {
  return url.replace(/^[a-z-]+:\/\/[^/]+/, "").replace(/[?#].*$/, "");
}

function isLib(fn: string, file: string): boolean {
  return file === "<anonymous>" || file === "" || /vendor|node_modules|runtime|webpack|chunk-/.test(file) || /^Array\.|^Promise\.|^JSON\./.test(fn);
}

/** The frames of a V8 or Gecko/WebKit stack, top first. Lines that are not frames are skipped. */
export function parseStack(stack: string): Frame[] {
  let frames: Frame[] = [];

  for (let line of stack.split("\n")) {
    let fn = "";
    let file = "";
    let ln: string | undefined;
    let col: string | undefined;
    let m: RegExpMatchArray | null;

    if ((m = line.match(V8_CALL))) {
      [, fn, file, ln, col] = m;
    } else if ((m = line.match(V8_BARE)) && /[/:<]/.test(m[1])) {
      [, file, ln, col] = m;
    } else if ((m = line.match(GECKO)) && m[2]) {
      [, fn, file, ln, col] = m;
    } else {
      continue;
    }

    let short = shortFile(file);
    frames.push({
      id: String(frames.length),
      fn: fn || "<anonymous>",
      file: short,
      line: ln ? Number(ln) : null,
      col: col ? Number(col) : null,
      lib: isLib(fn, short),
    });
  }

  return frames;
}
