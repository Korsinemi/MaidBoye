import ComponentInteractionHandler from "../main";
import CheweyAPI from "@req/CheweyAPI";
import BotFunctions from "@util/BotFunctions";
import EmbedBuilder from "@util/EmbedBuilder";

ComponentInteractionHandler
	.registerHandler("wolf-newimg", false, async function handler(interaction) {
		await interaction.acknowledge();
		const img = await CheweyAPI.wolf();
		if (!img) await interaction.editOriginalMessage(BotFunctions.replaceContent({
			content: "The image api returned an error.."
		}));
		else await interaction.editOriginalMessage({
			embeds: [
				new EmbedBuilder(true, interaction.member.user)
					.setTitle("Wolf!")
					.setImage(img)
					.toJSON()
			]
		});
	});
