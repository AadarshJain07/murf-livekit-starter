export async function getQuestState() {
  const res = await fetch("/api/quest");
  if (!res.ok) {
    throw new Error(`Failed to fetch quest state: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
