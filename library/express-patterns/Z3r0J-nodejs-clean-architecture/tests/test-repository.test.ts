import "reflect-metadata";
import { Test } from "@entities/Test";
import { TestRepository } from "@repositories/TestRepository";
import { DataSource } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let dataSource: DataSource;
let repo: TestRepository;

beforeEach(async () => {
  dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    synchronize: true,
    entities: [Test],
  });
  await dataSource.initialize();
  repo = new TestRepository(dataSource);
});

afterEach(async () => {
  await dataSource.destroy();
});

describe("TestRepository (in-memory SQLite)", () => {
  it("creates and retrieves a Test by id", async () => {
    const created = await repo.Create(new Test({ name: "alpha" } as Test));
    expect(created.id).toBeDefined();

    const fetched = await repo.GetById(created.id);
    expect(fetched?.name).toBe("alpha");
  });

  it("lists all rows via GetAll", async () => {
    await repo.Create(new Test({ name: "a" } as Test));
    await repo.Create(new Test({ name: "b" } as Test));

    const all = await repo.GetAll();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.name).sort()).toEqual(["a", "b"]);
  });

  it("findByName returns null when no row matches", async () => {
    const result = await repo.findByName("missing");
    expect(result).toBeNull();
  });

  it("findByName returns the row when name matches", async () => {
    await repo.Create(new Test({ name: "target" } as Test));
    const result = await repo.findByName("target");
    expect(result?.name).toBe("target");
  });

  it("Update modifies the stored row", async () => {
    const created = await repo.Create(new Test({ name: "old" } as Test));
    await repo.Update(created.id, Object.assign(created, { name: "new" }));

    const fetched = await repo.GetById(created.id);
    expect(fetched?.name).toBe("new");
  });

  it("Delete removes the row", async () => {
    const created = await repo.Create(new Test({ name: "doomed" } as Test));
    await repo.Delete(created.id);

    const fetched = await repo.GetById(created.id);
    expect(fetched).toBeNull();
  });
});
