require("./utils.js");

require('dotenv').config();
const url = require("url");
const { Configuration, OpenAIApi } = require("openai");
const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY
}))

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

const app = express();

const Joi = require("joi");
const { count } = require("console");

const port = process.env.PORT || 2000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');
const untrvl_countries = database.db(mongodb_database).collection('under-travelled_countries');
 

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
    res.send("Hello ADVENTOURs");
});

async function getQuizAnswers(username) {
  const result = await userCollection.find({ username: username })
  .project({ quizAnswers: 1 })
  .toArray()
  const quizAnswers = result[0].quizAnswers;
  return quizAnswers;
}


async function countryGenerator(quizAnswers) {
  q1answer = quizAnswers.question1.toLowerCase();
  q2answer = quizAnswers.question2.toLowerCase();
  q3answer = quizAnswers.question3.toLowerCase();
  q4answer = quizAnswers.question4.toLowerCase();

const prompt = `I am going for a trip on ${q3answer} for ${q1answer}. My ideal destination for the trip should have ${q2answer}. I want to ${q4answer} when travel. Please recommend under-travelled countries meets the above mentioned criteria.

Return response in the following parsable JSON format:
    
        [{
            name: under-travelled countries that meets the above mentioned criteria,
            location: the location of the recommended country,
            descr: one sentence description of the courtry
        }]    
`
  const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
  })
  const parsedResponse = JSON.parse(response.data.choices[0].message.content);
  return parsedResponse;

}

// Double confirm that the countries chagGPT provided is under-travelled by cross-checking whether the countries exists in the   database
async function checkCountries(countries) {
  const confirmedCountries = [];

  for (let i = 0; i < countries.length; i++) {
    const countryName = countries[i]["name"];
    try {
        const result = await untrvl_countries.findOne({ Country: countryName });
        if (result) {
          confirmedCountries.push(countries[i]);
        }
        // Print out the result if reaches to the end of the countries array
        if (i === countries.length - 1) {
          // console.log(confirmedCountries)
        }
    } catch (err) {
        console.error('Error executing MongoDB query:', err);
    }
  }
  return confirmedCountries;
}

app.get("/gacha", sessionValidation, async (req, res) => {
  const quizAnswers = await getQuizAnswers(req.session.username);
  const generatedCountries = await countryGenerator(quizAnswers);
  const confirmedCountries = await checkCountries(generatedCountries);
  
  console.log("confirmedCountry: " + confirmedCountries);
  res.render("gacha", { confirmedCountries, quizAnswers });
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 