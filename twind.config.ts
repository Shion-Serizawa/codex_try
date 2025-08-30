import { Options } from "twind";

const config = {
  darkMode: "class",
  theme: { extend: {} },
  // Required by Fresh's twind plugin to locate this module at runtime
  selfURL: import.meta.url,
} as Options & { selfURL: string };

export default config;
