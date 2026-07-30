export type StoredRecording = {
  id: string;
  stageNo: number;
  attemptNo: number;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: string;
};

const DATABASE_NAME = "ailuv-patient-mock";
const STORE_NAME = "recordings";
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("IndexedDB could not be opened.")),
    );
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("Local recording storage failed.")),
    );
    transaction.addEventListener("complete", () => database.close());
    transaction.addEventListener("abort", () => database.close());
  });
}

export function saveRecording(recording: StoredRecording): Promise<IDBValidKey> {
  return withStore("readwrite", (store) => store.put(recording));
}

export async function listRecordings(): Promise<StoredRecording[]> {
  const records = await withStore<StoredRecording[]>("readonly", (store) =>
    store.getAll(),
  );
  return records.sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export function clearRecordings(): Promise<undefined> {
  return withStore("readwrite", (store) => store.clear());
}

export function deleteRecording(id: string): Promise<undefined> {
  return withStore("readwrite", (store) => store.delete(id));
}
