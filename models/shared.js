const { EmbedBuilder } = require('discord.js');
const Product = require('../models/product');
const { thumbnailURL, imageURL, wlEmoji, emoji1, emoji2, StoreName } = require('../config.json');

const sendStockMessage = async (message) => {
  try {
    const products = await Product.find();

    if (products.length === 0) {
      return message.reply('No products found in the database.');
    }

    const stockInfoEmbed = new EmbedBuilder()
      .setColor('#DC143C')
      .setTitle('<a:Mega:1175067378934095903> REALTIME STOCK <a:Mega:1175067378934095903>\nUpdated: <t:' + Math.floor(Date.now() / 1000) + ':R>')
      .setImage(imageURL)
      .setTimestamp()
    .setFooter({ text: `${StoreName}` });

    products.forEach((product) => {
      stockInfoEmbed.addFields(
        {
          name: `<a:Crown:1175068225881509969> ${product.name.replace(/"/g, '')} <a:Crown:1175068225881509969>`,
          value: `${emoji1}  Code: **${product.code}**\n${emoji1}  Stock: **${product.stock}**\n${emoji1}  Price: **${product.price}** ${wlEmoji}\n <:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142><:Garis:1175067295614251142>\n`,
          inline: false,
        }
      );
    });

    let sentMessage;

    if (!message._editedMessage) {
      // Send the initial stock message
      sentMessage = await message.channel.send({ embeds: [stockInfoEmbed] });
      message._editedMessage = sentMessage; // Store the initial message for editing
    } else {
      // Edit the existing message to update stock information
      sentMessage = await message._editedMessage.edit({ embeds: [stockInfoEmbed] });
    }

    return sentMessage; // Return the sent message object
  } catch (error) {
    console.error('Error:', error);
    return null; // Return null in case of an error
  }
};

module.exports = { sendStockMessage };
