import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id") || process.env.NEXT_PUBLIC_AGENT_ID || "agent_0701m4qgzp9efg582te690zt2mwf";
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured on server" },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch WebRTC conversation token (LiveKit WebRTC - same engine used on elevenlabs.io/agents/telecommunications)
    const tokenRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      return NextResponse.json({
        connectionType: "webrtc",
        conversationToken: tokenData.token,
        conversationId: tokenData.conversation_id,
        agentId,
      });
    }

    // 2. Fallback to signed URL if WebRTC token is unavailable
    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!signedUrlRes.ok) {
      const errText = await signedUrlRes.text();
      return NextResponse.json(
        { error: `Failed to authenticate: ${errText}` },
        { status: signedUrlRes.status }
      );
    }

    const signedUrlData = await signedUrlRes.json();
    return NextResponse.json({
      connectionType: "websocket",
      signedUrl: signedUrlData.signed_url,
      agentId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Network error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
