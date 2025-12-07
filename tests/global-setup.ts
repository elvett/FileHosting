import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import path from "path";

let container: StartedPostgreSqlContainer;
let databaseUrl: string;

export default async function setup() {
  console.log("Starting Posgres docker");

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("integration_testdb")
    .withUsername("int_user")
    .withPassword("int_pass")
    .start();

  databaseUrl = container.getConnectionUri();

  process.env.DATABASE_URL = databaseUrl;

  try {
    console.log("Create scheme (db push)...");
    const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");

    execSync(`npx prisma db push --skip-generate --schema ${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });
    console.log("Prisma schema applied successfully");
  } catch (e) {
    console.error("Error applying Prisma schema", e);
    await container.stop();
    throw e;
  }

  return async () => {
    console.log("Stopping PostgreSQL container");
    await container.stop();
  };
}
