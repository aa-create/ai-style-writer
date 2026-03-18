import { redirect } from "next/navigation";
import { WriteWorkspace } from "@/app/app/write/WriteWorkspace";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateUserData } from "@/lib/style-service";

export default async function WritePage() {
  const userId = getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  await getOrCreateUserData(userId);

  return <WriteWorkspace />;
}
