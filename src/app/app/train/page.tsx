import { redirect } from "next/navigation";
import { TrainWorkspace } from "@/app/app/train/TrainWorkspace";
import { defaultGlobalPhrases, defaultPropagandaStyleRule } from "@/lib/defaults";
import { getCurrentUserId } from "@/lib/auth";

const initialSnapshot = {
  phrases: defaultGlobalPhrases.phrases,
  learnedArticles: [],
  styleRules: defaultPropagandaStyleRule,
  stats: { learned_count: 0 },
  counts: { learnedCount: 0, phraseCount: 0, expressionCount: 0, templateCount: 0 },
};

export default function TrainPage() {
  if (!getCurrentUserId()) {
    redirect("/login");
  }

  return <TrainWorkspace initialSnapshot={initialSnapshot} />;
}
