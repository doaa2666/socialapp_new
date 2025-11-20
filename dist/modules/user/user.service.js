"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const mongoose_1 = require("mongoose");
const User_model_1 = require("../../DB/model/User.model");
const user_repository_1 = require("../../DB/repositry/user.repository");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const s3_config_1 = require("../../utils/multer/s3.config");
const error_response_1 = require("../../utils/response/error.response");
const s3_events_1 = require("../../utils/multer/s3.events");
const success_response_1 = require("../../utils/response/success.response");
const repositry_1 = require("../../DB/repositry");
const model_1 = require("../../DB/model");
class UserService {
    userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
    postModel = new repositry_1.PostRepositry(model_1.PostModel);
    friendRequestModel = new repositry_1.FriendRequestRepositry(model_1.FriendRequestModel);
    constructor() { }
    profileImage = async (req, res) => {
        const { ContentType, Originalname, } = req.body;
        const { url, key } = await (0, s3_config_1.createPreSignedUploadLink)({
            ContentType,
            Originalname,
            path: `users/${req.decoded?._id}/`,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                profileImage: key,
                temProfileImage: req.user?.profileImage,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException("fail to update profile image");
        }
        s3_events_1.s3Event.emit("trackprofileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            key,
            expiresIn: 30000,
        });
        return (0, success_response_1.successResponse)({ res, data: { url } });
    };
    profileCoverImage = async (req, res) => {
        console.log("FILES ===>", req.files);
        const urls = await (0, s3_config_1.uploadFiles)({
            files: req.files,
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                coverImages: urls,
            }
        });
        if (!user) {
            throw new error_response_1.BadRequestException("Fail to update to cover images");
        }
        if (req.user?.coverImages) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImages });
        }
        return (0, success_response_1.successResponse)({ res, data: { user } });
    };
    profile = async (req, res) => {
        const profile = await this.userModel.findOne({
            id: req.user?._id,
            options: {
                populate: [{ path: "friends", select: "fristName lastName email gender profilePicture",
                    },
                ],
            },
        });
        if (!req.user) {
            throw new error_response_1.UnauthorizedException("missing user details");
        }
        if (!profile) {
            throw new error_response_1.BadRequestException("fail to find user profile");
        }
        return (0, success_response_1.successResponse)({
            res,
            data: { user: req.user }
        });
    };
    dashboard = async (req, res) => {
        const results = await mongoose_1.Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} }),
        ]);
        return (0, success_response_1.successResponse)({
            res,
            data: { results },
        });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyRoles = [role, User_model_1.RoleEnum.superAdmin];
        if (req.user?.role === User_model_1.RoleEnum.admin) {
            denyRoles.push(User_model_1.RoleEnum.admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
                role: { $nin: denyRoles }
            },
            update: {
                role,
            },
        });
        if (!user) {
            throw new error_response_1.NotfoundException("fail to find matching result");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    sendFriendRequest = async (req, res) => {
        const { userId } = req.params;
        const checkFriendRequestExist = await this.friendRequestModel.findOne({
            filter: {
                createdBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            },
        });
        if (checkFriendRequestExist) {
            throw new error_response_1.ConflictException("Friend request already exist");
        }
        const user = await this.userModel.findOne({ filter: { _id: userId } });
        if (!user) {
            throw new error_response_1.NotfoundException("invalid recipient");
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [
                {
                    createdBy: req.user?._id,
                    sendTo: userId,
                },
            ],
        })) || [];
        if (!friendRequest) {
            throw new error_response_1.BadRequestException("something went wrong!!!");
        }
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
        });
    };
    acceptFriendRequest = async (req, res) => {
        const { requestId } = req.params;
        const friendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: {
                _id: requestId,
                sendTo: req.user?._id,
                acceptedAt: { $exist: false },
            },
            update: {
                acceptedAt: new Date(),
            }
        });
        if (!friendRequest) {
            throw new error_response_1.NotfoundException("fail to find matching result");
        }
        await mongoose_1.Promise.all([
            await this.userModel.updateOne({
                filter: { _id: friendRequest.createdBy },
                update: {
                    $addToSet: { friends: friendRequest.sendTo },
                },
            }),
            await this.userModel.updateOne({
                filter: { _id: friendRequest.sendTo },
                update: {
                    $addToSet: { friends: friendRequest.createdBy },
                },
            }),
        ]);
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (userId && req.user?.role !== User_model_1.RoleEnum.admin) {
            throw new error_response_1.BadRequestException("not authorized user ");
        }
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId || req.user?._id,
                freezedAt: { $exists: false },
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1,
                }
            }
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotfoundException("user not found or fail to delete this resource ");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId,
                freezedBy: { $ne: userId },
            },
            update: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1,
                }
            }
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotfoundException("user not found or fail to restore this resource ");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotfoundException("user not found or fail to hard delete this resource ");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId} ` });
        return (0, success_response_1.successResponse)({ res });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        let statusCode = 200;
        const update = {};
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
                statusCode = 201;
                break;
        }
        await this.userModel.updateOne({
            filter: { _id: String(req.decoded?._id) },
            update,
        });
        return res.status(statusCode).json({ message: "Done" });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return res.status(201).json({ message: "Done", data: { credentials } });
    };
    updateBasicInfo = async (req, res) => {
        const { userName, age, phone, bio } = req.body;
        const updatedUser = await this.userModel.updateOne({
            filter: { _id: String(req.user?._id) },
            update: { userName, age, phone, bio },
        });
        return res.status(200).json({
            message: "Basic info updated successfully",
            data: updatedUser,
        });
    };
    updatePassword = async (req, res) => {
        const { oldPassword, newPassword } = req.body;
        const user = await this.userModel.findOne({
            filter: { _id: String(req.user?._id) },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await this.userModel.updateOne({
            filter: { _id: String(user._id) },
            update: { password: hashedPassword, changeCredentialTime: new Date() },
        });
        return res.status(200).json({ message: "Password updated successfully" });
    };
    updateEmail = async (req, res) => {
        const { newEmail, otp } = req.body;
        const isValidOtp = otp === "123456";
        if (!isValidOtp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        const updatedUser = await this.userModel.updateOne({
            filter: { _id: String(req.user?._id) },
            update: { email: newEmail },
        });
        return res
            .status(200)
            .json({ message: "Email updated successfully", data: updatedUser });
    };
    getProfile = async (req, res) => {
        const idParam = req.params.id || undefined;
        const userId = idParam || String(req.user?._id);
        const user = await this.userModel.findOne({ filter: { _id: userId } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res
            .status(200)
            .json({ message: "Profile retrieved successfully", data: user });
    };
    shareProfile = async (req, res) => {
        const idParam = req.params.id || undefined;
        const userId = idParam || String(req.user?._id);
        const user = await this.userModel.findOne({ filter: { _id: userId } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const publicData = {
            userName: user.userName,
            bio: user.bio,
            age: user.age,
            gender: user.gender,
        };
        return res
            .status(200)
            .json({ message: "Public profile retrieved", data: publicData });
    };
}
exports.default = new UserService();
