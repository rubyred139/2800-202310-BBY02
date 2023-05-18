require("./utils.js");

require("dotenv").config();
const url = require("url");
const { Configuration, OpenAIApi } = require("openai");
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const app = express();

app.use(express.json());

const Joi = require("joi");
const { count } = require("console");

const port = process.env.PORT || 2000;

const expireTime = 2 * 60 * 60 * 1000; //expires after 2 hr (minutes * seconds * millis)

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");
const untrvl_countries = database
  .db(mongodb_database)
  .collection("under-travelled_countries");
const reviewsCollection = database.db(mongodb_database).collection('reviews');

var { database } = include("databaseConnection");

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

function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}
function sessionValidation(req, res, next) {
  if (isValidSession(req)) {
    next();
  } else {
    res.redirect("/");
  }
}

app.get("/", (req, res) => {
  res.render("landing");
});

app.get('/easterEgg' , (req, res) => {
  res.render("easterEgg")
})

app.get('/nosql-injection', async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.send(
      `<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`
    );
    return;
  }
  console.log("user: " + username);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.send(
      "<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>"
    );
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);

  res.send(`<h1>Hello ${username}</h1>`);
});

app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: "" });
});

app.post("/signupSubmit", async (req, res) => {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  var securityAnswer = req.body.securityAnswer;

  const schema = Joi.object({
    username: Joi.string().alphanum().max(20).required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
    securityAnswer: Joi.string().required(),
  });

  const validationResult = schema.validate({
    username,
    password,
    email,
    securityAnswer,
  });

  if (validationResult.error != null) {
    const errorMessage = validationResult.error.message;
    //look at terminal to see error message
    console.log(validationResult.error);

    if (errorMessage.includes('"username"')) {
      const errorMessage = "Name is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"email"')) {
      const errorMessage = "Email is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"password"')) {
      const errorMessage = "Password is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"securityAnswer"')) {
      // added
      const errorMessage = "Security answer is required."; // added
      res.render("signup", { errorMessage: errorMessage });
      return;
    }
  } else {
    // check if user with the same email already exists
    const existingUser = await userCollection.findOne({ email: email });
    if (existingUser) {
      // email already taken, handle accordingly
      const errorMessage = "Email already in use.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await userCollection.insertOne({
    username: username,
    email: email,
    password: hashedPassword,
    securityAnswer: securityAnswer,
  });
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

  res.redirect("/quizWelcome");
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", successMessage: "" });
});

app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(email, password);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    const errorMessage = "User not found.";
    res.render("login", { errorMessage: errorMessage, successMessage: "" });
    return;
  }

  const result = await userCollection
    .find({ email: email })
    .project({ email: 1, password: 1, username: 1, _id: 1 })
    .toArray();

  console.log(result);

  if (result.length != 1) {
    console.log("user not found");
    const errorMessage = "User not found.";
    res.render("login", { errorMessage: errorMessage, successMessage: "" });
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.username = result[0].username;
    req.session._id = result[0]._id;
    req.session.cookie.maxAge = expireTime;

    res.redirect("/gacha");
    return;
  } else {
    console.log("incorrect password");
    const errorMessage = "Invalid email/password combination.";
    res.render("login", { errorMessage: errorMessage, successMessage: "" });
    return;
  }
});

app.get("/changePassword", (req, res) => {
  res.render("changePassword", { errorMessage: "" });
});

app.post("/changePassword", async (req, res) => {
  const existingEmail = req.body.email;
  const securityAnswer = req.body.securityAnswer;

  const existingUser = await userCollection.findOne({
    email: existingEmail,
    securityAnswer: securityAnswer,
  });

  if (!existingUser) {
    console.log("invalid combination");
    const errorMessage = "Incorrect answer to the security question.";
    res.render("changePassword", { errorMessage: errorMessage });
    return;
  }

  console.log("both inputs correct");

  // Save email in session
  req.session.email = existingEmail;

  res.redirect("/resetPassword");
});

app.get("/resetPassword", (req, res) => {
  const email = req.session.email;
  res.render("resetPassword", { errorMessage: "", email: email });
});

app.post("/resetPassword", async (req, res) => {
  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const email = req.session.email;

  if (newPassword !== confirmPassword) {
    const errorMessage = "Passwords do not match";
    res.render("resetPassword", { errorMessage: errorMessage, email: email });
    return;
  } else {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await userCollection.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    res.render("login", {
      successMessage:
        "Your password has been changed successfully. Please log in again.",
      errorMessage: "",
    });
    console.log("password is changed for user with this email: ", email);
  }
});

