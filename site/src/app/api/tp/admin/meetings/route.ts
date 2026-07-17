import { apiError, ok, readJson } from "@/server/api-util";
import { requireAdminSession } from "@/server/session";
import { meetingCreateSchema } from "@/server/schemas";
import { listMeetings, createMeeting } from "@/server/repo/meetings";
import { calendarProvider } from "@/server/providers/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return ok({ meetings: listMeetings(), calendarProvider: calendarProvider().id });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const input = meetingCreateSchema.parse(await readJson(req));
    const meeting = await createMeeting(input);
    return ok({ meeting }, 201);
  } catch (e) {
    return apiError(e);
  }
}
