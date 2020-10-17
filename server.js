require('dotenv').config()
const express = require('express')
const app = express()
const morgan = require('morgan')
const fs = require('fs')
var path = require('path')

const routes = require('./routes/index')
const mentorRoute = require('./routes/mentor')
// Middlewares
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

// Start Morgan Logger
if (process.env._NODE_ENV === 'production') {
    app.use(morgan('common', {
        stream: fs.createWriteStream(path.join(__dirname, '/logs/access.log'), {
            flags: 'a'
        })
    }))
} else {
    app.use(morgan('dev'));
}

// Routes
app.use(routes)
app.use(mentorRoute)


// Start server
const PORT = process.env._NODE_PORT || 3000
server = app.listen(PORT, console.log(`Server running in ${process.env._NODE_ENV} mode on port ${PORT}`))