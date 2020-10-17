require('dotenv').config()
//console.log(process.env) // only to verify
const {
    render
} = require('ejs')
const express = require('express')
require('dotenv').config()
const router = require('express').Router()
var mongoose = require("mongoose")
var bodyparser = require("body-parser");
const jwt = require('jsonwebtoken');
const secret = process.env.secret_json
const mailgun = require("mailgun-js");
const DOMAIN = 'jeecarnot.com';
var senderEmail = 'JEECarnot <no-reply-test@carnot-test.com>'
var http = require('https')
var passport = require("passport")
var localStrategy = require('passport-local')
var localMongooseStrategy = require('passport-local-mongoose')
var Notifications = require("../models/notificationModel.js")
var Mentor = require("../models/mentorModel")
var Mentee = require("../models/menteeModel")
var Request = require("../models/requestModel")
const {
    assert
} = require('console');
var mongoDB = "mongodb://localhost:27017/carnot"
router.use(bodyparser.urlencoded({
    extended: true
}))
mongoose.connect(mongoDB, {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
var db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
router.use(express.static('public'))
router.use(require("express-session")({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
router.use(passport.initialize())
router.use(passport.session())
passport.use(Mentor.createStrategy())
passport.serializeUser(Mentor.serializeUser(function (user, done) {
    done(null, user.id)
}))
passport.deserializeUser(Mentor.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user)
    })
}))

router.post("/mentor/register", (req, res) => {
    try {
        Mentor.register({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            whatsapp: req.body.whatsapp,
        }, req.body.password, (err, newMentor) => {
            if (err) {
                console.log(err)
                res.json({
                    type: 'failure',
                    err: 'errorRegistering'
                })
            } else {
                console.log(newMentor)
                req.logIn(newMentor, (erri) => {
                    if (erri) {
                        console.log(erri);
                    }
                })
                req.logIn(newMentor, (err, done) => {
                    if (err) {
                        console.log(err)
                    }
                })
                res.json({
                    type: 'success',
                })
            }
        })
    } catch (error) {
        res.json({
            type: 'unexpected error',
            error
        })
    }
})

router.post('/mentor/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { // critical error 
            // logger.error('err is not null, unknown error occured while logging in',{body:req.body},{info:info},{err:err})
            res.json({
                type: 'failure',
                err: 'errIsNotNull'
            })
        } else {
            if (user) {
                req.logIn(user, error => {
                    if (!error)
                        res.json({
                            type: 'success'
                        })
                    else
                        res.json({
                            type: 'failure',
                            err: 'errorInReq.Login'
                        })
                })
            } else {
                if (info.name == 'IncorrectUsernameError' || info.name == 'IncorrectPasswordError')
                    res.json({
                        type: 'failure',
                        err: 'incorrectCredentials',
                    })
                else {
                    // critical error 
                    // logger.error('unknown error occured while logging in',{body:req.body},{info:info},{err:err})
                    res.json({
                        type: 'failure',
                        err: 'unknown'
                    })
                }
            }
        }
    })(req, res, next)
})

