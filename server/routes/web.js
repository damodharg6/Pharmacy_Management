var express = require('express'),
    router = express.Router(),
    path = require("path");

var absPath = path.join(__dirname, "../../app");

// Route to handle login page (root and /login)
router.get(['/', '/login'], function(req, res, next) {
    res.sendFile(absPath + "/login.html");
});

// Route to handle admin dashboard (/admin and /admin/dashboard)
router.get(['/admin', '/admin/dashboard'], function(req, res, next) {
    res.sendFile(absPath + "/views/user/index_manage.html");
});

// Route to handle doctor dashboard (/doctor and /doctor/dashboard)
router.get(['/doctor', '/doctor/dashboard'], function(req, res, next) {
    res.sendFile(absPath + "/dashboard.html");
});

// Route to handle pharmacist dashboard (/pharmacist, /pharmacist/dashboard, /dashboard)
router.get(['/pharmacist', '/pharmacist/dashboard', '/dashboard'], function(req, res, next) {
    res.sendFile(absPath + "/dashboard.html");
});

module.exports = router;