app.get("/quizWelcome", (req, res) => {
  res.render("quizWelcome", { name: req.session.username });
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
      { _id: new ObjectId(userId) },
      { $set: { quizAnswers: answers } }
    );
    console.log("Answers saved to database");
    res.redirect("/gacha");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving quiz answers to database");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  console.log("user logged out");
  res.redirect("/");
});

async function getFactImages(place) {
  const factImageUrls = [];
  for (const x in place) {
    var testFact = place[x];
    console.log(testFact);

    try {
      const requestURL = `https://api.unsplash.com/search/photos?query=${testFact}&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
      const response = await fetch(requestURL);
      const responseBody = await response.json();
      var imageURL = responseBody.results[0].urls.regular;
      factImageUrls.push(imageURL);

    } catch (err) {
      console.log(err);
      const defaultURL = `https://api.unsplash.com/search/photos?query=airplane&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
      const response = await fetch(defaultURL);
      const responseBody = await response.json();
      var imageURL = responseBody.results[0].urls.regular;
      factImageUrls.push(imageURL);
    }
  }

  return factImageUrls;
}

app.post("/main/:countryName", sessionValidation, async (req, res) => {
  try {
    const username = req.session.username;
    console.log(username);
    req.session.countryName = req.params.countryName;
    var currentCountry = req.session.countryName;
    console.log(currentCountry);

    const result = await userCollection
      .find({ username: username })
      .project({ quizAnswers: 1 })
      .toArray();

    const userId = req.session._id;
    const userEntry = result[0];
    const answers = userEntry.quizAnswers;

    // note to improve prompt again, some answers are a bit weird
    const countryResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `
        A new traveller is going to ${req.session.countryName}. The purpose of their trip is ${answers.question1}. They are going in ${answers.question3}. 
          
        They would prefer to travel to a ${answers.question2} and their preferred actitives are to ${answers.question4}.

        Based on this information for this country, provide one quirky fun fact that the traveller would enjoy, one recommended local business, 
        and one natural destination they would like, a recommend activity to do here, a fact about the national dish of the country, and 
        a fact about what is the official language. Each fact should be descriptive.

        Return the response in the following parsable JSON format:

        [
          {
            "quirkyFact" : "the quirky fact",
            "businessFact" : "the business fact",
            "natureFact" : "the natural destination fact",
            "activityFact" : "the activity fact",
            "dishFact" : "the national dish fact",
            "languageFact" : "the popular times fact"
          },
          {
            "quirkyFactTitle" : "country name from quirkyFact",
            "businessFactTitle" : "business name from businessFact, country name",
            "natureFactTitle" : "natural destination name from natureFact, country name",
            "activityFactTitle" : "activity from activityFact or if activity is at a location, then the location name",
            "dishFactTitle" : "dish name from dishFact",
            "languageFactTitle" : "the language, and the word language"
          }
        ]
      `,
      max_tokens: 3000,
      temperature: 0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    const apiResponse = await countryResponse.data;
    const completion = await apiResponse.choices[0].text;

    var trimmedCompletion = completion.trimStart();
    if (trimmedCompletion.startsWith("Answer:")) {
      trimmedCompletion = trimmedCompletion.replace("Answer:", "").trim();
    } else if (trimmedCompletion.startsWith("Response:")) {
      trimmedCompletion = trimmedCompletion.replace("Response:", "").trim();
    }

    const parsedResponse = JSON.parse(trimmedCompletion);
    const resultFacts = parsedResponse[0];
    const resultFactNames = parsedResponse[1];

    await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          promptAnswers: resultFacts,
          currentCountry: currentCountry,
          promptAnswerPlaces: resultFactNames,
        },
      }
    );

    res.redirect(`/main`);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/main", sessionValidation, async (req, res) => {
  try {
    const userId = req.session._id;
    var isBookmarked = req.session.isBookmarked;

    const result = await userCollection.findOne({ _id: new ObjectId(userId) });

    const gachaCountry = result.currentCountry;
    
    const facts = result.promptAnswers;

    const places = result.promptAnswerPlaces;
    var imagesList = await getFactImages(places);

    res.render("main", { facts: facts, gachaCountry, imagesList, isBookmarked });
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/bookmark", sessionValidation, async (req, res) => {
  try {
    const userId = req.session._id;

    const result = await userCollection.findOne({ _id: new ObjectId(userId) });

    const bookmarkedCountries = result.savedCountries || [];


    const gachaCountry = result.currentCountry;

    var isBookmarked;

    if (bookmarkedCountries.includes(gachaCountry)) {
      // Remove bookmark
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { savedCountries: gachaCountry } }
      );
      isBookmarked = false;
    } else {
      // Add bookmark
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $push: { savedCountries: gachaCountry } }
      );
      isBookmarked = true;
    }

    req.session.isBookmarked = isBookmarked; 


    res.redirect("/main");
  } catch (error) {
    console.error(error);
  }
});


