const express = require('express');

const app = express();

const Joi = require("joi");

const session = require('express-session');

require('dotenv').config();

const port = process.env.PORT || 5000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

//this one is the landing page
app.get('/', (req, res) => {
    res.render("landing");
});

app.get('/main', (req, res) => {
    res.send("Hello ADVENTOURs");
});

app.get('/login', (req, res) =>{
    res.render("login");
});


app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 