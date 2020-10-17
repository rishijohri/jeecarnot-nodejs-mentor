var mongoose = require("mongoose")
var helpSchema = mongoose.Schema({
    menteeID: {
        type: String,
        default: ""
    },
    subject: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: "pending"
    }
}, {timestamps: true})
module.exports = mongoose.model("Help", helpSchema)