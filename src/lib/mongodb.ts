import { MongoClient, Db } from "mongodb";

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 8000,
};

type MongoGlobal = typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
const g = global as MongoGlobal;

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error('Missing environment variable "MONGODB_URI"'));
  }
  const p = new MongoClient(uri, options).connect();
  // Don't cache a failed connection — the next request retries.
  p.catch(() => {
    if (g._mongoClientPromise === p) g._mongoClientPromise = undefined;
  });
  return p;
}

function getClientPromise(): Promise<MongoClient> {
  if (!g._mongoClientPromise) g._mongoClientPromise = connect();
  return g._mongoClientPromise;
}

// Lazy: importing this module never throws or opens a connection by itself.
const clientPromise: Promise<MongoClient> = {
  then: (res: any, rej: any) => getClientPromise().then(res, rej),
  catch: (rej: any) => getClientPromise().catch(rej),
  finally: (f: any) => getClientPromise().finally(f),
  [Symbol.toStringTag]: "Promise",
} as Promise<MongoClient>;

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  try {
    const client = await getClientPromise();
    return client.db("tMust");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("MongoDB connection error:", msg);
    let hint = "";
    if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(msg)) hint = " (DNS problem: try a different network or set DNS to 8.8.8.8)";
    else if (/auth|bad auth|authentication/i.test(msg)) hint = " (wrong username or password in MONGODB_URI)";
    else if (/Server selection timed out|whitelist|IP/i.test(msg)) hint = " (add your IP / 0.0.0.0/0 in Atlas → Network Access)";
    throw new Error(`Failed to connect to MongoDB${hint}: ${msg}`);
  }
}
