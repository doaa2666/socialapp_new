"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/model/User.model");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/email/email.event");
const otp_1 = require("../../utils/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
const success_response_1 = require("../../utils/response/success.response");
const repositry_1 = require("../../DB/repositry");
class AuthenticationService {
    userModel = new repositry_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    async verifyGmailAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("Fail to verify this Google account");
        }
        return payload;
    }
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: { email, provider: User_model_1.ProviderEnum.GOOGLE },
        });
        if (!user) {
            throw new error_response_1.NotfoundException("Not registered account or registered with another provider");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentils: credentials } });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({ filter: { email } });
        if (user) {
            if (user.provider === User_model_1.ProviderEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException(`Email exists with another provider ::: ${user.provider}`);
        }
        const [newUser] = (await this.userModel.create({
            data: [
                {
                    firstName: given_name,
                    lastName: family_name,
                    email: email,
                    profileImage: picture,
                    confirmAt: new Date(),
                    provider: User_model_1.ProviderEnum.GOOGLE,
                },
            ],
        })) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("Fail to signup with Gmail, please try again later");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
            data: { credentils: credentials },
        });
    };
    signup = async (req, res) => {
        const { username, email, password } = req.body;
        const checkUserExist = await this.userModel.findOne({
            filter: { email },
            select: "email",
            options: { lean: true },
        });
        if (checkUserExist) {
            throw new error_response_1.ConflictException("Email exist");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        await this.userModel.createUser({
            data: [
                {
                    userName: username,
                    email,
                    password,
                    confirmEmailOtp: `${otp}`,
                },
            ],
        });
        email_event_1.emailEvent.emit("confirmEmail", { to: email, otp });
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                $or: [{ confirmAt: null }, { confirmAt: { $exists: false } }],
            },
        });
        if (!user)
            throw new error_response_1.NotfoundException("Invalid account");
        if (!(await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp))) {
            throw new error_response_1.ConflictException("Invalid confirmation code");
        }
        await this.userModel.updateOne({
            filter: { email },
            update: { confirmAt: new Date(), $unset: { confirmEmailOtp: 1 } },
        });
        return (0, success_response_1.successResponse)({ res, message: "Email confirmed successfully" });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: { email, provider: User_model_1.ProviderEnum.SYSTEM },
        });
        if (!user)
            throw new error_response_1.NotfoundException("Invalid login data");
        if (!user.confirmAt)
            throw new error_response_1.BadRequestException("Verify your account first");
        if (!(await (0, hash_security_1.compareHash)(password, user.password))) {
            throw new error_response_1.NotfoundException("Invalid login data");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentils: credentials } });
    };
    sendForgotCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotfoundException("Invalid account due to one of the following reasons [not registered, invalid provider, not confirmed account]");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: { resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp)) },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Fail to send the reset code, please try again later");
        }
        email_event_1.emailEvent.emit("resetPassword", { to: email, otp });
        return (0, success_response_1.successResponse)({ res });
    };
    verifyForgotPassword = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotfoundException("Invalid account due to one of the following reasons [not registered, invalid provider, not confirmed account, missing resetPasswordOtp]");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("Invalid OTP");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    resetForgotPssword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotfoundException("Invalid account due to one of the following reasons [not registered, invalid provider, not confirmed account, missing resetPasswordOtp]");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("Invalid OTP");
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                changeCredentialTime: new Date(),
                $unset: { resetPasswordOtp: 1 },
            },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Fail to reset account password");
        }
        return (0, success_response_1.successResponse)({ res });
    };
}
exports.default = new AuthenticationService();
