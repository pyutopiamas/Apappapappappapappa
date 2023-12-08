const { sendStockMessage } = require('../models/shared');
const purchaseEmitter = require('../events/purchaseEmitter');
const config = require('../config.json');
const mongoose = require('mongoose'); // Import Mongoose

// Define a schema for storing the previousMessageId
const PreviousMessageIdSchema = new mongoose.Schema({
  messageId: String,
});

// Create a model for the PreviousMessageId schema
const PreviousMessageId = mongoose.model('PreviousMessageId', PreviousMessageIdSchema);

module.exports = {
  name: 'realtime',
  description: 'Display real-time product stock information',
  async execute(message, args) {
    if (!config.adminIds.includes(message.author.id) && message.author.id !== config.yourBotId) {
      return message.reply('You do not have permission to use this command.');
    }

    const updateInterval = 30 * 1000; // 30 seconds in milliseconds

    // Function to send the stock message
    const sendStockUpdate = async () => {
      try {
        const sentMessage = await sendStockMessage(message);
        if (sentMessage) {
          // Save the new message ID to the database if needed
          // (Previous message can be handled separately in the database)
          // For instance: Save sentMessage.id to the database
          console.log('Stock message updated:', sentMessage.id);
        } else {
          console.log('No products found in the database.');
        }
      } catch (error) {
        console.error('Error updating stock message:', error);
      }
    };

    // Initial call to start the updates
    sendStockUpdate();

    // Set up the periodic updates every 30 seconds
    setInterval(sendStockUpdate, updateInterval);

    // Handle purchase events, sending an update on each purchase
    purchaseEmitter.on('purchase', sendStockUpdate);
  },
};
