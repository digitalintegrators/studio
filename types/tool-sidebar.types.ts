type Tool = "screenshot" | "elements" | "audio" | "zoom" | "mockup" | "cursor" | "videos";

export interface ToolsSidebarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
}