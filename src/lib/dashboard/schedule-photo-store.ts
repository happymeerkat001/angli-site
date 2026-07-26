import { kv } from "@vercel/kv";

export type SchedulePhotoState = {
  url: string;
  uploadedAt: string;
};

export const STATE_KEY = "dashboard:schedule-photo:state";

const enabled = () => Boolean(process.env.KV_REST_API_URL);

export async function readSchedulePhotoState(): Promise<SchedulePhotoState | null> {
  return enabled() ? await kv.get<SchedulePhotoState>(STATE_KEY) : null;
}

export async function writeSchedulePhotoState(state: SchedulePhotoState | null) {
  if (enabled()) await kv.set(STATE_KEY, state);
}
