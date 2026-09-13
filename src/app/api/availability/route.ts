import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/availability";

const schema = z.object({
  stylistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalDurationMinutes: z.number().int().positive(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { stylistId, date, totalDurationMinutes } = parsed.data;
  const slots = await getAvailableSlots(stylistId, date, totalDurationMinutes);

  return NextResponse.json({ slots });
}
