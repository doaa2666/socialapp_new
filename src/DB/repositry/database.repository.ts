import {
  HydratedDocument,
  Model,
  PopulateOptions,
  ProjectionType,
  MongooseUpdateQueryOptions,
  QueryOptions,
  RootFilterQuery,
  UpdateQuery,
  UpdateWriteOpResult,
  Types,
  FlattenMaps,
  DeleteResult,
  InsertManyOptions,
} from "mongoose";

export type Lean<T> = HydratedDocument<FlattenMaps<T>>;

export abstract class DatabaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  async find({
    filter,
    select,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument>[] | Lean<TDocument>[]> {
    const query = this.model.find(filter || {}).select(select ?? "");
    if (options?.populate) query.populate(options.populate as PopulateOptions[]);
    if (options?.skip) query.skip(options.skip);
    if (options?.limit) query.limit(options.limit);
    if (options?.lean) query.lean();
    return await query.exec();
  }

  async paginate({
    filter = {},
    select,
    options,
    page = "all",
    size = 5,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument>;
    page?: number | "all";
    size?: number;
  }): Promise<{
    docsCount?: number;
    limit?: number;
    pages?: number;
    currentPage?: number;
    result: HydratedDocument<TDocument>[] | Lean<TDocument>[];
  }> {
    let docsCount: number | undefined;
    let pages: number | undefined;

    const finalOptions: QueryOptions<TDocument> = { ...options };

    if (page !== "all") {
      const pageNumber = Math.max(1, Math.floor(page as number));
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
      currentPage: page !== "all" ? (page as number) : undefined,
      result,
    };
  }

  async findOne({
    filter,
    select,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | null;
    options?: QueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    const safeFilter = filter ?? {};
    const query = this.model.findOne(safeFilter).select(select ?? "");
    if (options?.populate) query.populate(options.populate as PopulateOptions[]);
    if (options?.lean) query.lean(options.lean);
    return await query.exec();
  }

  async findById({
    id,
    select,
    options,
  }: {
    id: Types.ObjectId | string;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    const query = this.model.findById(id).select(select ?? "");
    if (options?.populate) query.populate(options.populate as PopulateOptions[]);
    if (options?.lean) query.lean(options.lean);
    return await query.exec();
  }

  async create({
    data,
  }: {
    data: Partial<TDocument>[];
  }): Promise<HydratedDocument<TDocument>[]> {
    return await this.model.create(data) as HydratedDocument<TDocument>[];
  }

  async insertMany({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: InsertManyOptions;
  }): Promise<HydratedDocument<TDocument>[]> {
    const docs = await this.model.insertMany(data);
    return docs as unknown as HydratedDocument<TDocument>[];
  }

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    update: UpdateQuery<TDocument>;
    options?: MongooseUpdateQueryOptions<TDocument> | null;
  }): Promise<UpdateWriteOpResult> {
    const safeFilter = filter ?? {};
    return await this.model.updateOne(safeFilter, { ...update, $inc: { __v: 1 } }, options);
  }

  async deleteOne({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter);
  }

  async deleteMany({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<DeleteResult> {
    return await this.model.deleteMany(filter);
  }

  async findOneAndDelete({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return await this.model.findOneAndDelete(filter);
  }

  async findByIdAndUpdate({
    id,
    update,
    options = { new: true },
  }: {
    id: Types.ObjectId | string;
    update: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    return await this.model.findByIdAndUpdate(id, { ...update, $inc: { __v: 1 } }, options);
  }

  async findOneAndUpdate({
    filter,
    update,
    options = { new: true },
  }: {
    filter?: RootFilterQuery<TDocument>;
    update?: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, options);
  }
}
