var mongoose = require("mongoose")
var paymentModel = mongoose.Schema({
    tickettime: {
        type: String,
        default: "None"
    },
    ticketid: {
        type: String,
        default: "None"
    },
    subject: {
        type: String,
        default: "None"
    },
    description: {
        type: String,
        default: "None"
    },
    status: {
        type: String,
        default: "None"
    }
}, {timestamps: true})

module.exports = mongoose.model("Payment", paymentModel)