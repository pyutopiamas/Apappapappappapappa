const { EmbedBuilder } = require('discord.js');
const User = require('../models/user'); // Import your User model (adjust the path as needed);
const { wlEmoji, emoji2, emoji1, prefix } = require('../config.json');

module.exports = {
  name: 'info',
  description: 'Get GrowID and balance information for a tagged user',
  async execute(message, args) {
    if (!message.guild) {
      message.channel.send('This command can only be used in a guild.');
      return;
    }

    // Check if a user is mentioned
    const taggedUser = message.mentions.users.first();

    if (!taggedUser) {
      message.channel.send('**Please mention the user to get information about.**');
      return;
    }

    try {
      // Check if the mentioned user exists in the database
      const discordId = taggedUser.id;
      const user = await User.findOne({ discordId });

      if (!user) {
        message.channel.send(`${taggedUser.tag} needs to set their GrowID using the **${prefix}set** command first.`);
        return;
      }

      // Send the mentioned user's GrowID and balance information
      const depoEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${taggedUser.tag}'s Account Information`)
        .setDescription(`${emoji2}  GrowID: **${user.growId}**
${emoji1}  Balance: **${user.balance} ${wlEmoji}**`);

      message.channel.send({ embeds: [depoEmbed] });

    } catch (error) {
      console.error('Error:', error);
      message.channel.send('Something went wrong.');
    }
  },
};
