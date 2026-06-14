import type { Test } from "@entities/Test";
import type { BadRequestError } from "@error-custom/BadRequestError";
import type { IGenericServices } from "@interfaces/services/IGenericServices";
import type { ResultAsync } from "neverthrow";

export interface ITestServices extends IGenericServices<Test> {
  createIfUnique(name: string): ResultAsync<Test, BadRequestError>;
}
