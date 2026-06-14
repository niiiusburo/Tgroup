import { BaseEntity } from "@entities/BaseEntity";
import { Column, Entity } from "typeorm";

@Entity()
export class Test extends BaseEntity {
  constructor(test?: Test) {
    super();
    Object.assign(this, test);
  }
  @Column()
  name: string;
}
