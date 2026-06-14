import { Test } from "@entities/Test";
import { BadRequestError } from "@error-custom/BadRequestError";
import type { IUnitOfWork, TxRepositories } from "@interfaces/common/IUnitOfWork";
import type { ITestRepository } from "@interfaces/repositories/ITestRepository";
import { TestServices } from "@services/TestServices";
import { describe, expect, it, vi } from "vitest";

const buildMockRepo = (overrides: Partial<ITestRepository> = {}): ITestRepository => ({
  Create: vi.fn(),
  GetAll: vi.fn(),
  GetById: vi.fn(),
  Update: vi.fn(),
  Delete: vi.fn(),
  findByName: vi.fn(),
  ...overrides,
});

const buildPassthroughUoW = (repos: TxRepositories): IUnitOfWork => ({
  run: (work) => work(repos),
});

describe("TestServices.createIfUnique", () => {
  it("returns Err(BadRequestError) when the name already exists", async () => {
    const existing = new Test({ name: "duplicate" } as Test);
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(existing),
    });
    const uow = buildPassthroughUoW({ test: repo });
    const services = new TestServices(repo, uow);

    const result = await services.createIfUnique("duplicate");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(BadRequestError);
    expect(result._unsafeUnwrapErr().message).toContain("duplicate");
    expect(repo.findByName).toHaveBeenCalledWith("duplicate");
    expect(repo.Create).not.toHaveBeenCalled();
  });

  it("returns Ok(entity) when the name is unique", async () => {
    const created = Object.assign(new Test({ name: "fresh" } as Test), { id: 1 });
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(null),
      Create: vi.fn().mockResolvedValue(created),
    });
    const uow = buildPassthroughUoW({ test: repo });
    const services = new TestServices(repo, uow);

    const result = await services.createIfUnique("fresh");

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(created);
    expect(repo.findByName).toHaveBeenCalledWith("fresh");
    expect(repo.Create).toHaveBeenCalledOnce();
  });

  it("runs reads and writes inside the same UoW transaction", async () => {
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(null),
      Create: vi.fn().mockResolvedValue(new Test({ name: "x" } as Test)),
    });
    const uow: IUnitOfWork = {
      run: vi.fn().mockImplementation((work) => work({ test: repo })),
    };
    const services = new TestServices(repo, uow);

    await services.createIfUnique("x");

    expect(uow.run).toHaveBeenCalledOnce();
  });
});
