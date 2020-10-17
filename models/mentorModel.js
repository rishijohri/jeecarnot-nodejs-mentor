var mongoose = require("mongoose")
var passportLocalMongoose = require("passport-local-mongoose")
var Notifications = require("./notificationModel.js")
var TodoSchema = mongoose.Schema({
    task : String,
        isCompleted : Boolean
})
var MentorSchema = mongoose.Schema({
    name: String,
    password: String,
    username: String,
    phone: String,
    whatsapp: String,
    menteesID : [String],
    todo : [TodoSchema],
    notifications : [Notifications]
})
MentorSchema.plugin(passportLocalMongoose, {
    usernameField: 'email'
})

module.exports = mongoose.model('Mentor', MentorSchema)