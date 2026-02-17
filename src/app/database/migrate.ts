import 'colors';
import * as readlineSync from 'readline-sync';
import { AppDataSource } from '../config/data-source';



async function migrate() {
  try {
    await AppDataSource.initialize();

    const tableNames = await AppDataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
    );

    if (tableNames.length > 0) {
      const confirm = readlineSync.keyInYNStrict(
        "This will DROP and recreate all tables. Proceed?".yellow
      );
      if (!confirm) {
        console.log("\nMigration cancelled.".cyan);
        process.exit(0);
      }
    }

    await AppDataSource.synchronize(true); // force: true (drop + recreate)

    console.log("\nMigration completed successfully.".green);
    process.exit(0);

  } catch (error) {
    console.log("\nMigration error:".red, error.message);
    process.exit(1);
  }
}

migrate();
