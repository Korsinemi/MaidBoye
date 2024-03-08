import Command from "../../../util/cmd/Command.js";
import { State } from "../../../util/State.js";
import Util from "../../../util/Util.js";
import { prntsc } from "../../../util/prntsc.js";
import { ButtonColors, ComponentBuilder } from "@oceanicjs/builders";
import { type MessageActionRow } from "oceanic.js";

export default new Command(import.meta.url, "prntsc")
    .setDescription("Get a random screenshot from prnt.sc")
    .setRestrictions("nsfw")
    .setCooldown(3e3)
    .setExecutor(async function(interaction) {
        const data = await prntsc();

        return interaction.reply({
            embeds: Util.makeEmbed(true, interaction.user)
                .setImage(data.image)
                .setURL(data.link)
                .setDescription(`${data.link}\nWe are not responsible for the contents of this message. The code is randomly generated.`)
                .toJSON(true),
            components: new ComponentBuilder<MessageActionRow>()
                .addInteractionButton({
                    customID: State.new(interaction.user.id, "prntsc", "new").encode(),
                    label:    "New Image",
                    style:    ButtonColors.BLURPLE
                }).toJSON()
        });
    });
