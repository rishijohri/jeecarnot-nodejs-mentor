var mongoose = require("mongoose")
var requestSchema = mongoose.Schema({
    menteeID: {
        type: String,
        default: ""
    },
    material: String,
    status: {
        type: Number,
        default: 0
    },
}, {timestamps: true})
module.exports = mongoose.model("Request", requestSchema)