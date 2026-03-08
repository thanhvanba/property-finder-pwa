import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_BASE = "https://product.annk.info/api/realestate/v1";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, ctx: RouteParams) {
  const { id } = await ctx.params;

  const res = await fetch(`${EXTERNAL_BASE}/properties/${id}`, {
    cache: "no-store",
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  const { id } = await ctx.params;
  const body = await req.text();

  const res = await fetch(`${EXTERNAL_BASE}/properties/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

