import { MongoClient, Db, Collection } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const dbName = "steps";

class MongoDB {
  private static instance: MongoDB;
  private client: MongoClient;
  private db!: Db;

  constructor() {
    this.client = new MongoClient(uri);
  }

  public static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  public async connect(): Promise<Db> {
    if (!this.db) {
      await this.client.connect();
      console.log('Connected to MongoDB');
      this.db = this.client.db(dbName);
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
      this.db = undefined as any;
    }
  }

  public collection(name: string = "stepscollection"): Collection {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db.collection(name);
  }
}

export default MongoDB.getInstance();

