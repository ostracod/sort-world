
var parseArgs = require("minimist");
var fs = require("fs");
var mysql = require("mysql");
var confirm = require("confirm-cli");

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

function printUsageAndExit() {
    console.log("Usage:");
    console.log("node schemaTool.js setUp");
    console.log("node schemaTool.js verify");
    console.log("node schemaTool.js destroy");
    exitCleanly(1);
}

function databaseExists(done) {
    connection.query(
        "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
        [databaseName],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done(results.length > 0);
        }
    );
}

function tableExists(table, done) {
    connection.query(
        "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
        [databaseName, table.name],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done(results.length > 0);
        }
    );
}

function tableFieldExists(table, field, done) {
    // TODO: Implement.
    
    done();
}

function createDatabase(done) {
    connection.query(
        "CREATE DATABASE " + databaseName,
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        }
    );
}

function createTable(table, done) {
    var fieldDescriptionList = [];
    var primaryKeyField = null;
    var index = 0;
    while (index < table.fields.length) {
        var tempField = table.fields[index];
        var tempDescription = tempField.name + " " + tempField.type;
        if ("autoIncrement" in tempField) {
            if (tempField.autoIncrement) {
                tempDescription += " AUTO_INCREMENT";
            }
        }
        fieldDescriptionList.push(tempDescription);
        if ("primaryKey" in tempField) {
            if (tempField.primaryKey) {
                primaryKeyField = tempField;
            }
        }
        index += 1;
    }
    if (primaryKeyField !== null) {
        fieldDescriptionList.push("PRIMARY KEY (" + primaryKeyField.name + ")");
    }
    connection.query(
        "CREATE TABLE " + databaseName + "." + table.name + "(" + fieldDescriptionList.join(", ") + ")",
        [],
        function (error, results, fields) {
            if (error) {
                reportSqlError(error);
                exitCleanly();
                return;
            }
            done();
        }
    );
}

function addTableField(table, field, done) {
    // TODO: Implement.
    
    done();
}

function setUpTableField(table, field, done) {
    // TODO: Implement.
    
    done();
}

function setUpTableFields(table, done) {
    // TODO: Implement.
    
    done();
}

function setUpTable(table, done) {
    tableExists(table, function(exists) {
        if (exists) {
            console.log("Table \"" + table.name + "\" already exists.");
            setUpTableFields(table, done);
            return;
        }
        console.log("Creating table \"" + table.name + "\"...");
        createTable(table, function() {
            console.log("Created table \"" + table.name + "\".");
            setUpTableFields(table, done);
        });
    });
}

function setUpTables(done) {
    var index = 0;
    function setUpNextTable() {
        if (index >= schemaConfig.tables.length) {
            done();
            return;
        }
        var tempTable = schemaConfig.tables[index];
        index += 1;
        setUpTable(tempTable, setUpNextTable);
    }
    setUpNextTable();
}

function setUpDatabase(done) {
    databaseExists(function(exists) {
        if (exists) {
            console.log("Database \"" + databaseName + "\" already exists.");
            setUpTables(done);
            return;
        }
        console.log("Creating database \"" + databaseName + "\"...");
        createDatabase(function() {
            console.log("Created database \"" + databaseName + "\".");
            setUpTables(done);
        });
    });
}

function setUpSchemaCommand() {
    console.log("Setting up database...");
    setUpDatabase(function() {
        console.log("Finished setting up database \"" + databaseName + "\".");
        exitCleanly();
    });
}

function verifyTableField(table, field, done) {
    // TODO: Implement.
    
    done();
}

function verifyTableFields(table, done) {
    // TODO: Implement.
    
    done();
}

function verifyTable(table, done) {
    tableExists(table, function(exists) {
        if (!exists) {
            console.log("Table \"" + table.name + "\" is missing.");
            done();
            return;
        }
        console.log("Table \"" + table.name + "\" exists.");
        verifyTableFields(table, done);
    });
}

function verifyTables(done) {
    var index = 0;
    function verifyNextTable() {
        if (index >= schemaConfig.tables.length) {
            done();
            return;
        }
        var tempTable = schemaConfig.tables[index];
        index += 1;
        verifyTable(tempTable, verifyNextTable);
    }
    verifyNextTable();
}

function verifyDatabase(done) {
    databaseExists(function(exists) {
        if (!exists) {
            console.log("Database \"" + databaseName + "\" is missing.");
            done();
            return;
        }
        console.log("Database \"" + databaseName + "\" exists.");
        verifyTables(done);
    });
}

function verifySchemaCommand() {
    console.log("Verifying database...");
    verifyDatabase(function() {
        console.log("Finished verifying database.");
        exitCleanly();
    });
}

function destroyDatabase() {
    console.log("Destroying database...");
    // TODO: Implement.
    
    exitCleanly();
}

function destroySchemaCommand() {
    confirm(
        "Are you sure you want to destroy the database \"" + databaseName + "\"?",
        function () {
            destroyDatabase();
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
    } else if (command == "verify") {
        verifySchemaCommand();
    } else {
        printUsageAndExit();
    }
}

var databaseConfig = JSON.parse(fs.readFileSync("./databaseConfig.json", "utf8"));
var schemaConfig = JSON.parse(fs.readFileSync("./schemaConfig.json", "utf8"));
var databaseName = databaseConfig.databaseName

var args = parseArgs(process.argv.slice(2));

if (args["_"].length <= 0) {
    printUsageAndExit();
}

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
    processCli();
});


