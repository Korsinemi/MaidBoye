import SelfRole, { RawSelfRole } from "./SelfRole";
import Prefix, { RawPrefix } from "./Prefix";
import Tag, { RawTag, TagKV } from "./Tag";
import {
	AnyRawEntry,
	BanEntry, ClearWarningsEntry, DeleteWarningEntry,
	KickEntry, LockDownEntry, LockEntry,
	MuteEntry, SoftBanEntry, UnBanEntry,
	UnLockDownEntry, UnLockEntry, UnMuteEntry,
	WarnEntry
} from "./ModLog/All";
import { OkPacket } from "@util/@types/MariaDB";
import { DataTypes, DeepPartial, SomePartial, Writeable } from "@uwu-codes/types";
import BotFunctions from "@util/BotFunctions";
import config from "@config";
import db from "@db";
import { Collection } from "@augu/collections";
import crypto from "crypto";

export interface RawGuildConfig {
	id: string;
	modlog_enabled: 0 | 1;
	modlog_case_editing_enabled: 0 | 1;
	modlog_case_deleting_enabled: 0 | 1;
	modlog_edit_others_cases_enabled: 0 | 1;
	modlog_webhook_id: string | null;
	modlog_webhook_token: string | null;
	modlog_webhook_channel_id: string | null;
	settings_default_yiff_type: string;
	settings_yiff_thumbnail_type: string;
	settings_mute_role: string | null;
}

export type GuildConfigKV = DataTypes<GuildConfig>;
export default class GuildConfig {
	id: string;
	prefix: Array<Prefix>;
	tags = new Collection<string, Tag>();
	selfRoles = new Collection<string, SelfRole>();
	modlog: {
		enabled: boolean;
		caseEditingEnabled: boolean;
		caseDeletingEnabled: boolean;
		editOthersCasesEnabled: boolean;
		webhook: Record<"id" | "token" | "channelId", string> | null;
	};
	settings: {
		defaultYiffType: typeof config["yiffTypes"][number] | null;
		yiffThumbnailType: "gif" | "image";
		muteRole: string | null;
	};
	constructor(id: string, data: RawGuildConfig, prefixData: Array<RawPrefix>, selfRolesData: Array<RawSelfRole>, tagsData: Array<RawTag>) {
		this.id = id;
		this.load(data, prefixData, selfRolesData, tagsData);
	}

	private load(data: RawGuildConfig, prefixData: Array<RawPrefix>, selfRolesData: Array<RawSelfRole>, tagsData: Array<RawTag>) {
		this.id = data.id;
		this.prefix = prefixData.map(d => new Prefix(d, this));
		this.tags.clear();
		tagsData.forEach(d => this.tags.set(d.name, new Tag(d, this)));
		this.selfRoles.clear();
		selfRolesData.forEach(d => this.selfRoles.set(d.role, new SelfRole(d, this)));
		this.modlog = {
			enabled: Boolean(data.modlog_enabled),
			caseEditingEnabled: Boolean(data.modlog_case_editing_enabled),
			caseDeletingEnabled: Boolean(data.modlog_case_deleting_enabled),
			editOthersCasesEnabled: Boolean(data.modlog_edit_others_cases_enabled),
			webhook: data.modlog_webhook_id === null || data.modlog_webhook_token === null || data.modlog_webhook_channel_id === null ? null : {
				id: data.modlog_webhook_id,
				token: data.modlog_webhook_token,
				channelId: data.modlog_webhook_channel_id
			}
		};
		this.settings = {
			defaultYiffType: data.settings_default_yiff_type as GuildConfig["settings"]["defaultYiffType"],
			yiffThumbnailType: data.settings_yiff_thumbnail_type as GuildConfig["settings"]["yiffThumbnailType"],
			muteRole: data.settings_mute_role
		};
		return this;
	}

	async reload() {
		const v = await db.getGuild(this.id, true, true);
		if (!v) throw new Error(`Unexpected undefined on GuildConfig#reload (id: ${this.id})`);
		this.load(v.guild, v.prefix, v.selfRoles, v.tags);
		return this;
	}

	async edit(data: DeepPartial<GuildConfigKV>) {
		if (data.prefix) throw new TypeError("Field 'prefix' cannot be used in the generic edit function.");
		if (data.tags) throw new TypeError("Field 'tags' cannot be used in the generic edit function.");
		if (data.selfRoles) throw new TypeError("Field 'selfRoles' cannot be used in the generic edit function.");

		const v = {
			modlog_enabled: Boolean(data.modlog && data.modlog.enabled) === true ? 1 : 0,
			modlog_case_editing_enabled: Boolean(data.modlog && data.modlog.caseEditingEnabled) === true ? 1 : 0,
			modlog_case_deleting_enabled: Boolean(data.modlog && data.modlog.caseDeletingEnabled) === true ? 1 : 0,
			modlog_edit_others_cases_enabled: Boolean(data.modlog && data.modlog.editOthersCasesEnabled) === true ? 1 : 0,
			modlog_webhook_id: data.modlog === undefined || data.modlog.webhook === undefined ? undefined : data.modlog.webhook === null ? null : data.modlog.webhook.id ?? undefined,
			modlog_webhook_token: data.modlog === undefined || data.modlog.webhook === undefined ? undefined : data.modlog.webhook === null ? null : data.modlog.webhook.token ?? undefined,
			modlog_webhook_channel_id: data.modlog === undefined || data.modlog.webhook === undefined ? undefined : data.modlog.webhook === null ? null : data.modlog.webhook.channelId ?? undefined,
			settings_default_yiff_type: data.settings === undefined ? undefined : data.settings.defaultYiffType ?? undefined,
			settings_yiff_thumbnail_type: data.settings === undefined ? undefined : data.settings.yiffThumbnailType ?? undefined,
			settings_mute_role: data.settings === undefined ? undefined : data.settings.muteRole === null ? null : data.settings.muteRole ?? undefined
		} as Omit<RawGuildConfig, "id">;

		const keys = Object.keys(v).filter(k => v[k as keyof typeof v] !== undefined);
		const values = Object.values(v).filter(k => k !== undefined) as Array<unknown>;
		// for debug
		// console.log("obj", v);
		// console.log("Query:", `UPDATE guilds SET ${keys.map(j => `${j}=?`).join(", ")} WHERE id = ?`);
		// console.log("Parameters:", [...values, this.id]);
		await db.query(`UPDATE guilds SET ${keys.map(j => `${j}=?`).join(", ")} WHERE id = ?`, [...values, this.id]);
		return this.reload();
	}

