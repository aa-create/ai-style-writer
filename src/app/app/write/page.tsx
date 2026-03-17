import { WriteWorkspace } from "@/app/app/write/WriteWorkspace";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUserData } from "@/lib/style-service";

export default async function WritePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  await getOrCreateUserData(user.id);

  return <WriteWorkspace />;
}
