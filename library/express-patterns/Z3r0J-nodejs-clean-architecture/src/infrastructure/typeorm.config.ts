import "reflect-metadata";
import { Test } from "@entities/Test";
import { DB_CONFIG } from "@helpers/databaseConfiguration";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: DB_CONFIG.type,
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  username: DB_CONFIG.username,
  password: DB_CONFIG.password,
  database: DB_CONFIG.database,
  synchronize: true,
  logging: false,
  entities: [Test],
  migrations: [],
  subscribers: [],
});
