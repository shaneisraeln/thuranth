import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabaseConfig } from '../config/database.config';

interface SeedFile {
  id: number;
  filename: string;
  description: string;
}

export class DatabaseSeeder {
  private pool: Pool;
  private seedsPath: string;

  constructor() {
    const config = getDatabaseConfig();
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
    this.seedsPath = join(__dirname, 'seeds');
  }

  async runSeeds(): Promise<void> {
    const seedFiles: SeedFile[] = [
      { id: 1, filename: '001_seed_users.sql', description: 'Seed users table' },
      { id: 2, filename: '002_seed_vehicles.sql', description: 'Seed vehicles table' },
      { id: 3, filename: '003_seed_parcels.sql', description: 'Seed parcels table' },
    ];

    console.log(`Running ${seedFiles.length} seed files`);

    for (const seedFile of seedFiles) {
      await this.executeSeed(seedFile);
    }

    console.log('All seed files executed successfully');
  }

  async executeSeed(seedFile: SeedFile): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const seedPath = join(this.seedsPath, seedFile.filename);
      const sql = readFileSync(seedPath, 'utf8');
      
      console.log(`Executing seed ${seedFile.id}: ${seedFile.description}`);
      await client.query(sql);
      console.log(`Seed ${seedFile.id} completed successfully`);
      
    } catch (error) {
      console.error(`Seed ${seedFile.id} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI runner
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  
  seeder.runSeeds()
    .then(() => {
      console.log('Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      seeder.close();
    });
}