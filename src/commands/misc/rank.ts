import UserConfig from "../../db/Models/User/UserConfig";
import BotFunctions from "../../util/BotFunctions";
import Command from "@cmd/Command";
import EmbedBuilder from "@util/EmbedBuilder";
import Eris from "eris";

// @FIXME more efficient system for leaderboards
export default new Command("rank")
	.setPermissions("bot", "embedLinks")
	.setDescription("Get someone's rank..")
	.setUsage("<@user>")
	.addApplicationCommand(Eris.Constants.ApplicationCommandTypes.CHAT_INPUT, [
		{
			type: Eris.Constants.ApplicationCommandOptionTypes.USER,
			name: "user",
			description: "The user to get the rank of (none for yourself)",
			required: false
		}
	])
	.setCooldown(3e3)
	.setExecutor(async function(msg) {
		// return msg.reply("H-hey! We're still ironing out the final details of this command.. Check back later!");
		const member = msg.args.length === 0 ? msg.member : await msg.getMemberFromArgs();
		if (member === null) return msg.reply("Th-that isn't a valid member..");

		const exp = await UserConfig.prototype.getExp.call({ id: member.id }, msg.channel.guild.id);
		const { level, leftover, needed } = BotFunctions.calcLevel(exp);
		return msg.reply({
			embeds: [
				new EmbedBuilder(true, msg.author)
					.setTitle(`Rank Info For ${member.tag}`)
					.setDescription([
						`Level: **${level}** (${leftover}/${leftover + needed})`,
						`EXP: ${exp.toLocaleString()}`,
						"Rank: 0/0 (this is not a bug)"
					])
					.toJSON()
			]
		});
	});