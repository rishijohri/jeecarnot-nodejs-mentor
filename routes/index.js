const {
    render
} = require('ejs')
const router = require('express').Router()

router.get('/', (req, res) => {
    res.json({
        success: true,
        msg: 'This is homepage'
    })
})


router.get((req, res) => {
    res.sendStatus(404);
})

module.exports = router