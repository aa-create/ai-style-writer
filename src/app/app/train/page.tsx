import { TrainWorkspace } from "@/app/app/train/TrainWorkspace";
import {
  defaultGlobalPhrases,
  defaultPropagandaStyleRule,
} from "@/lib/defaults";
import { createClient } from "@/lib/supabase/server";

const initialSnapshot = {
  phrases: defaultGlobalPhrases.phrases,
  learnedArticles: [],
  styleRules: defaultPropagandaStyleRule,
  stats: { learned_count: 0 },
  counts: { learnedCount: 0, phraseCount: 0, expressionCount: 0, templateCount: 0 },
};

export default async function TrainPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return <TrainWorkspace initialSnapshot={initialSnapshot} />;
}
