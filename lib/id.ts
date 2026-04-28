import { customAlphabet } from "nanoid";

export const createGiftId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  8
);
