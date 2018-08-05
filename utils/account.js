
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
    if (!accountsDatabaseLock) {
        console.log("Missing lock!");
        return;
    }
    connection.query(
        "INSERT INTO Users (username, passwordHash, emailAddress, score, avatarColor) VALUES (?, ?, ?, 0, 0)",
        [account.username, account.passwordHash, account.emailAddress],
        function (error, results, fields) {
            if (error) {
                done(accountUtils.convertSqlErrorToText(error));
                return;
            }
            done(null);
        }
    );
}

AccountUtils.prototype.getAccountByUsername = function(username, done) {
    if (!accountsDatabaseLock) {
        console.log("Missing lock!");
        return;
    }
    connection.query(
        "SELECT * FROM Users WHERE username = ?",
        [username],
        function (error, results, fields) {
            if (error) {
                done(accountUtils.convertSqlErrorToText(error), null);
                return;
            }
            if (results.length > 0) {
                done(null, results[0]);
            } else {
                done(null, null);
            }
        }
    );
}

AccountUtils.prototype.updateAccount = function(account, done) {
    if (!accountsDatabaseLock) {
        console.log("Missing lock!");
        return;
    }
    connection.query(
        "UPDATE Users SET username = ?, passwordHash = ?, emailAddress = ?, score = ?, avatarColor = ? WHERE uid = ?",
        [
            account.username,
            account.passwordHash,
            account.emailAddress,
            account.score,
            account.avatarColor,
            account.uid
        ],
        function (error, results, fields) {
            if (error) {
                done(accountUtils.convertSqlErrorToText(error));
                return;
            }
            done(null);
        }
    );
}

AccountUtils.prototype.removeAccount = function(index, done) {
    if (!accountsDatabaseLock) {
        console.log("Missing lock!");
        return;
    }
    connection.query(
        "DELETE FROM Users WHERE uid = ?",
        [account.uid],
        function (error, results, fields) {
            if (error) {
                done(accountUtils.convertSqlErrorToText(error));
                return;
            }
            done(null);
        }
    );
}

AccountUtils.prototype.getLeaderboardAccounts = function(amount, done) {
    if (!accountsDatabaseLock) {
        console.log("Missing lock!");
        return;
    }
    connection.query(
        "SELECT * FROM Users ORDER BY score DESC LIMIT 20",
        [],
        function (error, results, fields) {
            if (error) {
                done(accountUtils.convertSqlErrorToText(error), null);
                return;
            }
            done(null, results);
        }
    );
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


