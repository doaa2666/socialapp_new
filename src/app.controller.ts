// src/app.controller.ts
// ---------------------- SETUP ENV ----------------------
import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: resolve("./config/.env.development") });

// ---------------------- IMPORTS ----------------------
import type { Response, Request, Express } from "express";
import express from "express";
const port: number = Number(process.env.PORT) || 3000;

import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { authRouter, postRouter, userRouter } from "./modules";

import { BadRequestException, globalErrorHandling } from "./utils/response/error.response.js";
import connectDB from "./DB/conection.db.js";
import { createGetPreSignedLink, getFile } from "./utils/multer/s3.config.js";

import { promisify } from "node:util";
import { pipeline, Readable } from "node:stream";
import { UserModel } from "./DB/model/User.model.js";
import { UserRepository } from "./DB/repositry/user.repository.js";
const createS3WriteStreamPipe = promisify(pipeline);

// ---------------------- BOOTSTRAP FUNCTION ----------------------
const bootstrap = async (): Promise<void> => {
  const app: Express = express();

  app.use(cors());
  app.use(express.json());
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 2000,
    message: { error: "Too many requests, please try again later." },
    statusCode: 429,
  });
  app.use(limiter);

  // MAIN ROUTE
  app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Welcome to social app 🚀" });
  });

  // SUB ROUTES
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);

  // ---------------------- S3 ROUTES ----------------------

  //  FIXED using RegExp instead of wildcard
  app.get(/^\/upload\/pre-signed\/(.+)$/, async (req: Request, res: Response): Promise<Response> => {
    const { downloadName, download = "false", expiresIn = "120" } = req.query as {
      downloadName?: string;
      download?: string;
      expiresIn?: string;
    };

    const expires = Number(expiresIn) || 120;
    const key = req.params[0]; // regex match group
    const finalKey = key ?? "";

    const url = await createGetPreSignedLink({
      key: finalKey,
      downloadName: (downloadName as string) || finalKey.split("/").pop() || "",
      download,
      expiresIn: expires,
    });

    return res.json({ message: "Pre-signed URL generated successfully", data: { url } });
  });

  //  FILE STREAM ROUTE using regex
  app.get(/^\/upload\/(.+)$/, async (req: Request, res: Response): Promise<void> => {
    const { downloadName, download = "false" } = req.query as {
      downloadName?: string;
      download?: string;
    };

    const key = req.params[0];
    const finalKey = key ?? "";

    const s3Response = await getFile({ key: finalKey });
    if (!s3Response?.Body) {
      throw new BadRequestException("Failed to fetch this asset");
    }

    res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");
    if (download === "true") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${(downloadName as string) || finalKey.split("/").pop() || "file"}"`
      );
    }

    // pipe S3 stream to response
    await createS3WriteStreamPipe(s3Response.Body as unknown as Readable, res);
  });

  // INVALID ROUTES (fixed)
  app.use((req: Request, res: Response) => {
    return res.status(404).json({
      message: "Invalid app routing, please check the method and URL.",
    });
  });

  // global error handler (should be after routes)
  app.use(globalErrorHandling);

  // connect DB before any DB ops
  await connectDB();

  //============ Hooks / Test data insertion (only for dev/testing)
  // NOTE: Use safe/dev-only insertion. This tries to avoid circular import problems
  async function test() {
    try {
      const userRepo = new UserRepository(UserModel);

      const inserted = await userRepo.insertMany({
        data: [
          {
            // use `userName` to match your IUser / schema field
            userName: `Doaa Nashat`,
            email: `${Date.now()}@gmail.com`,
            password: "213456",
          },
          {
            userName: `Doaa Nashat`,
            email: `${Date.now()}aswds@gmail.com`,
            password: "213456",
          },
        ],
      });

      console.log({ result: inserted });
    } catch (error) {
      console.log("Test insert error:", error);
    }
  }

  // run test only in development environment
  if (process.env.NODE_ENV !== "production") {
    // don't block server startup on test; run but catch errors inside
    test().catch((err) => console.log("test() failed:", err));
  }

  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
};

export default bootstrap;
