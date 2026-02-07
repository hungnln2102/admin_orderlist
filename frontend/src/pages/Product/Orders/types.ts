import { Order } from "../../../constants";

export type EditableOrder = Omit<Order, "cost" | "price"> & {
  cost: number | string;
  price: number | string;
};

export type ViewModalSource = "create" | "view";
