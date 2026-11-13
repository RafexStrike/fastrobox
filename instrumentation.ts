export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMqttClient } = await import("@/lib/mqtt/client");
    startMqttClient();
  }
}