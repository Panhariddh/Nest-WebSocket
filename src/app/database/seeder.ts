import 'colors';
import * as readlineSync from 'readline-sync';
import { AppDataSource } from '../config/data-source';
import { UserSeeder } from './seeders/user.seeder';



async function seed() {
  try {
    // Initialize only if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const tableNames = await AppDataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
    );

    if (tableNames.length > 0) {
      const confirm = readlineSync.keyInYNStrict(
        "This will DROP and SEED again. Proceed?".yellow
      );
      if (!confirm) {
        console.log("\nSeeding cancelled.".cyan);
        process.exit(0);
      }
    }

    await AppDataSource.synchronize(true); 
    console.log("\nSeeding tables…".green);

    await UserSeeder.seed(); 


    console.log("\nSeed completed successfully.".green);
    process.exit(0);
  } catch (error) {
    console.log("\nSeeding error:".red, error.message);
    process.exit(1);
  }
}

seed();