require('dotenv').config();
const express = require('express');
const session = require('express-session');

const app = express();

const Joi = require("joi");

const port = process.env.PORT || 5000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('countries');

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));


app.get('/', (req, res) => {
    res.send("Hello ADVENTOURs");
});


app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 