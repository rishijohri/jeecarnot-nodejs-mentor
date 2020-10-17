var mongoose = require("mongoose")
var feedbackSchema = mongoose.Schema({
    effort: {
        type: String,
        default: ""
    },
    mentorEffort: {
        type: String,
        default: ""
    },
    serviceSatisfaction: {
        type: String,
        default: ""
    },
    mathAssignment: {
        type: String,
        default: ""
    },
    physicsAssignment: {
        type: String,
        default: false
    },
    chemAssignment: {
        type: String,
        default: false
    },
    assignedWork: {
        type: String,
        default: false
    },
    supportMentor: {
        type: String,
        default: false
    },
    queryMentor: {
        type: String,
        default: false
    },
    materialMentor: {
        type: String,
        default: false
    },
    motivateMentor: {
        type: String,
        default: false
    },
    regularMentor: {
        type: String,
        default: false
    },
    focusMentor: {
        type: String,
        default: false
    },
    difficultMentor: {
        type: String,
        default: false
    },
    carnotEffectiveness: {
        type: String,
        default: false
    },
    commentMentor: {
        type: String,
        default: false
    },
    carnotRecommend: {
        type: String,
        default: false
    },
}, {timestamps: true})
module.exports = mongoose.model('Feedback', feedbackSchema)