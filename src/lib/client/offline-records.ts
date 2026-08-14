"use client";

const databaseName = "polar-offline";
const storeName = "records";

export type OfflineRecordPayload = {
  clientId: string;
  patientId: string;
  mealType: string;
  glucose: number;
  carbs: number;
  activeInsulin: number;
  activityAdjustmentPercent: number;
  administeredDose: number | null;
  notes: string | null;
  occurredAt: string;
};

type OfflineRecord = {
  clientId: string;
  payload: OfflineRecordPayload;
  queuedAt: string;
};

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "clientId" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function recordsFromDatabase() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    return await requestValue(transaction.objectStore(storeName).getAll()) as OfflineRecord[];
  } finally {
    database.close();
  }
}

async function publishStatus() {
  const pending = await countQueuedRecords().catch(() => 0);
  window.dispatchEvent(new CustomEvent("polar:sync-status", { detail: { pending } }));
  return pending;
}

export async function countQueuedRecords() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    return await requestValue(transaction.objectStore(storeName).count());
  } finally {
    database.close();
  }
}

export async function enqueueRecord(payload: OfflineRecordPayload) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await requestValue(transaction.objectStore(storeName).put({
      clientId: payload.clientId,
      payload,
      queuedAt: new Date().toISOString(),
    } satisfies OfflineRecord));
  } finally {
    database.close();
  }
  await publishStatus();
}

async function removeRecord(clientId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await requestValue(transaction.objectStore(storeName).delete(clientId));
  } finally {
    database.close();
  }
}

export async function flushQueuedRecords() {
  if (!navigator.onLine) return { synced: 0, pending: await publishStatus() };
  const records = await recordsFromDatabase();
  let synced = 0;
  for (const record of records) {
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record.payload),
      });
      if (!response.ok) {
        if (response.status >= 500) break;
        continue;
      }
      await removeRecord(record.clientId);
      synced += 1;
    } catch {
      break;
    }
  }
  const pending = await publishStatus();
  if (synced) window.dispatchEvent(new Event("polar:center-refresh"));
  return { synced, pending };
}

export async function initializeOfflineRecords() {
  await publishStatus();
  if (navigator.onLine) await flushQueuedRecords();
}
