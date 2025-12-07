import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { MinioContainer, StartedMinioContainer } from "@testcontainers/minio";
import { execSync } from "child_process";
import path from "path";
import { Client } from "minio";

let pgContainer: StartedPostgreSqlContainer;
let minioContainer: StartedMinioContainer;
const FILES_BUCKET = process.env.FILES_BUCKET || "test-files-bucket";

export default async function setup() {
  console.log('--- Global Setup: Start ---');

  try {
    pgContainer = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("integration_testdb")
      .withUsername("int_user")
      .withPassword("int_pass")
      .start();

    process.env.DATABASE_URL = pgContainer.getConnectionUri();

    const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
    execSync(`npx prisma db push --skip-generate --schema ${schemaPath}`, {
      env: { ...process.env },
      stdio: "inherit",
    });


    minioContainer = await new MinioContainer("quay.io/minio/minio")
      .withUsername("minioadmin")
      .withPassword("minioadmin")
      .start();

    const minioHost = minioContainer.getHost();
    const minioPort = minioContainer.getPort();

    process.env.MINIO_ENDPOINT = minioHost;
    process.env.MINIO_PORT = minioPort.toString();
    process.env.MINIO_ACCESS_KEY = "minioadmin";
    process.env.MINIO_SECRET_KEY = "minioadmin";
    process.env.MINIO_SECURE = "false";
    process.env.FILES_BUCKET = FILES_BUCKET;

    const minioClient = new Client({
      endPoint: minioHost,
      port: minioPort,
      accessKey: "minioadmin",
      secretKey: "minioadmin",
      useSSL: false,
    });

    const exists = await minioClient.bucketExists(FILES_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(FILES_BUCKET, "us-east-1");
    }

    console.log('--- Global Setup: Complete ---');

    return async () => {
      await minioContainer.stop();
      await pgContainer.stop();
    };
  } catch (error) {
    console.error("❌ Global setup failed", error);
    if (minioContainer) await minioContainer.stop();
    if (pgContainer) await pgContainer.stop();
    throw error;
  }
}
