import { createSQLiteRepositories } from "./sqliteRepositories";

export const localRepositories = createSQLiteRepositories();

export async function initializeLocalRepositories(): Promise<void> {
  await localRepositories.database.initialize();
}
