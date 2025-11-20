"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endPoint = void 0;
const User_model_1 = require("../../DB/model/User.model");
exports.endPoint = {
    profile: [User_model_1.RoleEnum.user, User_model_1.RoleEnum.admin],
    shareProfile: [User_model_1.RoleEnum.user, User_model_1.RoleEnum.admin],
    updateProfile: [User_model_1.RoleEnum.user],
    deleteProfile: [User_model_1.RoleEnum.admin],
    restoreAccount: [User_model_1.RoleEnum.admin],
    hardDelete: [User_model_1.RoleEnum.admin],
    dashboard: [User_model_1.RoleEnum.admin, User_model_1.RoleEnum.superAdmin]
};
