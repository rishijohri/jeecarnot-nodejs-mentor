var mongoose = require("mongoose")
var notificationSchema = mongoose.Schema({
    title: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    button: {
        type: String,
        default: ""
    },
    link: {
        type: String,
        default: ""
    },
    read: {
        type: Boolean,
        default: false
    }
})
module.exports = notificationSchema