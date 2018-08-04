
var parseArgs = require("minimist");
var fs = require("fs");
var mysql = require("mysql");
var confirm = require("confirm-cli");

var connection = null;

function exitCleanly(exitValue) {
    if (typeof exitValue === "undefined") {
        exitValue = 0;
    }
    if (connection !== null) {
        connection.end();
    }
    process.exit(exitValue);
}

function printUsageAndExit() {
    console.log("Usage:");
    console.log("node schemaTool.js setUp");
    console.log("node schemaTool.js destroy");
    exitCleanly(1);
}

function setUpSchemaCommand() {
    // TODO: Implement.
    
    exitCleanly();
}

function destroySchema() {
    console.log("Destroying database...");
    // TODO: Implement.
    
    exitCleanly();
}

function destroySchemaCommand() {
    confirm(
        "Are you sure you want to destroy the database \"" + databaseConfig.databaseName + "\"?",
        function () {
            destroySchema();
        },
        function () {
            console.log("Database NOT destroyed.");
            exitCleanly();
        },
        {text: ["Destroy", "Cancel"]}
    );
}

function processCli() {
    
    var command = args["_"][0].toLowerCase();
    
    if (command == "setup") {
        setUpSchemaCommand();
    } else if (command == "destroy") {
        destroySchemaCommand();
    } else {
        printUsageAndExit();
    }
}

var databaseConfig = JSON.parse(fs.readFileSync("./databaseConfig.json", "utf8"));

var args = parseArgs(process.argv.slice(2));

if (args["_"].length <= 0) {
    printUsageAndExit();
}

console.log("Connecting to MySQL...");

var connection = mysql.createConnection({
    host: databaseConfig.host,
    user: databaseConfig.username,
    password: databaseConfig.password
});

connection.connect(function(error) {
    if (error) {
        console.log("Could not connect to MySQL.");
        console.log(error.code);
        console.log(error.sqlMessage);
        process.exit(1);
        return;
    }
    console.log("Connected.");
    processCli();
});


