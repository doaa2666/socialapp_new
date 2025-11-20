import { Model} from "mongoose";
import { IFriendRequest as TDocument } from "../model/friendRequest.model";
import { DatabaseRepository } from "./database.repository";

export class FriendRequestRepositry extends DatabaseRepository<TDocument>{

    constructor(protected override readonly model: Model<TDocument>) {
        super(model);
    }
}