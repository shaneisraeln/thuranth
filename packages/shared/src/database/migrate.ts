import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabaseConfig } from '../config/database.config';

interface Migration {
  id: number;
  filename: string;
  description: string;
  executed_at?: Date;
}

export class DatabaseMigrator {
  private pool: Pool;
  private migrationsPath: string;

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
    this.migrationsPath = join(__dirname, 'migrations');
  }

  async initialize(): Promise<void> {
    // Create migrations tracking table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query(
      'SELECT id, filename, description, executed_at FROM schema_migrations ORDER BY id'
    );
    return result.rows;
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    const allMigrations: Migration[] = [
      { id: 1, filename: '001_create_users_table.sql', description: 'Create users table' },
      { id: 2, filename: '002_create_vehicles_table.sql', description: 'Create vehicles table' },
      { id: 3, filename: '003_create_parcels_table.sql', description: 'Create parcels table' },
      { id: 4, filename: '004_create_routes_table.sql', description: 'Create routes and route_points tables' },
      { id: 5, filename: '005_create_decisions_table.sql', description: 'Create decisions table' },
      { id: 6, filename: '006_create_audit_logs_table.sql', description: 'Create audit_logs table' },
      { id: 7, filename: '007_create_analytics_tables.sql', description: 'Create analytics and metrics tables' },
    ];

    return allMigrations.filter(m => !executedIds.has(m.id));
  }

  async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Read and execute migration file
      const migrationPath = join(this.migrationsPath, migration.filename);
      const sql = readFileSync(migrationPath, 'utf8');
      
      console.log(`Executing migration ${migration.id}: ${migration.description}`);
      await client.query(sql);
      
      // Record migration as executed
      await client.query(
        'INSERT INTO schema_migrations (id, filename, description) VALUES ($1, $2, $3)',
        [migration.id, migration.filename, migration.description]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${migration.id} completed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration ${migration.id} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    await this.initialize();
    
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      await this.executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI runner
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  
  migrator.runMigrations()
    .then(() => {
      console.log('Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database migration failed:', error);
      process.exit(1);
    })
    .finally(() => {
      migrator.close();
    });
}