// =========================================================================
// DATABASE VIEWER SCRIPT (CLI)
// Purpose: Allows developers to inspect the SQLite database tables and contents directly from the terminal.
// Usage:
//   - To list tables & row counts: npm run db:view
//   - To view records of a specific table: node src/scripts/view-db.js <TableName>
// =========================================================================

const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');

const viewDatabase = async () => {
  try {
    // Authenticate the database connection
    await sequelize.authenticate();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const targetTable = args[0];

    // Fetch all tables in the SQLite database
    const tablesResult = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      { type: QueryTypes.SELECT }
    );
    const tables = tablesResult.map(t => t.name);

    if (tables.length === 0) {
      console.log('\n❌ No tables found in the database. Ensure the database is seeded.');
      process.exit(0);
    }

    if (!targetTable) {
      // Scenario A: List all tables and their row counts
      console.log('\n=============================================');
      console.log('       CAFE POS DATABASE TABLES LIST        ');
      console.log('=============================================');
      
      const tableStats = [];
      for (const tableName of tables) {
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}";`, { type: QueryTypes.SELECT });
        tableStats.push({
          'Table Name': tableName,
          'Row Count': countResult ? countResult.count : 0
        });
      }
      
      console.table(tableStats);
      console.log('\n💡 Tip: To view records of a specific table, run:');
      console.log(`   node src/scripts/view-db.js <TableName>\n`);
      
    } else {
      // Scenario B: Dump records of a specific table
      // Prevent simple SQL injection by validating against our known tables list
      const matchedTable = tables.find(t => t.toLowerCase() === targetTable.toLowerCase());
      
      if (!matchedTable) {
        console.log(`\n❌ Table "${targetTable}" not found. Available tables:`);
        console.log(tables.join(', ') + '\n');
        process.exit(1);
      }

      console.log(`\n=============================================`);
      console.log(` RECORDS IN TABLE: ${matchedTable} `);
      console.log(`=============================================`);

      const records = await sequelize.query(`SELECT * FROM "${matchedTable}" LIMIT 100;`, { type: QueryTypes.SELECT });

      if (records.length === 0) {
        console.log('(Table is empty)\n');
      } else {
        console.table(records);
        if (records.length === 100) {
          console.log('⚠️ Showing first 100 records only.');
        }
        console.log('');
      }
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error viewing database:', error);
    process.exit(1);
  }
};

viewDatabase();
