"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequestRepositry = void 0;
const database_repository_1 = require("./database.repository");
class FriendRequestRepositry extends database_repository_1.DatabaseRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.FriendRequestRepositry = FriendRequestRepositry;
