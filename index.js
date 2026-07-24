import { Client, GatewayIntentBits, ActivityType, Collection } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import mongoose from "mongoose";
dotenv.config();

// Create client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const voxCraftEnabled = process.env.ENABLE_VOX_CRAFT !== 'false';
if(voxCraftEnabled){
    mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err));
   
}
// Command handler
client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    client.commands.set(command.default.name, command.default);
}
const PresenceText = process.env.PRESENCE_TEXT || "Crafty API";
// Ready
client.on("ready", (c) => {
    console.log(`Bot logged in as ${c.user.tag}`);
    c.user.setPresence({
        status: "online",
        activities: [{ name: PresenceText, type: ActivityType.Watching }],
    });
});
const welcomeEnabled = process.env.ENABLE_WELCOME_MSG !== 'false';
const welcomeRoleEnabled = process.env.ENABLE_WELCOME_ROLE !== 'false';

client.on("guildMemberAdd", async (member) => {
    try {
        // 1. Willkommensnachricht
        if (welcomeEnabled) {
            const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
            
            if (channel) {
                // Den Text aus der .env holen
                const rawMsg = process.env.WELCOME_MSG || "👋 Hallooo {user}! \nWelcome!";

                // WICHTIG: Die Ersetzung muss HIER passieren, wenn ein Mitglied beitritt
                const finalMsg = rawMsg
                    .replace("{user}", member)    // Ersetzt den Platzhalter durch die Erwähnung
                    .replace(/\\n/g, '\n');       // Wandelt Text-\n in echte Zeilenumbrüche um

                await channel.send(finalMsg);
            }
        }

        // 2. Rollenzuweisung
        if (welcomeRoleEnabled) {
            const role = member.guild.roles.cache.get(process.env.DEFAULT_ROLE_ID);
            if (role) {
                await member.roles.add(role);
            }
        }
    } catch (err) {
        console.error("Error handling new member:", err);
    }
});


// Interaction handler
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        interaction.reply({ content: "Error executing command.", ephemeral: true });
    }
});
const axios = require('axios');

module.exports = {
  name: 'mc-players',
  description: 'Show online players',
  async execute(interaction) {
    try {
      const response = await axios.get(`http://localhost:8000/api/v1/server/1/players`, {
        headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
      });
      const players = response.data.players;
      if (players.length === 0) {
        await interaction.reply('No players are currently online.');
      } else {
        await interaction.reply(`Online players: ${players.join(', ')}`);
      }
    } catch (error) {
      console.error(error);
      await interaction.reply('Failed to fetch player list.');
    }
  }
};

client.login(process.env.BOT_TOKEN);
