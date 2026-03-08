import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_BASE = "https://product.annk.info/api/realestate/v1";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.search;

  const res = await fetch(`${EXTERNAL_BASE}/imagekit/auth${search}`, {
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

