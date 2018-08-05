
var fs = require("fs");
var bcrypt = require("bcrypt");
var mysql = require("mysql");

var accountsDatabaseLock = false;
var connection;

function AccountUtils() {

}

var accountUtils = new AccountUtils();

module.exports = accountUtils;

AccountUtils.prototype.generatePasswordHash = function(password, done) {
    bcrypt.hash(password, 10, function(error, result) {
        if (error) {
            done({
                success: false,
                error: error
            });
            return;
        }
        done({
            success: true,
            hash: result
        });
    });
}

AccountUtils.prototype.comparePasswordWithHash = function(password, hash, done) {
    bcrypt.compare(password, hash, function(error, result) {
        if (error) {
            done({
                success: false,
                error: error
            });
            return;
        }
        done({
            success: true,
            isMatch: result
        });
    });
}

AccountUtils.prototype.convertSqlErrorToText = function(error) {
    return error.code + ": " + error.sqlMessage;
}

AccountUtils.prototype.acquireLock = function(done) {
    if (accountsDatabaseLock) {
        setTimeout(function() {
            accountUtils.acquireLock(done);
        }, 2);
    } else {
        accountsDatabaseLock = true;
        done();
    }
}

AccountUtils.prototype.releaseLock = function() {
    accountsDatabaseLock = false;
}

AccountUtils.prototype.addAccount = function(account, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    
}

AccountUtils.prototype.getAccountByUsername = function(username, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    
}

AccountUtils.prototype.updateAccount = function(account, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    
}

AccountUtils.prototype.removeAccount = function(index, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    
}

AccountUtils.prototype.getLeaderboardAccounts = function(amount, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    
}

var databaseConfig = JSON.parse(fs.readFileSync("databaseConfig.json", "utf8"));

console.log("Connecting to MySQL...");

connection = mysql.createConnection({
    host: databaseConfig.host,
    user: databaseConfig.username,
    password: databaseConfig.password,
    database: databaseConfig.databaseName
});

connection.connect(function(error) {
    if (error) {
        console.log(accountUtils.convertSqlErrorToText(error));
        return;
    }
    console.log("Connected to MySQL.");
});


