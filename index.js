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
const { MongoClient } = require('mongodb');
const {ObjectId} = require('mongodb');
const bcrypt = require('bcrypt');
const { Configuration, OpenAIApi } = require("openai");
const saltRounds = 12;

const app = express();

app.use(express.json());

const Joi = require("joi");
const { count } = require("console");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});

const port = process.env.PORT || 2000;


const expireTime = 2 * 60 * 60 * 1000; //expires after 2 hr (minutes * seconds * millis)

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

const url = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`;
const mongoClient = new MongoClient(url);

var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');
const untrvl_countries = database.db(mongodb_database).collection('under-travelled_countries');
 
var {database} = include('databaseConnection');


app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});


app.use(session({ 
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}
function sessionValidation(req, res, next) {
  if (isValidSession(req)) {
    next();
  }
  else {
    res.redirect('/');
  }
}


app.get('/', (req, res) => {
  res.render("landing");
});


app.get('/nosql-injection', async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
    return;
  }
  console.log("user: " + username);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
    return;
  }

  const result = await userCollection.find({ username: username }).project({ username: 1, password: 1, _id: 1 }).toArray();

  console.log(result);

  res.send(`<h1>Hello ${username}</h1>`);
});

app.get('/signup', (req, res) => {
  res.render("signup", { errorMessage: "" });
});

app.post('/signupSubmit', async (req, res) => {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.object(
    {
      username: Joi.string().alphanum().max(20).required(),
      email: Joi.string().required(),
      password: Joi.string().required(),

    });

  const validationResult = schema.validate({ username, password, email });

  if (validationResult.error != null) {
    const errorMessage = validationResult.error.message;
    //look at terminal to see error message
    console.log(validationResult.error);

    if (errorMessage.includes('"username"')) {
      const errorMessage = 'Name is required.';
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"email"')) {
      const errorMessage = 'Email is required.';
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"password"')) {
      const errorMessage = 'Password is required.';
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

  } else {
    // check if user with the same email already exists
    const existingUser = await userCollection.findOne({ email: email });
    if (existingUser) {
      // email already taken, handle accordingly
      const errorMessage = 'Email already in use.';
      res.render("signup", { errorMessage: errorMessage });
      return;
    };
  };


  var hashedPassword = await bcrypt.hash(password, saltRounds);


  const result = await userCollection.insertOne({ username: username, email: email, password: hashedPassword, securityAnswer: 'dog'});
  console.log("Inserted user");

  //create a session and redirect to main page
  req.session.user = {
    username: username,
    email: email,
  };

  //sets authentication to true 
  req.session.authenticated = true;

  //sets their username
  req.session.username = username;

  //sets user's id in the user session
  req.session._id = result.insertedId;


  res.redirect('/quizWelcome');

});


app.get('/login', (req, res) => {
  res.render("login", { errorMessage: "" , successMessage: ""});
});

app.post('/loggingin', async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;


  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(email, password);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    const errorMessage = 'User not found.';
    res.render('login', { errorMessage: errorMessage, successMessage:"" });
    return;
  }

  const result = await userCollection.find({ email: email }).project({ email: 1, password: 1, username: 1, _id: 1, }).toArray();

  console.log(result);

  if (result.length != 1) {
    console.log("user not found");
    const errorMessage = 'User not found.';
    res.render('login', { errorMessage: errorMessage, successMessage: "" });
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.username = result[0].username;
    req.session._id = result[0]._id;
    req.session.cookie.maxAge = expireTime;

    res.redirect('/main');
    return;
  }
  else {
    console.log("incorrect password");
    const errorMessage = 'Invalid email/password combination.';
    res.render('login', { errorMessage: errorMessage, successMessage: "" });
    return;
  }
});

app.get('/changePassword', (req, res) => {
  res.render("changePassword", { errorMessage: ""});
  
});


app.post('/changePassword', async (req, res) => {
  const existingEmail = req.body.email;
  const securityAnswer = req.body.securityAnswer;

  const existingUser = await userCollection.findOne({ email: existingEmail, securityAnswer: securityAnswer });

  if (!existingUser) {
    console.log("invalid combination");
    const errorMessage = "Incorrect answer to the security question.";
    res.render('changePassword', { errorMessage: errorMessage });
    return;
  }

  console.log("both inputs correct");

    // Save email in session
    req.session.email = existingEmail;

  res.redirect('/resetPassword');

});
 
app.get('/resetPassword', (req, res) => {
  const email = req.session.email;
  res.render("resetPassword", {errorMessage: "", email: email});
});

app.post('/resetPassword', async (req, res) => {
  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const email = req.session.email;  

  if (newPassword !== confirmPassword) {
    const errorMessage = 'Passwords do not match';
    res.render('resetPassword', { errorMessage: errorMessage, email: email });
    return;
  }
  else {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await userCollection.updateOne({ email: email }, { $set: { password: hashedPassword } });
    res.render('login', { successMessage: 'Your password has been changed successfully. Please log in again.', errorMessage: ""});
    console.log('password is changed for user with this email: ', email);
  }
});


app.get('/quizWelcome', (req, res) => {
  res.render("quizWelcome", { name: req.session.username });
})

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
    const result = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { quizAnswers: answers } });
    console.log('Answers saved to database');
    res.redirect('/gachaPage');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving quiz answers to database");
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  console.log("user logged out");
  res.redirect('/');
});

app.get('/gachaPage', (req, res) => {
    res.render("gachaPage");
})
app.get("/main", sessionValidation, (req, res) => {
  var username = req.session.username;
  console.log(username);

  userCollection
    .find({ username: username })
    .project({ quizAnswers: 1 })
    .toArray()
    .then((result) => {
      const userEntry = result[0];
      const answers = userEntry.quizAnswers;

      const response = openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
          A new traveller is going to Canada. They are going ${answers.question1} in ${answers.question3}. They enjoy the ${answers.question2} and ${answers.question4}.

          Provide one quirky fun fact about this country that the traveller would enjoy, one recommended local business for them, and one natural destination they would like.

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