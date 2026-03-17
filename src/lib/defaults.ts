export type PhraseMap = Record<string, string[]>;

export type SubtitleStyle = {
  name: string;
  pattern: string;
  example: string;
};

export type MaterialStyleRules = {
  rules: {
    title_max_length: number;
    title_pattern: string;
    body_paragraphs: string;
    paragraph_structure: string;
    max_chars_per_paragraph: number;
    title_patterns: string[];
    intro_templates: string[];
    paragraph_patterns: string[];
  };
  type_phrases: PhraseMap;
  subtitle_styles: SubtitleStyle[];
  style_summary: string;
  example_paragraphs: string[];
  stats: {
    learned_count: number;
  };
};

export const defaultGlobalPhrases: { phrases: PhraseMap } = {
  phrases: {
    政治: ["贯彻落实", "决策部署", "高质量发展", "守正创新"],
    举措: ["走深走实", "持续发力", "凝心聚力", "多措并举", "统筹推进"],
    成效: ["入脑入心", "见行见效", "提质增效", "成效显著"],
    自定义: [],
    特殊表达: [],
  },
};

export const defaultSubtitleStyles: SubtitleStyle[] = [
  { name: "字诀式", pattern: "以“X”字+动词短语", example: "以“实”字当头 扎实推进基层治理" },
  { name: "动宾式", pattern: "动词+宾语+补充", example: "强化督查指导 确保举措落地" },
  { name: "聚焦式", pattern: "聚焦/依托+名词+动词", example: "聚焦核心环节 破题改革攻坚" },
];

export const defaultPropagandaStyleRule: MaterialStyleRules = {
  rules: {
    title_max_length: 30,
    title_pattern: "【单位】+【动作】+【目标】",
    body_paragraphs: "3-4段",
    paragraph_structure: "小标题→展开句→举例句→成效句",
    max_chars_per_paragraph: 200,
    title_patterns: [],
    intro_templates: [],
    paragraph_patterns: [],
  },
  type_phrases: {
    自定义: [],
  },
  subtitle_styles: defaultSubtitleStyles,
  style_summary: "",
  example_paragraphs: [],
  stats: {
    learned_count: 0,
  },
};
