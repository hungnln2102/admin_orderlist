import type {
  FormDetailDto,
  FormInputDto,
} from "@/lib/formsApi";

export type FormInfoTab = "form" | "input";

export type FormInfoItem = {
  id: number;
  name: string;
  description: string;
};

export type FormDetailView = FormDetailDto & {
  inputs: FormInputDto[];
};

