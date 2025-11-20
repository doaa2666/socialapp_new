"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRepository = void 0;
const database_repository_1 = require("./database.repository");
const error_response_1 = require("../../utils/response/error.response");
class TokenRepository extends database_repository_1.DatabaseRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
    async createToken({ data, options, }) {
        const [token] = (await this.create({ data, options })) || [];
        if (!token) {
            throw new error_response_1.BadRequestException("fail to create token");
        }
        return token;
    }
}
exports.TokenRepository = TokenRepository;
