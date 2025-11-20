import { z } from "zod";
import type { ZodError, ZodType } from "zod";
import { NextFunction, Response, Request } from "express";
import { BadRequestException } from "../utils/response/error.response";
import { Types } from "mongoose";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type validationErrorsType = Array<{
  key: KeyReqType;
  issues: Array<{
    message: string;
    path: (string | number | symbol | undefined)[];
  }>;
}>;

export const validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction => {
    const validationErrors: validationErrorsType = [];

    for (const key of Object.keys(schema) as KeyReqType[]) {
      const validator = schema[key];
      if (!validator) continue;

      // Attach file(s) if exist
      if (req.file) {
        req.body.attachments = req.file;
      }
      if (req.files) {
        console.log(req.files);
        req.body.attachments = req.files;
      }

      const validationResult = validator.safeParse(req[key]);
      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;
        validationErrors.push({
          key,
          issues: errors.issues.map((issue) => ({
            message: issue.message,
            path: issue.path,
          })),
        });
      }
    }

    if (validationErrors.length) {
      throw new BadRequestException("validation error", { validationErrors });
    }

    return next() as unknown as NextFunction;
  };
};

export const generlaFields = {
  username: z
    .string({
      message: "username is required",
    })
    .min(2, { message: "min username length is 2 char" })
    .max(20, { message: "max username length is 20 char" }),

  email: z.string().email({ message: "valid email must be like example@domain.com" }),

  otp: z.string().regex(/^\d{6}$/, { message: "OTP must be 6 digits" }),

  password: z
    .string()
    .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
      message:
        "password must be strong (min 8 chars, upper, lower, number, special char)",
    }),

  confirmPassword: z.string(),

  gender: z.enum(["male", "female"], {
    message: "gender must be either male or female",
  }),

  file: function (mimetype: string[]) {
    return z
      .strictObject({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.enum(mimetype),
        buffer: z.any().optional(),
        path: z.string().optional(),
        size: z.number(),
      })
      .refine(
        (data) => {
          return data.buffer || data.path;
        },
        { message: "neither path or buffer is available", path: ["file"] }
      );
  },

  id: z.string().refine(
    (data) => {
      return Types.ObjectId.isValid(data);
    },
    { message: "invalid objectId format" }
  ),
};
