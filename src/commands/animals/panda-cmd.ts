import Command from "@cmd/Command";
import EmbedBuilder from "@util/EmbedBuilder";
import CheweyAPI from "@util/req/CheweyAPI";

export default new Command("panda")
	.setPermissions("bot", "embedLinks")
	.setDescription("Get an image of an owl!")
	.setSlashOptions(true, [])
	.setCooldown(3e3)
	.setExecutor(async function(msg) {
		const img = await CheweyAPI.owl();
		if (!img) return msg.reply("The image api returned an error..");
		return msg.reply({
			embeds: [
				new EmbedBuilder(true, msg.author)
					.setTitle("Panda!")
					.setImage(img)
					.toJSON()
			]
		});
	});