app.get("/profile", async (req, res) => {
  const db = database.db(mongodb_database);
  const userCollection = db.collection("users");
  const userId = req.session._id;
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  console.log(user);
  res.render("profile", { user });
});

app.post("/updateProfile", async (req, res) => {
  const userId = req.session._id;
  const db = database.db(mongodb_database);
  const userCollection = await db.collection("users");
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });

  const updatedFields = {
    username: req.body.username ? req.body.username : user.username,
    email: req.body.email ? req.body.email : user.email,
    password: req.body.password
      ? await bcrypt.hash(req.body.password, 10)
      : user.password,
    securityAnswer: req.body.securityAnswer
      ? req.body.securityAnswer
      : user.securityAnswer,
  };

  const nonNullFields = {};
  for (const [key, value] of Object.entries(updatedFields)) {
    if (value !== null) {
      nonNullFields[key] = value;
    }
  }

  await userCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: nonNullFields }
  );

  res.redirect("/profile");
});

async function getQuizAnswers(username) {
  const result = await userCollection
    .find({ username: username })
    .project({ quizAnswers: 1 })
    .toArray();
  console.log(result);
  const quizAnswers = result[0].quizAnswers;
  return quizAnswers;
}

async function countryGenerator(quizAnswers) {
  q1answer = quizAnswers.question1.toLowerCase();
  q2answer = quizAnswers.question2.toLowerCase();
  q3answer = quizAnswers.question3.toLowerCase();
  q4answer = quizAnswers.question4.toLowerCase();

  const prompt = `I am going for a trip on ${q3answer} for ${q1answer}. My ideal destination for the trip should have ${q2answer}. I want to ${q4answer} when travel. Please recommend three under-travelled countries meets the above mentioned criteria.

Return response in the following parsable JSON format:
    
        [{
            name: under-travelled countries that meets the above mentioned criteria,
            location: the location of the recommended country,
            descr: one sentence description of the courtry
        }]    
`;
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
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
      console.error("Error executing MongoDB query:", err);
    }
  }
  return confirmedCountries;
}

async function getImage(countries) {
  const imageURLs = [];
  for (let i = 0; i < countries.length; i++) {
    const countryName = countries[i].name;
    console.log(countryName);
    const requestURL = `https://api.unsplash.com/search/photos?query=${countryName}&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
    const response = await fetch(requestURL);

    const statusCode = response.status;
    console.log(statusCode);
    const responseBody = await response.json();
    const imageURL = responseBody.results[0].urls.regular;
    imageURLs.push(imageURL);
  }
  return imageURLs;
}

app.get("/gacha", sessionValidation, async (req, res) => {
  const quizAnswers = await getQuizAnswers(req.session.username);
  const generatedCountries = await countryGenerator(quizAnswers);
  const confirmedCountries = await checkCountries(generatedCountries);
  const imageURLs = await getImage(confirmedCountries);
  console.log("confirmedCountry: " + confirmedCountries);
  res.render("gacha", { confirmedCountries, quizAnswers, imageURLs });
});

app.get('/reviews', async (req, res) => {
  try {
    // Retrieve all reviews from the reviews collection
    const reviews = await reviewsCollection.find({}).toArray();
    
    // Render the reviews page with the retrieved reviews
    res.render('reviews', { reviews });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/reviewForm', (req, res) => {
  console.log(req.body);
  var userId = req.session._id;
  var name = req.session.username;
  res.render("reviewForm", {name, userId});
});

app.post('/reviewForm', async (req, res) => {
  // Get the user ID from the session
  const userId = req.session.user_id;

  // Create a review object with all form field values
  const review = {
    title: req.body.reviewTitle,
    country: req.body.countryName,
    visitTime: req.body.visitTime,
    tripLength: req.body.tripLength,
    vacationType: req.body.vacationType,
    experience: req.body.experience,
    userName: req.body.name,
    userId: req.body.userId
  };

  console.log(review);

  try {
    // Save the review to the database
    const result = await reviewsCollection.insertOne(review);
    console.log(`Saved review to database with ID: ${result.insertedId}`);

    // Redirect to the thank you page
    res.redirect('/thankyou');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving data to database');
  }
});

app.get("/thankyou", (req, res) => {
  res.render("thankyou");
})

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

app.listen(port, () => {
});
