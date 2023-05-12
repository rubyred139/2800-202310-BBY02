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

const untrvl_countries = database.db(mongodb_database).collection('under-travelled_countries');
 
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

const prompt = `I am going for a trip on July for funs. My ideal destination for the trip should have beach. I want to go sightseeing when travel. Please recommend three under-travelled countries meets the above mentioned criteria.

Return response in the following parsable JSON format:
    
        {
            name: under-travelled countries that meets the above mentioned criteria,
            location: the location of the recommended country,
            descr: one sentence description of the courtry
        }
    
`

// Regenerate new response if any error in what chatGPT provided
function parseCountriesData(response) {
    let parsedResponse = {};    
    try {
        parsedResponse = JSON.parse(response);
    } catch (error) {
        console.error("Error parsing JSON data:", error);
        // Regenerate new countries or handle the error as needed
        countryGenerator(prompt);
    }

    return parsedResponse;
}

async function countryGenerator(prompt) {

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }]
        });
        const parsedResponse = parseCountriesData(response.data.choices[0].message.content);
        console.log(parsedResponse)
        const confirmedCountries = await checkCountries(parsedResponse);
        return confirmedCountries;
    } catch (error) {
        console.error('Error generating countries:', error);
        // Throw the error to be caught in the /gacha route
        throw error;
    }
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
                return confirmedCountries;
            }
        } catch (err) {
                console.error('Error executing MongoDB query:', err);
        }
    }
  }


app.get("/gacha", async (req, res) => {

    // `I am going for a trip on ${q3-month} for ${q1-reason}. My ideal destination for the trip should have ${q2-type}. I want to ${q4-activity} when travel. Please recommend under-travelled countries meets the above mentioned criteria.
    try {
        const confirmedCountries = await countryGenerator(prompt);
        console.log('Confirmed countries here:', confirmedCountries);
        res.render("gachaPage", { confirmedCountries });
    } catch (error) {
        console.error('Error generating countries:', error);
        // Handle the error and send an appropriate response
        res.status(500).send('Error generating countries');
    }
    // res.render("gachaPage");
  });

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 