import type { Test } from "@entities/Test";

export class TestResponseDTO {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  private constructor(test: Test) {
    this.id = test.id;
    this.name = test.name;
    this.createdAt = test.createdAt;
    this.updatedAt = test.updatedAt;
  }

  static fromEntity(test: Test): TestResponseDTO {
    return new TestResponseDTO(test);
  }

  static fromEntities(tests: Test[]): TestResponseDTO[] {
    return tests.map(TestResponseDTO.fromEntity);
  }
}
