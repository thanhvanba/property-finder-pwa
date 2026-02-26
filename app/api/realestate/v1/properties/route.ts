import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_BASE = "https://product.annk.info/api/realestate/v1";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.search; // preserve any query params if needed later

  const res = await fetch(`${EXTERNAL_BASE}/properties${search}`, {
    // Server-side fetch, không bị CORS
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

export async function POST(req: NextRequest) {
  const body = await req.text();

  const res = await fetch(`${EXTERNAL_BASE}/properties`, {
    method: "POST",
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

