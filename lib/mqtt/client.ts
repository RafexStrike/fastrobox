import "server-only";
import mqtt, { type MqttClient } from "mqtt";
import { pool } from "@/lib/db";

type JsonRecord = Record<string, unknown>;

type Telemetry = {
  uptimeS: number;
  tempC: number;
  rh: number;
  heatIndexC: number;
  flame: boolean;
  door: string;
  status: string;
  heatTrend: string;
  rssi: number;
  heapKb: number;
  chipTempC: number;
  fw: string;
  quality: string;
};

type NormalizedMessage = {
  deviceId: string;
  roomId: string;
  seq: number;
  timestamp: string;
  payload: JsonRecord;
} & (
  | { kind: "telemetry"; telemetry: Telemetry }
  | { kind: "event"; eventType: string; detail: unknown }
);

const globalForMqtt = globalThis as typeof globalThis & {
  fastroboxMqttClient?: MqttClient;
  fastroboxMqttOfflineTimer?: NodeJS.Timeout;
};

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseTimestamp(value: unknown): string | undefined {
  const date =
    typeof value === "number"
      ? new Date(value * 1_000)
      : typeof value === "string"
        ? new Date(value)
        : undefined;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function normalizeMessage(value: unknown): NormalizedMessage | undefined {
  if (!isRecord(value)) return undefined;

  if (
    isText(value.deviceId) &&
    isText(value.roomId) &&
    Number.isSafeInteger(value.seq) &&
    Number(value.seq) >= 0
  ) {
    const timestamp = parseTimestamp(value.ts);
    const telemetry: Telemetry = {
      uptimeS: value.uptimeS as number,
      tempC: value.tempC as number,
      rh: value.rh as number,
      heatIndexC: value.heatIndexC as number,
      flame: value.flame as boolean,
      door: value.door as string,
      status: value.status as string,
      heatTrend: value.heatTrend as string,
      rssi: value.rssi as number,
      heapKb: value.heapKb as number,
      chipTempC: value.chipTempC as number,
      fw: value.fw as string,
      quality: value.quality as string,
    };
    const validTelemetry =
      timestamp !== undefined &&
      Number.isSafeInteger(telemetry.uptimeS) &&
      isFiniteNumber(telemetry.tempC) &&
      isFiniteNumber(telemetry.rh) &&
      isFiniteNumber(telemetry.heatIndexC) &&
      typeof telemetry.flame === "boolean" &&
      isText(telemetry.door) &&
      isText(telemetry.status) &&
      isText(telemetry.heatTrend) &&
      Number.isInteger(telemetry.rssi) &&
      isFiniteNumber(telemetry.heapKb) &&
      isFiniteNumber(telemetry.chipTempC) &&
      isText(telemetry.fw) &&
      isText(telemetry.quality);

    if (!validTelemetry) return undefined;
    return {
      kind: "telemetry",
      deviceId: value.deviceId,
      roomId: value.roomId,
      seq: Number(value.seq),
      timestamp,
      telemetry,
      payload: value,
    };
  }

  if (
    isText(value.device_id) &&
    isText(value.room_id) &&
    Number.isSafeInteger(value.seq) &&
    Number(value.seq) >= 0 &&
    isText(value.type) &&
    Object.hasOwn(value, "detail")
  ) {
    const timestamp = parseTimestamp(value.ts);
    if (!timestamp) return undefined;
    return {
      kind: "event",
      deviceId: value.device_id,
      roomId: value.room_id,
      seq: Number(value.seq),
      timestamp,
      eventType: value.type,
      detail: value.detail,
      payload: value,
    };
  }

  return undefined;
}

async function persistMessage(message: NormalizedMessage): Promise<boolean> {
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const telemetry = message.kind === "telemetry" ? message.telemetry : undefined;
    const eventType = message.kind === "event" ? message.eventType : null;
    const detail = message.kind === "event" ? JSON.stringify(message.detail) : null;
    const inserted = await connection.query(
      `INSERT INTO sensor_messages (
         device_id, room_id, seq, message_kind, message_ts, event_type, detail,
         uptime_s, temp_c, rh, heat_index_c, flame, door, status, heat_trend,
         rssi, heap_kb, chip_temp_c, fw, quality, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19, $20, $21::jsonb
       )
       ON CONFLICT (device_id, seq) DO NOTHING`,
      [
        message.deviceId,
        message.roomId,
        message.seq,
        message.kind,
        message.timestamp,
        eventType,
        detail,
        telemetry?.uptimeS ?? null,
        telemetry?.tempC ?? null,
        telemetry?.rh ?? null,
        telemetry?.heatIndexC ?? null,
        telemetry?.flame ?? null,
        telemetry?.door ?? null,
        telemetry?.status ?? null,
        telemetry?.heatTrend ?? null,
        telemetry?.rssi ?? null,
        telemetry?.heapKb ?? null,
        telemetry?.chipTempC ?? null,
        telemetry?.fw ?? null,
        telemetry?.quality ?? null,
        JSON.stringify(message.payload),
      ],
    );

    await connection.query(
      `INSERT INTO mqtt_devices (device_id, room_id, last_seen_at, is_online)
       VALUES ($1, $2, clock_timestamp(), true)
       ON CONFLICT (device_id) DO UPDATE
         SET room_id = EXCLUDED.room_id,
             last_seen_at = EXCLUDED.last_seen_at,
             is_online = true`,
      [message.deviceId, message.roomId],
    );
    await connection.query("COMMIT");
    return inserted.rowCount === 1;
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

async function markStaleDevicesOffline(): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE mqtt_devices
          SET is_online = false
        WHERE is_online
          AND last_seen_at < clock_timestamp() - interval '25 seconds'`,
    );
    if (result.rowCount) {
      console.info(`[mqtt] marked ${result.rowCount} device(s) offline`);
    }
  } catch (error) {
    console.error("[mqtt] offline status update failed", { code: errorCode(error) });
  }
}

function shutdownMqtt(signal: string): void {
  const client = globalForMqtt.fastroboxMqttClient;
  if (!client) return;

  if (globalForMqtt.fastroboxMqttOfflineTimer) {
    clearInterval(globalForMqtt.fastroboxMqttOfflineTimer);
  }
  console.info(`[mqtt] graceful shutdown requested (${signal})`);
  void client
    .endAsync(false)
    .then(() => console.info("[mqtt] connection closed"))
    .catch((error: unknown) => {
      console.error("[mqtt] graceful shutdown failed", { code: errorCode(error) });
    });
}

export function sendDeviceCommand(command: string, payload: Record<string, unknown>) {
  const client = globalForMqtt.fastroboxMqttClient;
  const topic = process.env.MQTT_COMMAND_TOPIC?.trim() || "fastrobox/command";

  if (!client) {
    console.warn("[mqtt] command skipped because the broker client is not connected");
    return { ok: false as const, reason: "mqtt-unavailable" };
  }

  const message = JSON.stringify({
    type: "command",
    command,
    payload,
    ts: new Date().toISOString(),
  });

  return new Promise<{ ok: true }>((resolve, reject) => {
    client.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ ok: true });
    });
  });
}

export function startMqttClient(): MqttClient | undefined {
  if (globalForMqtt.fastroboxMqttClient) {
    return globalForMqtt.fastroboxMqttClient;
  }

  const host = process.env.MQTT_HOST?.trim() || "broker.emqx.io";
  const port = Number(process.env.MQTT_PORT?.trim() || "8883");
  const topic = process.env.MQTT_TOPIC?.trim() || "buddhi-kom-sensor-beshi";

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("[mqtt] invalid MQTT_PORT; subscriber not started");
    return undefined;
  }

  const username = process.env.MQTT_USERNAME?.trim();
  const password = process.env.MQTT_PASSWORD;
  const client = mqtt.connect(`mqtts://${host}:${port}`, {
    rejectUnauthorized: true,
    reconnectPeriod: 5_000,
    connectTimeout: 30_000,
    clean: true,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
  });

  globalForMqtt.fastroboxMqttClient = client;

  client.on("connect", () => {
    console.info(`[mqtt] connected to ${host}:${port}`);
    client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        console.error("[mqtt] subscription failed", {
          topic,
          code: errorCode(error),
        });
        return;
      }
      console.info(`[mqtt] subscribed to ${topic}`);
    });
  });

  client.on("reconnect", () => console.info("[mqtt] reconnecting"));
  client.on("offline", () => console.warn("[mqtt] broker connection is offline"));
  client.on("close", () => console.warn("[mqtt] broker connection closed"));
  client.on("error", (error) => {
    console.error("[mqtt] connection error", { code: errorCode(error) });
  });

  client.on("message", (messageTopic, payload) => {
    let payloadJson: unknown;
    try {
      payloadJson = JSON.parse(payload.toString("utf8"));
    } catch {
      console.warn("[mqtt] malformed JSON message", {
        topic: messageTopic,
        bytes: payload.byteLength,
      });
      return;
    }

    console.info("[mqtt] JSON message received", {
      topic: messageTopic,
      payload: payloadJson,
    });
    const message = normalizeMessage(payloadJson);
    if (!message) {
      console.warn("[mqtt] JSON message does not match telemetry or event format", {
        topic: messageTopic,
      });
      return;
    }

    void persistMessage(message)
      .then((inserted) => {
        if (inserted) {
          console.info("[mqtt] message stored", {
            deviceId: message.deviceId,
            seq: message.seq,
            kind: message.kind,
            ...(message.kind === "event" ? { type: message.eventType } : {}),
          });
        } else {
          console.info("[mqtt] replayed sequence ignored", {
            deviceId: message.deviceId,
            seq: message.seq,
          });
        }
      })
      .catch((error: unknown) => {
        console.error("[mqtt] database persistence failed", {
          code: errorCode(error),
        });
      });
  });

  void markStaleDevicesOffline();
  globalForMqtt.fastroboxMqttOfflineTimer = setInterval(() => {
    void markStaleDevicesOffline();
  }, 5_000);
  globalForMqtt.fastroboxMqttOfflineTimer.unref();

  process.once("SIGTERM", () => shutdownMqtt("SIGTERM"));
  process.once("SIGINT", () => shutdownMqtt("SIGINT"));

  console.info(`[mqtt] connecting to ${host}:${port}`);
  return client;
}