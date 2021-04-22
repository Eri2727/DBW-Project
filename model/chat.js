const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: String, //username of the sender
    body: String, //the message
    date: Date, //date of creation
    messages: [this]
});

const chatSchema = new mongoose.Schema({ //group of messages and people
    name: String, //name of the group
    date: Date, //date in which group was created
    users: [String], //usernames of people belonging to the group
    messages: [messageSchema]
})

const chat = new mongoose.model("chat", chatSchema);

module.exports = chat;