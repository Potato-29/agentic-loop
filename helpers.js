import * as path from "node:path";

export const isPathAllowed = async (requested_path, callTool) => {
  const fullPath = path.resolve(requested_path);
  const root = path.resolve("F:\\projs\\agentic-loop\\.agent_workspace");
  if (!fullPath.startsWith(root)) {
    return "path not allowed";
  }
  return await callTool();
};
