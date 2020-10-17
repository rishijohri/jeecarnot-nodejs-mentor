require('dotenv').config()
//console.log(process.env) // only to verify
const {
    render
} = require('ejs')
const express = require('express')
require('dotenv').config()
const router = require('express').Router()
var bodyparser = require("body-parser")
const msg91OTP = require('msg91-lib').msg91OTP;
const jwt = require('jsonwebtoken');
const msg91otp = new msg91OTP({
    authKey: process.env.MSG91_AUTH,
    templateId: process.env.MSG91_TEMPLATE
})
const secret = process.env.secret_json
const mailgun = require("mailgun-js");
const DOMAIN = 'jeecarnot.com';
const mg = mailgun({
    apiKey: process.env.MAILGUN_API,
    domain: DOMAIN
});
var senderEmail = 'JEECarnot <no-reply-test@carnot-test.com>'
var passport = require("passport")
var localStrategy = require('passport-local')
var localMongooseStrategy = require('passport-local-mongoose')
var Mentee = require('../models/menteeModel') // i have added extra field of plan ID which would be unique to each transaction (can be transaction id)
var Mentor = require("../models/mentorModel")
var Feedback = require("../models/feedbackModel")
var Request = require("../models/requestModel")
var Help = require("../models/helpModel")
var mongoose = require('mongoose');
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
passport.use(Mentee.createStrategy())
// passport.use(new localStrategy(Mentee.authenticate()))
passport.serializeUser(Mentee.serializeUser(function (user, done) {
    done(null, user.id)
}))
passport.deserializeUser(Mentee.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user)
    })
}))

router.post('/mentee/register/api/send-otp', formFill, async (req, res) => {
    try {
        var number = req.body.phone
        //console.log(number.length)
        const response = await msg91otp.send('+91' + number, {
            otp_expiry: 10
        })
        if (response.type == 'success') {
            res.json({
                type: 'success',
            })
        } else {
            res.json({
                type: 'failure',
                err: "duplicate number"
            })
        }
    } catch (err) {
        console.log("error in try");
        res.json({
            type: "failure",
        })
    }
})

router.post('/mentee/register', formFill, async (req, res) => {
    try {
        const response = await msg91otp.verify('+91' + req.body.phone, req.body.otp)
        if (response.type == 'success') {
            //if (true) { // for testing purposes use this if loop.
            console.log(req.body.email)
            Mentee.register(new Mentee({
                    name: req.body.name,
                    email: req.body.email,
                    phone: req.body.phone,
                }),
                req.body.password,
                function (err, newMentee) {
                    if (err) {
                        console.log(err)
                        res.json({
                            type: 'failure',
                            err: 'errorRegistering'
                        })
                    } else {
                        console.log(newMentee)
                        console.log('redirecting to: ' + '/mentee/' + newMentee._id.toString() + '/profile-complete')
                        var user = {
                            email: newMentee.email,
                            id: newMentee._id
                        }
                        console.log('now entering jwt loop')
                        jwt.sign({
                            user
                        }, secret, {
                            expiresIn: '24h'
                        }, async (err, token) => {
                            console.log('entered jwt loop')
                            if (err) {
                                console.log('encountered error')
                                console.log(err)
                            } else {
                                console.log('no error 1')
                                var link = 'localhost:3333/mentee/email/' + token.toString()
                                var emailData = {
                                    from: senderEmail,
                                    to: user.email,
                                    subject: 'Verify your Email',
                                    html: '<h1>Welcome to JEE CARNOT</h1><br><p>to verify your email pls click on link below</p><br><a href=' + link + '>Verify Your Email</a>'
                                }
                                var sentEmail = await mg.messages().send(emailData, function (error, body) {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(body)
                                    }
                                });
                            }
                        })
                        req.logIn(newMentee, (erri) => {
                            if (erri) {
                                console.log(erri)
                            }
                        })
                        res.json({
                            type: 'success',
                        })
                    }
                })
        } else {
            res.json({
                type: 'failure',
                err: 'failedVerification'
            })
        }
    } catch (error) {
        console.log(error);
        res.json({
            type: 'failure',
            err: 'unknown'
        })
    }
})

router.post('/mentee/register/api/resend-otp', formFill, async (req, res) => {
    try {
        const response = await msg91otp.retry("+91" + req.body.phone);
        res.json({
            type: 'success'
        })
    } catch (error) {
        console.log(error);
        res.json({
            type: 'failure',
            err: 'resendError'
        })
    }
})

