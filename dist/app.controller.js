"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)("./config/.env.development") });
const express_1 = __importDefault(require("express"));
const port = Number(process.env.PORT) || 3000;
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const modules_1 = require("./modules");
const error_response_js_1 = require("./utils/response/error.response.js");
const conection_db_js_1 = __importDefault(require("./DB/conection.db.js"));
const s3_config_js_1 = require("./utils/multer/s3.config.js");
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const User_model_js_1 = require("./DB/model/User.model.js");
const user_repository_js_1 = require("./DB/repositry/user.repository.js");
const createS3WriteStreamPipe = (0, node_util_1.promisify)(node_stream_1.pipeline);
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use((0, helmet_1.default)());
    const limiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 60 * 60 * 1000,
        limit: 2000,
        message: { error: "Too many requests, please try again later." },
        statusCode: 429,
    });
    app.use(limiter);
    app.get("/", (req, res) => {
        res.json({ message: "Welcome to social app 🚀" });
    });
    app.use("/auth", modules_1.authRouter);
    app.use("/user", modules_1.userRouter);
    app.use("/post", modules_1.postRouter);
    app.get(/^\/upload\/pre-signed\/(.+)$/, async (req, res) => {
        const { downloadName, download = "false", expiresIn = "120" } = req.query;
        const expires = Number(expiresIn) || 120;
        const key = req.params[0];
        const finalKey = key ?? "";
        const url = await (0, s3_config_js_1.createGetPreSignedLink)({
            key: finalKey,
            downloadName: downloadName || finalKey.split("/").pop() || "",
            download,
            expiresIn: expires,
        });
        return res.json({ message: "Pre-signed URL generated successfully", data: { url } });
    });
    app.get(/^\/upload\/(.+)$/, async (req, res) => {
        const { downloadName, download = "false" } = req.query;
        const key = req.params[0];
        const finalKey = key ?? "";
        const s3Response = await (0, s3_config_js_1.getFile)({ key: finalKey });
        if (!s3Response?.Body) {
            throw new error_response_js_1.BadRequestException("Failed to fetch this asset");
        }
        res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || finalKey.split("/").pop() || "file"}"`);
        }
        await createS3WriteStreamPipe(s3Response.Body, res);
    });
    app.use((req, res) => {
        return res.status(404).json({
            message: "Invalid app routing, please check the method and URL.",
        });
    });
    app.use(error_response_js_1.globalErrorHandling);
    await (0, conection_db_js_1.default)();
    async function test() {
        try {
            const userRepo = new user_repository_js_1.UserRepository(User_model_js_1.UserModel);
            const inserted = await userRepo.insertMany({
                data: [
                    {
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
        }
        catch (error) {
            console.log("Test insert error:", error);
        }
    }
    if (process.env.NODE_ENV !== "production") {
        test().catch((err) => console.log("test() failed:", err));
    }
    app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
    });
};
exports.default = bootstrap;
