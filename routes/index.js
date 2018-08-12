
var express = require("express");
var router = express.Router();
var pageUtils = require("utils/page.js");
var accountUtils = require("utils/account.js");
var gameUtils = require("utils/game.js");
var app = require("sortWorld");

var checkAuthentication = pageUtils.checkAuthentication;
var serveMessagePage = pageUtils.serveMessagePage;
var JSON_ERROR_OUTPUT = pageUtils.errorOutput.JSON_ERROR_OUTPUT;
var PAGE_ERROR_OUTPUT = pageUtils.errorOutput.PAGE_ERROR_OUTPUT;
var SOCKET_ERROR_OUTPUT = pageUtils.errorOutput.SOCKET_ERROR_OUTPUT;

router.get("/test", function(req, res, next) {
    res.render("test.html", {message: "It works!"});
});

router.get("/", function(req, res, next) {
    if (req.session.username) {
        res.redirect("menu");
    } else {
        res.redirect("login");
    }
});

router.get("/login", function(req, res, next) {
    res.render("login.html", {});
});

router.post("/loginAction", function(req, res, next) {
    var tempUsername = req.body.username;
    var tempPassword = req.body.password;
    accountUtils.acquireLock(function() {
        accountUtils.getAccountByUsername(tempUsername, function(error, result) {
            accountUtils.releaseLock();
            if (error) {
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                return;
            }
            if (!result) {
                res.json({success: false, message: "Bad account credentials."});
                return;
            }
            accountUtils.comparePasswordWithHash(tempPassword, result.passwordHash, function(result) {
                if (!result.success) {
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    return;
                }
                if (!result.isMatch) {
                    res.json({success: false, message: "Bad account credentials."});
                    return;
                }
                req.session.username = tempUsername;
                res.json({success: true});
            });
        });
    });
});

router.get("/logoutAction", function(req, res, next) {
    if (req.session.username) {
        delete req.session["username"];
    }
    res.redirect("login");
});

router.get("/createAccount", function(req, res, next) {
    res.render("createAccount.html", {});
});

router.post("/createAccountAction", function(req, res, next) {
    var tempUsername = req.body.username;
    var tempPassword = req.body.password;
    var tempEmailAddress = req.body.emailAddress;
    if (tempUsername.length > 30) {
        res.json({success: false, message: "Your username may not be longer than 30 characters."});
        return;
    }
    accountUtils.acquireLock(function() {
        accountUtils.getAccountByUsername(tempUsername, function(error, result) {
            if (error) {
                accountUtils.releaseLock();
                pageUtils.reportDatabaseErrorWithJson(error, req, res);
                return;
            }
            if (result) {
                accountUtils.releaseLock();
                res.json({success: false, message: "An account with that name already exists."});
                return;
            }
            accountUtils.generatePasswordHash(tempPassword, function(result) {
                if (!result.success) {
                    accountUtils.releaseLock();
                    pageUtils.reportDatabaseErrorWithJson(result.error, req, res);
                    return;
                }
                var tempPasswordHash = result.hash;
                accountUtils.addAccount({
                    username: tempUsername,
                    passwordHash: tempPasswordHash,
                    emailAddress: tempEmailAddress
                }, function(error) {
                    accountUtils.releaseLock();
                    if (error) {
                        pageUtils.reportDatabaseErrorWithJson(error, req, res);
                        return;
                    }
                    res.json({success: true});
                });
            });
        });
    });
});

router.get("/menu", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    tempUsername = req.session.username;
    res.render("menu.html", {
        username: tempUsername
    });
});

router.get("/game", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    res.render("game.html", {});
});

router.ws("/gameUpdate", checkAuthentication(SOCKET_ERROR_OUTPUT), function(ws, req, next) {
    console.log("Opening socket.");
    ws.on("message", function(message) {
        var tempCommandList = JSON.parse(message);
        if (gameUtils.isInDevelopmentMode) {
            setTimeout(function() {
                performUpdate(tempCommandList);
            }, 50 + Math.floor(Math.random() * 150));
        } else {
            performUpdate(tempCommandList);
        }
    });
    function performUpdate(commandList) {
        gameUtils.performUpdate(req.session.username, commandList, function(result) {
            var tempRetryCount = 0;
            function tryToSendResponse() {
                try {
                    ws.send(JSON.stringify(result));
                } catch (error) {
                    console.log(error);
                    if (tempRetryCount < 3) {
                        console.log("Trying to send response again.");
                        setTimeout(tryToSendResponse, 100);
                        tempRetryCount += 1;
                    } else {
                        console.log("Exceeded maximum number of retries.");
                    }
                }
            }
            tryToSendResponse();
        });
    }
});

module.exports = router;


