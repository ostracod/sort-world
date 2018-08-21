
var fs = require("fs");
var mysql = require("mysql");

var connection = null;

function reportSqlError(error) {
    console.log("Could not connect to MySQL.");
    console.log(error.code);
    console.log(error.sqlMessage);
}

function exitCleanly(exitValue) {
    if (typeof exitValue === "undefined") {
        exitValue = 0;
    }
    if (connection !== null) {
        connection.end();
    }
    process.exit(exitValue);
}

var databaseConfig = JSON.parse(fs.readFileSync("./databaseConfig.json", "utf8"));

console.log("Connecting to MySQL...");

connection = mysql.createConnection({
    host: databaseConfig.host,
    user: databaseConfig.username,
    password: databaseConfig.password
});

connection.connect(function(error) {
    if (error) {
        reportSqlError(error);
        exitCleanly();
        return;
    }
    console.log("Connected.");
    console.log("Running query...");
    connection.query(
        "SELECT username FROM SortWorld.Users",
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
            }
            var index = 0;
            while (index < results.length) {
                console.log(results[index].username);
                index += 1;
            }
            console.log("Finished.");
            exitCleanly();
        }
    );
});