	async fix() {
		// nothing to fix yet, so this is just blank
		const obj = {} as Writeable<GuildConfigKV>;

		if (JSON.stringify(obj) !== "{}") await this.edit(obj);
	}

	getFormattedPrefix(index = 0) {
		return BotFunctions.formatPrefix(this.prefix[index]);
	}

	async addTag(tag: Omit<SomePartial<TagKV, "modifiedAt" | "modifiedBy">, "id">) {
		const id = crypto.randomBytes(6).toString("hex");
		await db.query("INSERT INTO tags (id, guild_id, name, content, created_at, created_by, modified_at, modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
			id,
			this.id,
			tag.name,
			tag.content,
			tag.createdAt,
			tag.createdBy,
			tag.modifiedAt ?? null,
			tag.modifiedBy ?? null
		]);
		return id;
	}

	async editTag(value: string, column: "id" | "name", content: string, blame?: string) {
		const res = await db.query("UPDATE tags SET content=?, modified_at=?, modified_by=? WHERE id=?", [content, Date.now(), blame ?? null, column, value]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async removeTag(value: string, column: "id" | "name") {
		return db.query("DELETE FROM tags WHERE ?=? AND guild_id=?", [column, value, this.id]).then((r: OkPacket) => r.affectedRows > 0);
	}

	async resetTags() {
		const res = await db.query("DELETE FROM tags WHERE guild_id=?", [this.id]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async addPrefix(value: string, space = false) {
		const id = crypto.randomBytes(6).toString("hex");
		await db.query("INSERT INTO prefix (id, guild_id, value, space) VALUES (?, ?, ?, ?)", [
			id,
			this.id,
			value,
			space
		]);
		await this.reload();
		return id;
	}

	async removePrefix(value: string, column: "id" | "value") {
		const res = await db.query("DELETE FROM prefix WHERE ?=? AND guild_id=?", [column, value, this.id]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async resetPrefixes() {
		const res = await db.query("DELETE FROM prefix guild_id=?", [this.id]).then((r: OkPacket) => r.affectedRows > 0);
		await this.addPrefix(config.defaults.prefix, true);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async addSelfRole(role: string, blame: string) {
		const id = crypto.randomBytes(6).toString("hex");
		await db.query("INSERT INTO selfroles (id, guild_id, role, added_at, added_by) VALUES (?, ?, ?, ?, ?)", [
			id,
			this.id,
			role,
			blame
		]);
		await this.reload();
		return id;
	}

	async removeSelfRole(value: string, column: "id" | "role") {
		const res = await db.query("DELETE FROM selfroles WHERE ?=? AND guild_id=?", [column, value, this.id]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async resetSelfRoles() {
		const res = await db.query("DELETE FROM selfroles guild_id=?", [this.id]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async editModlog(reason: string, blame?: string) {
		const res = await db.query("UPDATE modlog SET reason=?, last_edited_at=?, last_edited_by=? WHERE id=?", [reason, Date.now(), blame ?? null, this.id]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async removeModlog(id: string) {
		const res = await db.query("DELETE FROM modlog WHERE id=?", [id]).then((r: OkPacket) => r.affectedRows > 0);
		if (res === false) return false;
		await this.reload();
		return true;
	}

	async getModlog() {
		const res = await db.query("SELECT * FROM modlog WHERE guild_id=?", [this.id]).then(v => (v as Array<AnyRawEntry>));
		return Promise.all(res.map(async(v) => {
			switch (v.type) {
				case "ban": return new BanEntry(v, this);
				case "clearwarnings": return new ClearWarningsEntry(v, this);
				case "deletewarning": return new DeleteWarningEntry(v, this);
				case "kick": return new KickEntry(v, this);
				case "lockdown": return new LockDownEntry(v, this);
				case "lock": return new LockEntry(v, this);
				case "mute": return new MuteEntry(v, this);
				case "softban": return new SoftBanEntry(v, this);
				case "unban": return new UnBanEntry(v, this);
				case "unlockdown": return new UnLockDownEntry(v, this);
				case "unlock": return new UnLockEntry(v, this);
				case "unmute": return new UnMuteEntry(v, this);
				case "warn": return new WarnEntry(v, this);
			}
		}));
	}
}
