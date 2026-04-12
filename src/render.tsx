import gradient from "gradient-string";
import pc from "picocolors";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface Spinner {
  start(msg: string): void;
  stop(msg: string): void;
}

export function createSpinner(): Spinner {
  let timer: ReturnType<typeof setInterval> | null = null;
  let idx = 0;

  return {
    start(msg: string) {
      idx = 0;
      const write = () => {
        const frame = pc.cyan(FRAMES[idx % FRAMES.length]!);
        process.stderr.write(`\r${frame}  ${msg}`);
        idx++;
      };
      write();
      timer = setInterval(write, 80);
    },
    stop(msg: string) {
      if (timer) clearInterval(timer);
      process.stderr.write(`\r\x1b[K`);
      console.log(msg);
    },
  };
}

const TITLE_TEXT = `
   ___ ___ ___   __ _____ ___   ___  __   ___ ___ ___     _____   __
  / __| _ \\ __| /  \\_   _| __| | _ \\/  \\ | _ \\ __| _ \\___| _ \\ \\ / /
 | (__|   / _| / /\\ \\| | | _|  |  _/ /\\ \\|  _/ _||   /___|  _/\\ V /
  \\___|_|_\\___|_/‾‾\\_\\_| |___|  |_|/_/‾‾\\_\\_| |___|_|_\\   |_|   |_|
`;

const theme = {
  blue: "#7aa2f7",
  cyan: "#89ddff",
  green: "#9ece6a",
  magenta: "#bb9af7",
  pink: "#ff79c6",
  yellow: "#e0af68",
};

export function renderTitle(): void {
  const g = gradient(Object.values(theme));
  console.log(g.multiline(TITLE_TEXT));
}