router.get('/mentee/complete-profile', authentication, (req, res) => {
    res.send('ask more details') // this is where the page asking to complete profile comes. req has user details which can be used preload parts of form.
})

router.get('/mentee/register', (req, res) => {
    res.render("register") // this is where mentee mentee do registeration and phone verification
})

router.get('/mentee/login', (req, res, next) => {

    if (req.isAuthenticated()) {
        console.log('user aldready authenticated')
        res.redirect('/mentee/home')
    } else {
        return next()
    }
}, (req, res) => {
    res.render('login') // this is the login page

})

router.put('/mentee/profile-complete', authentication, async (req, res) => {
    try {
        req.body.plan = 'none' // Just to ensure that someone does not pass in plan as data in req
        req.body.planID = ""
        var updateQuery = await Mentee.findByIdAndUpdate(req.user._id, req.body, (err, updated) => {
            if (err) {
                res.json({
                    result: 'failure',
                    err: 'updateFailed'
                })
            } else {
                updated.profileVerification = true;
                updated.save((err) => {
                    if (err) {
                        res.json({
                            result: "failure",
                            err: "updateFailed"
                        })
                    } else {
                        res.json({
                            result: 'success'
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

router.post('/mentee/login', (req, res, next) => {
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

router.post('/mentee/phonelogin', async (req, res, next) => {
    try {
        if (req.body.phone != undefined && req.body.password != undefined) {
            var findQuery = await Mentee.findOne({
                phone: req.body.phone
            }, (err, ment) => {
                if (err) {
                    res.json({
                        type: 'failure',
                        err: err
                    })
                } else if (ment) {
                    req.body.email = ment.email
                    return next()
                }
            })
        } else {
            res.json({
                type: 'failure',
                err: 'incomplete'
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
}, passport.authenticate('local', {
    failureRedirect: '/mentee/login',
    successRedirect: '/mentee/home'
}))

router.post('/mentee/otplogin', async (req, res) => {
    try {
        console.log(req.body.phone)
        console.log(req.body.phone != undefined)
        console.log(req.body.phone.length)
        if (req.body.phone != undefined && req.body.phone.length == 10) {
            var response;
            try {
                response = await msg91otp.verify('+91' + req.body.phone, req.body.otp)
                if (response.type == 'success') {
                    Mentee.findOne({
                        phone: req.body.phone
                    }, (err, user) => {
                        console.log(user)
                        console.log(err)
                        if (err) {
                            console.log(err)
                            res.json({
                                type: 'failure',
                                err: err
                            })
                        } else if (user) {
                            console.log(user)
                            req.logIn(user, (erri) => {
                                if (erri) {
                                    console.log(erri)
                                }
                            })
                            res.json({
                                type: 'success'
                            })
                        } else {
                            res.json({
                                type: "failure",
                                err: 'undefinedUser'
                            })
                        }
                    })
                }
            } catch (error) {
                console.log(error);
                res.json({
                    type: 'failure',
                    err: 'failedVerification'
                })
            }
        } else {
            res.send('form incomplete')
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/login/api/send-otp", async (req, res) => {
    try {
        if (req.body.phone != undefined && req.body.phone.length == 10) {
            var response;
            var findQuery = await Mentee.findOne({
                phone: req.body.phone
            }, async (err, res) => {
                if (err) {
                    console.log(err);
                    res.json({
                        type: 'failure',
                        err: err
                    })
                } else if (res == null) {
                    res.json({
                        type: 'failure',
                        err: 'noNumberInData'
                    })
                } else {
                    try {
                        response = await msg91otp.send('+91' + req.body.phone, {
                            otp_expiry: 10
                        })
                        if (response.type == 'success') {
                            res.json({
                                type: 'success',
                                response
                            })
                        }
                    } catch (e) {
                        console.log(e)
                        response = e
                        res.json({
                            type: 'failure',
                            err: response
                        })
                    }
                }
            })
        } else {
            res.json({
                type: 'failure',
                err: 'incompleteForm'
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/login/api/resend-otp", async (req, res) => {
    try {
        if (req.body.phone != undefined && req.body.phone.length == 10) {
            try {
                var response = await msg91otp.retry('+91' + req.body.phone, {
                    otp_expiry: 10
                })
                res.json({
                    type: 'success',
                    err: response
                })
            } catch (e) {
                console.log(e)
                res.json({
                    type: 'failure',
                    err: e
                })
            }
        } else {
            res.json({
                type: 'failure',
                err: 'incompleteForm'
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get('/mentee/home', authentication, (req, res) => {
    try {
        res.json({
            message: 'id: ' + req.user._id
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get('/mentee/email/:ver', async (req, res) => {
    try {
        jwt.verify(req.params.ver, secret, async (err, authData) => {
            if (err) {
                res.send("Unable to verify try again")
            } else {
                var updateQuery = await Mentee.findByIdAndUpdate(authData.user.id, {
                    emailVerification: true
                }, (err, updated) => {
                    if (err) {
                        res.send("Unable to verify try again")
                    } else {
                        res.send('verified email thank you')
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

router.get('/mentee/logout', (req, res) => {
    try {
        req.logOut();
        res.json({
            message: 'loggedOut'
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})
// I had the option to use passport.authenticate however using that would automatically create user object in the next request which would limit use of the function
router.post('/mentee/profile/is-email-verified', authentication, (req, res) => {
    try {
        if (req.user.emailVerification) {
            res.json({
                result: "authorized"
            })
        } else {
            res.json({
                result: "unauthorized"
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/profile/is-profile-complete", authentication, (req, res) => {
    try {
        if (req.user.profileVerification) {
            res.json({
                result: "authorized"
            })
        } else {
            res.json({
                result: "unauthorized"
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentee/dashboard/my-mentor-details", authentication, async (req, res) => {
    var findQuery = await Mentee.findById(req.user._id, async (err, doc) => {
        if (err) {
            res.json({
                result: "error",
                err
            })
        } else {
            if (doc.mentorID != "none") {
                var mentorFind = await Mentor.findById(doc.mentorID, (error, mentor) => {
                    if (error) {
                        res.json({
                            result: "error",
                            error
                        })
                    } else {
                        res.json({
                            mentorName: mentor.name,
                            mentorPhone: mentor.phone,
                            mentorEmail: mentor.email,
                            mentorId: mentor._id,
                        })
                    }
                })
            } else {
                res.json({
                    result: "no mentor"
                })
            }
        }
    })
})

router.get("/mentee/dashboard/notifications/fetch-all", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, (err, docu) => {
            if (err) {
                res.json({
                    message: "Error Encountered"
                })
            } else {
                res.json({
                    notif: docu.notifications
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

router.get("/mentee/create-notifications", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, async (err, docu) => {
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
                var updateQuery = await Mentee.findByIdAndUpdate(req.user._id, {
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

router.post("/mentee/dashhboard/notifications/delete-one", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, async (err, docu) => {
            if (err) {
                res.json({
                    message: "failed"
                })
            } else {
                docu.notifications.id(req.body.notificationid).remove()
            }
            var saver = await docu.save((err) => {
                if (err) {
                    res.json({
                        message: "save error"
                    })
                } else {
                    res.json({
                        message: "success"
                    })
                }
            })
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/dashhboard/notifications/mark-as-read", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, async (err, docu) => {
            if (err) {
                res.json({
                    message: "failed"
                })
            } else {
                docu.notifications.id(req.body.notificationid).read = true
            }
            var saver = await docu.save((err) => {
                if (err) {
                    res.json({
                        message: "save error"
                    })
                } else {
                    res.json({
                        message: "success"
                    })
                }
            })
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/submit-feedback", authentication, async (req, res) => {
    try {
        var feddbackCreate = await Feedback.create(req.body.feedback, (err, dat) => {
            if (err) {
                res.json({
                    result: "error",
                    error: err
                })
            } else {
                res.json({
                    result: "success"
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

router.post("/mentee/account/change-password", authentication, async (req, res) => {
    try {
        if (req.body.oldPassword != undefined & req.body.newPassword != undefined) {
            var findQuery = await Mentee.findById(req.user._id, (err, ment) => {
                if (err) {
                    res.json({
                        message: "error"
                    })
                } else {
                    try {
                        ment.changePassword(req.body.oldPassword, req.body.newPassword, (erro) => {
                            if (erro.name == 'IncorrectPasswordError') {
                                res.json({
                                    result: "error",
                                    erro
                                })
                            } else {
                                ment.save()
                                res.json({
                                    result: "success"
                                })
                            }
                        })
                    } catch (error) {
                        res.json({
                            result: "error in changePassowrd",
                            error
                        })
                    }
                }
            })
        } else {
            res.json({
                result: "incomplete form"
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/dashboard/material-request", authentication, async (req, res) => {
    try {
        if (req.body.material != undefined) {
            var requests = req.body.material
            var past = []
            var select = true
            var findQuery = await Mentee.findById(req.user._id, async (error, ment) => {
                if (!error) {
                    requests.forEach(async element => {
                        if (ment.materialAccess.indexOf(element) == -1) {
                            var reqCreate = await Request.create({
                                menteeID: req.user._id,
                                material: element,
                            }, async (err, doc) => {
                                if (err) {
                                    select = false
                                } else {
                                    ment.requests.push(doc._id)
                                    var saver = await ment.save()
                                }
                            })
                        }
                    })
                } else {
                    select = false
                }
            })
            if (select) {
                res.json({
                    result: "success"
                })
            } else {
                res.json({
                    result: "error"
                })
            }
        } else {
            res.json({
                result: "form incomplete"
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentee/dashboard/past-material-requests", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, (err, doc) => {
            if (err) {
                res.json({
                    result: "error"
                })
            } else {
                var prev = doc.requests
                var len = prev.length
                let selection = false
                var detArr = []
                if (len - 1 >= 0) {
                    prev.forEach(async element => {
                        var reqFind = await Request.findById(element, (error, det) => {
                            if (error) {
                                selection = true
                            }
                            detArr.push(det);
                            if (element == prev[len - 1]) {
                                if (selection) {
                                    res.json({
                                        result: "error"
                                    })
                                } else {
                                    res.json({
                                        pastrequest: detArr,
                                    })
                                }
                            }
                        })
                    })
                } else {
                    res.json({
                        pastrequest: []
                    })
                }
            }
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/helpdesk/new-ticket", authentication, async (req, res) => {
    try {
        if (req.body.subject != null && req.body.description != null && req.user != null) {
            var helpCreate = await Help.create({
                menteeID: req.user._id,
                subject: req.body.subject,
                description: req.body.description,
            }, async (err, doc) => {
                if (err) {
                    res.json({
                        result: "error"
                    })
                } else {
                    var findQuery = await Mentee.findById(req.user._id, async (erro, ment) => {
                        if (erro) {
                            res.json({
                                result: "error",
                                erro
                            })
                        } else {
                            ment.tickets.push(doc._id)
                            var saver = await ment.save((error) => {
                                if (error) {
                                    res.json({
                                        result: "error",
                                        error
                                    })
                                } else {
                                    res.json({
                                        result: "success"
                                    })
                                }
                            })
                        }
                    })
                }
            })
        } else {
            res.json({
                result: "form incomplete"
            })
        }
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentee/helpdesk/past-tickets", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, (error, doc) => {
            if (error) {
                res.json({
                    result: "error",
                    error
                })
            } else {
                var helpIDs = doc.tickets
                var helpArr = []
                var len = helpIDs.length
                var selection = true
                if (len - 1 >= 0) {
                    helpIDs.forEach(async element => {
                        var helpFind = await Help.findById(element, (err, det) => {
                            if (err) {
                                selection = false
                            } else {
                                helpArr.push(det)
                            }
                            if (element == helpIDs[len - 1]) {
                                if (selection) {
                                    res.json({
                                        pasttickets: helpArr,
                                        result: "success"
                                    })
                                } else {
                                    res.json({
                                        result: "error",
                                        err
                                    })
                                }
                            }
                        })
                    });
                } else {
                    res.json({
                        pasttickets: []
                    })
                }
            }
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/library/get-access-token", authentication, (req, res) => {
    try {
        // var mat = req.body.material
        // var chk = req.user.materialAccess.indexOf(mat)
        // if (chk != -1) {
        //     jwt.sign({
        //         user: req.user._id,
        //         access: mat
        //     }, secret, {
        //         expiresIn: '1hr'
        //     }, (error, tok) => {
        //         if (error) {
        //             res.json({
        //                 result: "error",
        //                 error
        //             })
        //         } else {
        //             res.json({
        //                 result: "success",
        //                 token: tok
        //             })
        //         }
        //     })
        // } else {
        //     res.json({
        //         result: "forbidden"
        //     })
        // }
        var findQuery = await Mentee.findById(req.user._id, async (err, doc) => {
            if (err) {
                res.json({
                    result: "error"
                })
            } else {
                let selection = true
                let allReq = doc.requests
                let len = allReq.length
                if (len - 1 >= 0) {
                    allReq.forEach(async elem => {
                        var reqSearch = await Request.findById(elem, (error, subdoc) => {
                            if (error == null && subdoc.material == req.body.material && subdoc.status == 1) {
                                selection = false
                                jwt.sign({
                                    user: req.user._id,
                                    access: req.body.material
                                }, secret, {
                                    expiresIn: '1hr'
                                }, (error, tok) => {
                                    if (error) {
                                        res.json({
                                            result: "error",
                                            error
                                        })
                                    } else {
                                        res.json({
                                            result: "success",
                                            token: tok
                                        })
                                    }
                                })
                                if (elem == allReq[len - 1] && selection) {
                                    res.json({
                                        result: "forbidden"
                                    })
                                }
                            }
                        })
                    })
                } else {
                    res.json({
                        result: "forbidden"
                    })
                }
            }
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("/mentee/library/material/view/:ver", authentication, (req, res) => {
    try {
        jwt.verify(req.params.ver, secret, (err, authData) => {
            if (err) {
                res.json({
                    result: "error",
                    err
                })
            } else {
                var chk = req.user.materialAccess.indexOf(authData.access)
                if (chk != -1) {
                    res.json({
                        result: "success",
                        material: authData.access
                    })
                } else {
                    res.json({
                        result: "forbidden",
                    })
                }
            }
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.get("mentee/library/material/download/:ver", authentication, (req, res) => {
    try {
        jwt.verify(req.params.ver, secret, (err, authData) => {
            if (err) {
                res.json({
                    result: "error",
                    err
                })
            } else {
                var chk = req.user.materialAccess.indexOf(authData.access)
                if (chk != -1) {
                    res.json({
                        result: "success",
                        material: authData.access // TO BE CHANGED IN FUTURE
                    })
                } else {
                    res.json({
                        result: "forbidden",
                    })
                }
            }
        })
    } catch (error) {
        res.json({
            result: "unexpected error",
            error
        })
    }
})

router.post("/mentee/approve/request", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, async (error, doc) => {
            if (error) {
                res.json({
                    result: "error",
                })
            } else {
                doc.materialAccess.push(req.body.approve)
                var saver = await doc.save((err) => {
                    if (err) {
                        res.json({
                            result: "error"
                        })
                    } else {
                        res.json({
                            result: "success"
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

router.get("/mentee/account/payment-history", authentication, async (req, res) => {
    try {
        var findQuery = await Mentee.findById(req.user._id, (error, doc) => {
            if (error) {
                res.json({
                    result: "error",
                    error
                })
            } else {
                var paymentIDs = doc.payments
                var paymentArr = []
                var len = paymentIDs.length
                var selection = true
                if (len - 1 >= 0) {
                    paymentIDs.forEach(async element => {
                        var helpFind = await Payment.findById(element, (err, det) => {
                            if (err) {
                                selection = false
                                return;
                            } else {
                                paymentArr.push(det)
                            }
                            if (element == paymentIDs[len - 1]) {
                                if (selection) {
                                    res.json({
                                        payments: paymentArr,
                                        result: "success"
                                    })
                                } else {
                                    res.json({
                                        result: "error",
                                        err
                                    })
                                }
                            }
                        })
                    });
                } else {
                    res.json({
                        payments: []
                    })
                }
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

const validate = (email) => {
    const expression = /(?!.*\.{2})^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i

    return expression.test(String(email).toLowerCase())
}

function formFill(req, res, next) {
    if (typeof (req.body.name) != 'undefined' &&
        typeof (req.body.email) != 'undefined' && validate(req.body.email) &&
        typeof (req.body.password) != 'undefined' &&
        typeof (req.body.phone) != 'undefined' &&
        req.body.phone.length == 10) {
        Mentee.findOne({
            phone: req.body.phone
        }, (err, found) => {
            if (err) {
                console.log('encountered an error')
                console.log(err)
                res.json({
                    type: 'failure',
                    err: 'unknown 1'
                })
            } else if (found) {
                console.log('aldready registered')
                res.json({
                    type: 'failure',
                    err: 'duplicateMobile'
                })
            }
        })
        Mentee.findOne({
            email: req.body.email
        }, (err, fnd) => {
            if (err) {
                res.json({
                    type: 'failure',
                    err: 'unknown 2'
                })
            } else if (fnd) {
                res.json({
                    type: 'failure',
                    err: 'duplicateEmail'
                })
            } else {
                return next()
            }
        })
    } else if (req.body.phone.length != 10) {
        console.log('wrong number');
        res.json({
            type: 'failure',
            err: 'invalidNumber'
        })
    } else {
        console.log('form incomplete');
        res.json({
            type: 'failure',
            err: "incomplete"
        })
    }
}
// when actually implementing on website remember to change local host to website name
module.exports = router