router.post("/mentor/account/change-password", authentication, async (req, res) => {
    try {
        if (req.body.oldPassword == undefined || req.body.newPassword == undefined)
            return res.json({
                result: "form incomplete"
            })
        let mentor = await Mentor.findById(req.user._id)
        let newmentor = await mentor.changePassword(req.body.oldPassword, req.body.newPassword)
        if (newmentor)
            return res.json({
                result: "success"
            })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentor/dashboard/notifications/fetch-all", authentication, async (req, res) => {
    // try {
    let ment = await Mentor.findById(req.user._id)
    return res.json({
        result: "success",
        notifications: ment.notifications
    })
    // } catch (error) {
    //     res.json({
    //         result: "unexpected error",
    //         error : error
    //     })
    // }
})

router.post("/mentor/dashboard/notifications/mark-as-read", authentication, async (req, res) => {
    try {
        let ment = await Mentor.findById(req.user._id)
        let notifys = ment.notifications
        notifys.id(req.body.notificationid).read = true
        await ment.update({
            notifications: notifys
        })
        return res.json({
            result: "success"
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentor/dashboard/notifications/delete-one", authentication, async (req, res) => {
    try {
        let ment = await Mentor.findById(req.user._id)
        let notifys = ment.notifications
        notifys.id(req.body.notificationid).remove()
        await ment.update({
            notifications: notifys
        })
        return res.json({
            result: "success"
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentor/fetch-my-mentees", authentication, async (req, res) => {
    try {
        let detArr = []
        let mentor = await Mentor.findById(req.user._id);
        let menteeIDs = mentor.menteesID
        for (let menteeID of menteeIDs) {
            let mentee = await Mentee.findById(menteeID)
            detArr.push({
                name: mentee.name,
                email: mentee.email,
                phone: mentee.phone,
                assignedOn: mentee.mentorAssign,
            });
        }
        return res.json({
            mentees: detArr,
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentor/fetch-my-profile", authentication, async (req, res) => {
    try {
        let mentor = await Mentor.findById(req.user._id)
        return res.json({
            name: mentor.name,
            phone: mentor.phone,
            email: mentor.email,
            result: "success"
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentor/fetch-material-requests", authentication, async (req, res) => {
    try {
        if (req.body.menteeId == undefined)
            return res.json({
                result: "form incomplete"
            })
        let mentor = await Mentor.findById(req.user._id)
        let mentee = await Mentee.findById(req.body.menteeId)
        let requestIds = mentee.requests
        let detArr = []
        for (let requestId of requestIds) {
            detArr.push(await Request.findById(requestId))
        }
        return res.json({
            requests: detArr
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentor/update-material-requests", authentication, async (req, res) => {
    try {
        if (req.body.requestId == undefined || req.body.action == undefined)
            return res.json({
                result: "form incomplete"
            })
        for (let requestId of req.body.requestId) {
            if (req.body.action == "approve") {
                let doc = await Request.findById(requestId)
                doc.status = 1
                doc.save()
            }
            if (req.body.action == "reject") {
                let doc = await Request.findById(requestId)
                doc.status = -1
                doc.save()
            }
        }
        return res.json({
            result: "success"
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentor/todos/all-todos", authentication, async (req, res) => {
    try {
        let mentor = await Mentor.findById(req.user._id)
        return res.json({
            todos: mentor.todo
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentor/todos/add-task", authentication, async (req, res) => {
    try {
        if (req.body.task == undefined)
            return res.json({
                result: "form incomplete"
            })
        let mentor = await Mentor.findById(req.user._id)
        await mentor.update({
            $push: {
                todo: {
                    task: req.body.task,
                    isCompleted: false
                }
            }
        })
        return res.json({
            result: "success"
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentor/todos/edit-task", authentication, async (req, res) => {
    try {
        if (req.body.taskid == undefined)
            return res.json({
                result: "form incomplete"
            })
        let mentor = await Mentor.findById(req.user._id)
        let todos = mentor.todo
        if (req.body.task != undefined && req.body.action == "edit")
            todos.id(req.body.taskid).task = req.body.task
        if (req.body.action == "delete")
            todos.id(req.body.taskid).remove()
        if (req.body.action == "markComplete")
            todos.id(req.body.taskid).isCompleted = true
        if (req.body.action == "markIncomplete")
            todos.id(req.body.taskid).isCompleted = false
        await mentor.update({
            todo: todos
        })
        res.json({
            result: "success"
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentor/assignMentee", authentication, async (req, res) => {
    let mentor = await Mentor.findById(req.user._id)
    mentor.menteesID.push(req.body.ment)
    mentor.save()
    res.json({
        result: "fake api"
    })
})

router.post("/mentor/create", authentication, async (req, res) => {
    try {
        var findQuery = await Mentor.findById(req.user._id, async (err, docu) => {
            if (err) {
                res.json({
                    message: "error"
                })
            } else {
                var arr = docu.notifications
                arr.push({
                    title: "hero",
                    description: "Testing",
                    button: "Cool"
                })
                var updateQuery = await Mentor.findByIdAndUpdate(req.user._id, {
                    notifications: arr
                }, (err, call) => {
                    if (err) {
                        res.json({
                            message: "update error"
                        })
                    } else {
                        res.json({
                            message: 'success'
                        })
                    }
                })

            }
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

function authentication(req, res, next) {
    //console.log('status of authentication is '+req.isAuthenticated)
    if (req.isAuthenticated()) {
        return next()
    } else {
        console.log("unable to authenticate " + req.isAuthenticated())
        res.json({
            type: 'failure',
            err: 'failedAuthentication'
        })
    }
}
module.exports = router