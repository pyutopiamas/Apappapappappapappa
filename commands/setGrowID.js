const { Client, Message } = require('discord.js');
const User = require('../models/user');
const { EmbedBuilder } = require('discord.js');
const { prefix } = require('../config.json');

module.exports = {
  name: 'set',
  description: 'Set the GrowID for a tagged user.',
  /**
   * @param {Message} message
   * @param {string[]} args
   */
  execute(message, args) {
    // Check if there's a GrowID and a tagged user provided in the command
    if (args.length < 2) {
      return message.reply(`**Please provide the tagged user and their GrowID after the** **__${prefix}set__** **command.**`);
    }

    const taggedUser = message.mentions.users.first(); // Get the mentioned user
    const growID = args.slice(1).join(' '); // Extract the provided GrowID from args

    if (!taggedUser) {
      return message.reply('**Please mention the user you want to set the GrowID for.**');
    }

    const discordId = taggedUser.id; // Get the tagged user's Discord ID

    // Check if the GrowID is already taken in the database
    User.findOne({ growId: growID })
      .then((existingUser) => {
        if (existingUser) {
          return message.reply('This GrowID has already been taken.');
        }

        // Continue with the process if the GrowID is not taken
        User.findOne({ discordId: discordId })
          .then((user) => {
            if (user) {
              // If the user exists, update their GrowID
              user.growId = growID;
              user.save();
              message.reply(`Successfully updated ${taggedUser.tag}'s GrowID to ${growID}.`);
            } else {
              // If the user does not exist, create a new user
              const newUser = new User({
                discordId,
                discordTag: taggedUser.tag,
                growId,
                balance: 0, // You can set an initial balance here
              });
              newUser.save();
              const depoEmbed = new EmbedBuilder()
                .setColor('Random')
                .setDescription(`*_Welcome! ${taggedUser.tag}'s GrowID is now set to_* **${growID}**`);

              message.reply({ embeds: [depoEmbed] });
            }
          })
          .catch((error) => {
            console.error('Error:', error);
            message.reply('Something went wrong.');
          });
      })
      .catch((error) => {
        console.error('Error:', error);
        message.reply('Something went wrong.');
      });
  },
};
