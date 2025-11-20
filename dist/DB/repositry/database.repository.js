"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepository = void 0;
class DatabaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async find({ filter, select, options, }) {
        const query = this.model.find(filter || {}).select(select ?? "");
        if (options?.populate)
            query.populate(options.populate);
        if (options?.skip)
            query.skip(options.skip);
        if (options?.limit)
            query.limit(options.limit);
        if (options?.lean)
            query.lean();
        return await query.exec();
    }
    async paginate({ filter = {}, select, options, page = "all", size = 5, }) {
        let docsCount;
        let pages;
        const finalOptions = { ...options };
        if (page !== "all") {
            const pageNumber = Math.max(1, Math.floor(page));
            const limit = Math.max(1, size || 5);
            finalOptions.limit = limit;
            finalOptions.skip = (pageNumber - 1) * limit;
            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / limit);
        }
        const result = await this.find({ filter, select, options: finalOptions });
        return {
            docsCount,
            limit: finalOptions.limit,
            pages,
            currentPage: page !== "all" ? page : undefined,
            result,
        };
    }
    async findOne({ filter, select, options, }) {
        const safeFilter = filter ?? {};
        const query = this.model.findOne(safeFilter).select(select ?? "");
        if (options?.populate)
            query.populate(options.populate);
        if (options?.lean)
            query.lean(options.lean);
        return await query.exec();
    }
    async findById({ id, select, options, }) {
        const query = this.model.findById(id).select(select ?? "");
        if (options?.populate)
            query.populate(options.populate);
        if (options?.lean)
            query.lean(options.lean);
        return await query.exec();
    }
    async create({ data, }) {
        return await this.model.create(data);
    }
    async insertMany({ data, options, }) {
        const docs = await this.model.insertMany(data);
        return docs;
    }
    async updateOne({ filter, update, options, }) {
        const safeFilter = filter ?? {};
        return await this.model.updateOne(safeFilter, { ...update, $inc: { __v: 1 } }, options);
    }
    async deleteOne({ filter, }) {
        return await this.model.deleteOne(filter);
    }
    async deleteMany({ filter, }) {
        return await this.model.deleteMany(filter);
    }
    async findOneAndDelete({ filter, }) {
        return await this.model.findOneAndDelete(filter);
    }
    async findByIdAndUpdate({ id, update, options = { new: true }, }) {
        return await this.model.findByIdAndUpdate(id, { ...update, $inc: { __v: 1 } }, options);
    }
    async findOneAndUpdate({ filter, update, options = { new: true }, }) {
        return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, options);
    }
}
exports.DatabaseRepository = DatabaseRepository;
