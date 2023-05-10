require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

const app = express();

const Joi = require("joi");

const port = process.env.PORT || 5000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('countries');

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore,
	saveUninitialized: false, 
	resave: true
}
));


app.get('/', (req, res) => {
    res.render("landing");
});

app.get('/main', (req, res) => {
    res.send("Hello ADVENTOURs");
});

app.get('/login', (req, res) =>{
    res.render("login");
});

app.get('/quizWelcome', (req,res) => {
	res.render("quizWelcome", { name: req.session.name });
})

app.get('/quiz', (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
      } else {
        var name = req.session.name;
        var userId = req.session._id;
        res.render("quiz", {name, userId})
      }
  });
  
  app.post('/quiz', async (req, res) => {
    const db = database.db(mongodb_database);
    const userCollection = db.collection('users');
  
    const userId = req.session._id;
    const answers = {
      question1: req.body.question1,
      question2: req.body.question2,
      question3: req.body.question3,
      question4: req.body.question4
    };
  
    try { 
      const result = await userCollection.updateOne({ _id: ObjectId(userId) }, { $set: { quizAnswers: answers } });
      console.log('Answers saved to database');
      res.redirect('/members');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error saving quiz answers to database');
    }
  });
  
app.get('/gachaPage', (req, res) => {
    res.render("gachaPage");
})


app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 