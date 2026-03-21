import { INFO_PROMPT } from "@/lib/prompts/info";
import { MEETING_PROMPT } from "@/lib/prompts/meeting";
import { RESEARCH_PROMPT } from "@/lib/prompts/research";
import { SUMMARY_PROMPT } from "@/lib/prompts/summary";

export const SCENES = [
  { key: "summary", label: "总结", desc: "年终总结、阶段总结、自查报告、述职报告" },
  { key: "meeting", label: "会议记录", desc: "会议纪要、座谈会纪要、专题会议纪要" },
  { key: "info", label: "信息", desc: "工作信息、简报、新闻通讯、活动报道" },
  { key: "research", label: "调研", desc: "调研报告、调查报告、典型经验材料" },
] as const;

export type SceneKey = (typeof SCENES)[number]["key"];

export const SCENE_PROMPTS: Record<SceneKey, string> = {
  summary: SUMMARY_PROMPT,
  meeting: MEETING_PROMPT,
  info: INFO_PROMPT,
  research: RESEARCH_PROMPT,
};
