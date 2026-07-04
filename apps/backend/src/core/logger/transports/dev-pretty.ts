import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";

export function createDevPrettyTransport(enabled: boolean) {
  return getSimplePrettyTerminal({
    enabled,
    runtime: "node",
    viewMode: "expanded",
  });
}
