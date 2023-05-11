require("./utils.js");

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const { Configuration, OpenAIApi } = require("openai");

const app = express();

app.use(express.json());

const Joi = require("joi");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);

const port = process.env.PORT || 5000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("user");

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

app.get("/", (req, res) => {
  res.send("Hello ADVENTOURs");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/quizWelcome", (req, res) => {
  res.render("quizWelcome", { name: req.session.name });
});

app.get("/quiz", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/");
  } else {
    var name = req.session.name;
    var userId = req.session._id;
    res.render("quiz", { name, userId });
  }
});

app.post("/quiz", async (req, res) => {
  const db = database.db(mongodb_database);
  const userCollection = db.collection("users");

  const userId = req.session._id;
  const answers = {
    question1: req.body.question1,
    question2: req.body.question2,
    question3: req.body.question3,
    question4: req.body.question4,
  };

  try {
    const result = await userCollection.updateOne(
      { _id: ObjectId(userId) },
      { $set: { quizAnswers: answers } }
    );
    console.log("Answers saved to database");
    res.redirect("/members");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving quiz answers to database");
  }
});

app.get("/quiz_test", (req, res) => {
  var html = `
    test quiz
    <form action='/middle' method='post'>
    <input name='country' type='text' placeholder='country'>
    <br>
    <input name='season' type='text' placeholder='season'>
    <br>
    <input name='month' type='text' placeholder='travel month'>
    <br>
    <input name='name' type='text' placeholder='name'>
    <br>
    <button>Submit</button>
    </form>
    `;
  res.send(html);
});

app.post("/middle", async (req, res) => {
  var country = req.body.country;
  var season = req.body.season;
  var month = req.body.month;
  var name = req.body.name;

  await userCollection.insertOne({
    country: country,
    season: season,
    month: month,
    name: name,
  });
  console.log("Inserted test.");
  res.redirect("/main", { result });
});

app.get("/main", (req, res) => {
  var exname = "victor";

  userCollection
    .find({ name: exname })
    .project({ country: 1, season: 1, month: 1 })
    .toArray()
    .then((result) => {
      console.log(result);
      const userEntry = result[0];

      const response = openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
          A new travEller is going to ${userEntry.country} in ${userEntry.month} during ${userEntry.season}.

          Provide one quirky fun fact about this country, one recommended local business, and one natural destination there.

          Return response in the following parsable JSON format:
          
          {
            "quirkyFact" : "the quirky fact",
            "businessFact" : "the business fact",
            "natureFact" : "the natural fact",
          }
        `,
        max_tokens: 1500,
        temperature: 0,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });

      response.then((apiResponse) => {
        const completion = apiResponse.data.choices[0].text;
        const parsedResponse = JSON.parse(completion);
        console.log(parsedResponse);
        res.render("main", { parsedResponse:parsedResponse, userEntry:userEntry });
      });
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});


app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

app.listen(port, () => {
  console.log("Node application listening on port " + port);
});
