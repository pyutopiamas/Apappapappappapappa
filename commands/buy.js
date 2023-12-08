// Import necessary libraries
const Product = require('../models/product');
const User = require('../models/user');
const purchaseEmitter = require('../events/purchaseEmitter');
const fs = require('fs');
const mongoose = require('mongoose'); // Import Mongoose
const { imageURL, wlEmoji, emoji1, emoji2, roleToadd } = require('../config.json');
const { buylogChannelId } = require('../config.json'); // Replace with the ID of your chosen log channel
const OrderCount = require('../models/orderCount'); // Import the OrderCount model
const { EmbedBuilder } = require('discord.js');

// Initialize the order count from the database
let orderCount = 0;

// Function to get the order count from the database
const getOrderCount = async () => {
  const orderCountDoc = await OrderCount.findOne();
  if (orderCountDoc) {
    return orderCountDoc.count;
  }
  return 0; // Return 0 if no orderCount document found
};

module.exports = {
  name: 'buy',
  description: 'Buy a random product',
  async execute(message, args) {
    if (!message.guild) {
      return message.channel.send('This command can only be used in a guild.');
    }

    // Check if there's a GrowID provided in the command
    if (args.length < 3) {
      return message.channel.send('Please provide the user to whom you want to send the details, the code of the product, and the quantity you want to buy.\nExample: `.buy @user#1234 PRODUCT-CODE 1`');
    }

    const taggedUser = message.mentions.users.first();

    if (!taggedUser) {
      return message.channel.send('Please mention the user to whom you want to send the details.');
    }

    const discordId = taggedUser.id; // Get the user's Discord ID

    // Check if the channel where the command was used is a ticket channel
    if (!message.channel.name.startsWith('ticket-')) {
      return message.channel.send('This command can only be used in a ticket channel.');
    }

    const productCode = args[1];
    const quantity = parseInt(args[2]);

    const logChannel = message.guild.channels.cache.get(buylogChannelId);

    if (isNaN(quantity) || quantity <= 0) {
      return message.channel.send('Please provide a valid quantity greater than 0.');
    }

    try {
      let purchasedAccounts = [];
      // Check if the user already exists in the database
      const user = await User.findOne({ discordId });

      if (!user) {
        return message.channel.send('This user has not set their GrowID using the `.set` command.');
      }

      // Find the product in the database by code
      const product = await Product.findOne({ code: productCode });

      if (!product) {
        return message.channel.send('This product does not exist.');
      }

      // Check if there are variations (account details) available
      if (!product.variations || product.variations.length === 0) {
        return message.channel.send('There are no product details available for this product.');
      }

      // Check if there's enough stock to buy
      if (product.stock < quantity) {
        return message.channel.send(`There is not enough stock to purchase ${quantity} of this product.`);
      }

      // Calculate the total price based on the quantity of products
      const totalPrice = product.price * quantity;

      // Check if the user has enough balance to make the purchase
      if (user.balance < totalPrice) {
        return message.channel.send('This user does not have enough balance to purchase this quantity of the product.');
      }

      // Check the product type
      switch (product.type) {
        case 'yes':
          // Handle "yes" type using the asynchronous function
          await handleYesType(user, taggedUser, product, quantity);
          break;

        case 'no':
          // For "any-product" type, reduce both stock and details
          if (product.variations.length < quantity) {
            return message.channel.send(`There are only **${product.variations.length} ${product.name}** available for purchase.`);
          }
          purchasedAccounts = [];
          const randomIndexes = [];

          for (let i = 0; i < quantity; i++) {
            // Generate a random index
            let randomIndex;
            do {
              randomIndex = Math.floor(Math.random() * product.variations.length);
            } while (randomIndexes.includes(randomIndex)); // Ensure we don't select the same detail twice

            randomIndexes.push(randomIndex);

            const selectedVariation = product.variations[randomIndex];
            purchasedAccounts.push(selectedVariation);
          }
          // Remove the purchased details from the product's variations
          product.variations = product.variations.filter((_, index) => !purchasedAccounts.includes(product.variations[index]));

          // Update the stock count
          product.stock -= quantity;

          // Save the updated product to the database
          await product.save();

          // Emit the 'purchaseMade' event to trigger real-time stock update
          purchaseEmitter.emit('purchase');

          const detailsMessage = purchasedAccounts.join('\n');
          const fileName = `${user.growId}.txt`;

          // Create the details file
          fs.writeFileSync(fileName, detailsMessage);

          // Send the file to the user via DM
          const embedDM = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Purchase Successful')
            .setDescription(`You have purchased **${quantity} ${product.name.replace(/"/g, '')}** worth **${totalPrice}${wlEmoji}**\n**Don't forget to give reps.**\n`)
            .setImage(imageURL)
            .setTimestamp();
          await taggedUser.send({ embeds: [embedDM], files: [fileName] });

          // Delete the file after sending
          fs.unlinkSync(fileName);
          break;

        // Add other cases for different product types if needed
        default:
          return message.channel.send('This product type is not supported.');
      }

      // Save the updated product to the database
      await product.save();

      // Deduct the total price from the user's balance
      user.balance -= totalPrice;
      await user.save();

      // Fetch the current orderCount
      orderCount = await getOrderCount();

      // Increment the order count
      orderCount++;

      // Update the order count in the database
      await OrderCount.findOneAndUpdate({}, { count: orderCount }, { upsert: true });

      // Emit the 'purchaseMade' event to trigger real-time stock update
      purchaseEmitter.emit('purchase');

      // Add the role to the user
      const roleToAdd = message.guild.roles.cache.get(product.roleToadd);

      if (roleToAdd) {
        // Retrieve the member based on the tagged user
        const member = message.guild.members.cache.get(taggedUser.id);

        if (member) {
          // Add the role to the member
          await member.roles.add(roleToAdd);
        } else {
          // Handle the case where the member is not found
          return message.channel.send('Unable to find the member to add the role.');
        }
      } else {
        // Handle the case where the role is not found
        return message.channel.send('Role to add not found.');
      }

      // Create the purchase log embed
      const purchaseLogEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Order Number: **${orderCount}**`)
        .setDescription(`${emoji1} Buyer: <@${taggedUser.id}>
${emoji1} Product: **${product.name.replace(/"/g, '')}**
${emoji1} Code: **${product.code}**
${emoji1} Total Price: **${totalPrice}** ${wlEmoji}\n\n**Thanks For Purchasing Our Product(s)**
${emoji1} Quantity: **${quantity}**
${emoji1} Discord ID: **${taggedUser.id}**
${emoji1} GrowID: **${user.growId}**
${emoji1} Message: Sent details to <@${taggedUser.id}>`);

      // Send the purchase log embed to the specified log channel
      await logChannel.send({ embeds: [purchaseLogEmbed] });

      // Send success message
      return message.channel.send(`Successfully sent details of **${quantity} ${product.name.replace(/"/g, '')}** to <@${taggedUser.id}> and added the role.`);
    } catch (error) {
      console.error(error);
      return message.channel.send('An error occurred while processing the purchase.');
    }
  },
};

// Function to handle "yes" type products
async function handleYesType(user, taggedUser, product, quantity) {
  // Function implementation
}

// Function to handle autosend type products (customize as needed)
async function autosendFunction(user, taggedUser, product, quantity) {
  // Function implementation
    }
