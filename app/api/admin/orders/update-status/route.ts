export async function POST() {
  return Response.json(
    { error: "This endpoint is disabled. Use the active admin order status route instead." },
    { status: 410 }
  );
}
