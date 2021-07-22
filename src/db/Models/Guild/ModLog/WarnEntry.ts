import GenericEntry, { RawGenericEntry } from "./GenericEntry";
import GuildConfig from "../GuildConfig";
import { DataTypes } from "@uwu-codes/types";
import MaidBoye from "@MaidBoye";
import Eris from "eris";

export interface RawWarnEntry extends RawGenericEntry {
	type: "warn";
	active: 0 | 1;
}
export type WarnEntryKV = DataTypes<WarnEntry>;
export default class WarnEntry extends GenericEntry {
	declare type: "warn";
	declare target: string;
	active: boolean;
	constructor(data: RawWarnEntry, guild: GuildConfig) {
		super(data, guild);
		this.active = Boolean(data.active);
	}

	async getTarget(client: MaidBoye) {
		return super.getTarget.call(this, client) as Promise<Eris.User>;
	}
}
