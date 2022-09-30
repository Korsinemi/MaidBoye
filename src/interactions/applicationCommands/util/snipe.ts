import Command, { ValidLocation } from "../../../util/cmd/Command.js";
import db from "../../../db/index.js";
import Util from "../../../util/Util.js";
import { TextableGuildChannelsWithThreads } from "../../../util/Constants.js";
import type { Snipe } from "../../../util/@types/misc.js";
import EncryptionHandler from "../../../util/handlers/EncryptionHandler.js";
import { Strings } from "@uwu-codes/utils";
import { ApplicationCommandOptionTypes, MessageFlags } from "oceanic.js";

export default new Command(import.meta.url, "snipe")
    .setDescription("Get the last deleted message in a channel")
    .addOption(
        new Command.Option(ApplicationCommandOptionTypes.CHANNEL, "channel")
            .setDescription("The channel to snipe from")
            .setChannelTypes(TextableGuildChannelsWithThreads)
    )
    .setOptionsParser(interaction => ({
        channel: interaction.data.options.getChannelOption("channel")?.value || interaction.channelID
    }))
    .setValidLocation(ValidLocation.GUILD)
    .setExecutor(async function(interaction, { channel }) {
        const snipe = await db.redis.lpop(`snipe:delete:${channel}`);
        if (snipe === null) return interaction.reply({
            content: "H-hey! No snipes were found..",
            flags:   MessageFlags.EPHEMERAL
        });
        const d = JSON.parse(snipe) as Snipe;
        const len = await db.redis.llen(`snipe:delete:${channel}`);
        return interaction.reply({
            embeds: Util.makeEmbed(true, interaction.user)
                .setTitle("Delete Snipe")
                .setDescription([
                    `From <@!${d.author}> - Deleted At ${Util.formatDiscordTime(d.time, "short-datetime", true)}`,
                    `> ${Strings.truncateWords(EncryptionHandler.decrypt(d.content), 250, true)}`,
                    "",
                    ...(d.ref === null ? [] : [
                        `Replied Message - <@!${d.ref.author}>:`,
                        `> ${Strings.truncateWords(EncryptionHandler.decrypt(d.ref.content), 100, true)} [[Jump](${d.ref.link})]`
                    ])
                ].join("\n"))
                .setFooter(`UwU | ${len} Snipe${len === 1 ? "" : "s"} Remaining`)
                .toJSON(true)
        });
    });